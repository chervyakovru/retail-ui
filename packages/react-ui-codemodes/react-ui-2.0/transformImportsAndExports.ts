/* eslint-disable import/no-default-export */
import { API, FileInfo } from 'jscodeshift';
import { Collection } from 'jscodeshift/src/Collection';

import {
  getComponentNameFromPath,
  getActualImportName,
  deduplicateImports,
  moveSpecifierToSeparateImport,
  moveSpecifierToSeparateExport,
  deduplicateExports,
  isModuleRemoved,
} from './helpers';

const transformDefaultImports = (api: API, collection: Collection<any>, path: string): Collection<any> => {
  const j = api.jscodeshift;
  return collection
    .find(j.ImportDeclaration, node => node.source.value.match(path))
    .find(j.ImportDefaultSpecifier)
    .forEach(importSpecifier => {
      const importDeclaration = importSpecifier.parent;
      const importSource = importDeclaration.node.source.value;
      const componentName = getComponentNameFromPath(importSource, path);
      if (componentName && !isModuleRemoved(importSource, api.report)) {
        switch (componentName) {
          case 'LayoutEvents': {
            j(importSpecifier).replaceWith(j.importNamespaceSpecifier(importSpecifier.value.local));
            break;
          }
          default: {
            j(importSpecifier).replaceWith(j.importSpecifier(j.identifier(componentName), importSpecifier.value.local));
          }
        }
      }
    });
};

const transformNamedImports = (api: API, collection: Collection<any>, path: string): Collection<any> => {
  const j = api.jscodeshift;
  return collection
    .find(j.ImportDeclaration, node => node.source.value.match(path))
    .find(j.ImportSpecifier)
    .forEach(importSpecifier => {
      const importDeclaration = importSpecifier.parent;
      const importSource = importDeclaration.node.source.value;
      const importedName = importSpecifier.value.imported.name;
      const actualName =
        (importedName === 'default' && getComponentNameFromPath(importSource, path)) ||
        getActualImportName(importSource, importedName);
      j(importSpecifier).replaceWith(j.importSpecifier(j.identifier(actualName), importSpecifier.value.local));
    });
};

const changeImportsSource = (api: API, collection: Collection<any>, path: string, value: string): void => {
  const j = api.jscodeshift;
  collection
    .find(j.ImportDeclaration, node => node.source.value.match(path))
    .replaceWith(importDeclaration => {
      const source = importDeclaration.node.source.value as string;
      if (!isModuleRemoved(source)) {
        if (source.match(`${path}/lib/`) || source.match(`${path}/typings/`)) {
          importDeclaration.node.source.value = source.replace(path, value);
        } else {
          importDeclaration.node.source.value = value;
        }
      }
      return importDeclaration.node;
    });
};

const transformReExports = (api: API, collection: Collection<any>, path: string, sourceValue: string): void => {
  const j = api.jscodeshift;

  collection
    .find(j.ExportAllDeclaration, node => node.source.value.match(path))
    .forEach(exportDeclaration => {
      const originSource = exportDeclaration.node.source.value as string;
      const componentName = getComponentNameFromPath(originSource, path);
      if (isModuleRemoved(originSource, api.report)) {
        return;
      }
      if (!componentName) {
        exportDeclaration.value.source = j.stringLiteral(sourceValue);
      } else {
        if (originSource.match(/Fias\/types/)) {
          exportDeclaration.value.source = j.stringLiteral(sourceValue + '/components/Fias/types');
        } else {
          exportDeclaration.value.source = j.stringLiteral(sourceValue + '/components/' + componentName);
        }
      }
    });

  collection
    .find(j.ExportNamedDeclaration, node => node.source && node.source.value.match(path))
    .forEach(exportDeclaration => {
      const originSource = exportDeclaration.node.source!.value as string;
      const componentName = getComponentNameFromPath(originSource, path);
      if (isModuleRemoved(originSource, api.report)) {
        return;
      }
      j(exportDeclaration)
        .find(j.ExportSpecifier)
        .forEach(exportSpecifier => {
          const localName = exportSpecifier.node.local?.name;
          if (localName) {
            if (localName === 'default' && componentName) {
              j(exportSpecifier).replaceWith(
                j.exportSpecifier(j.identifier(componentName), exportSpecifier.value.exported),
              );
            } else {
              const exportDeclaration = exportSpecifier.parent;
              const importSource = exportDeclaration.node.source.value;
              const importName = getActualImportName(importSource, localName);
              j(exportSpecifier).replaceWith(
                j.exportSpecifier(j.identifier(importName), exportSpecifier.value.exported),
              );
            }
          }
        });
      exportDeclaration.value.source = j.stringLiteral(sourceValue);
    });
};

const transformInternals = (api: API, collection: Collection<any>, path: string, source: string): void => {
  const j = api.jscodeshift;
  const INTERNALS: { [key: string]: string } = {
    Calendar: 'internal/Calendar',
    CustomComboBox: 'internal/CustomComboBox',
    DateSelect: 'internal/DateSelect',
    DropdownContainer: 'internal/DropdownContainer',
    HideBodyVerticalScroll: 'internal/HideBodyVerticalScroll',
    IgnoreLayerClick: 'internal/IgnoreLayerClick',
    Menu: 'internal/Menu',
    Popup: 'internal/Popup',
    RenderContainer: 'internal/RenderContainer',
    RenderLayer: 'internal/RenderLayer',
    ZIndex: 'internal/ZIndex',
    FocusTrap: 'internal/FocusTrap',
    InputLikeText: 'internal/InputLikeText',
    InternalMenu: 'internalinternalMenu',
    MaskedInput: 'internal/MaskedInput',
    PopupMenu: 'internal/PopupMenu',
    ResizeDetector: 'internal/ResizeDetector',
    PerformanceMetrics: 'internal/PerformanceMetrics',
    ModalStack: 'internal/ModalStack',
    ThemeShowcase: 'internal/ThemeShowcase',
    Icon: 'internal/icons/20px',
    createPropsGetter: 'internal/createPropsGetter',
    currentEnvironment: 'internal/currentEnvironment',
    extractKeyboardAction: 'internal/extractKeyboardAction',
  };
  const INTERNAL_NAMES = Object.keys(INTERNALS);
  const isInternalComponent = (componentName: string): boolean => {
    const whiteList = ['MenuItem', 'MenuHeader', 'MenuSeparator'];
    return (
      whiteList.every(whiteName => !componentName.startsWith(whiteName)) &&
      INTERNAL_NAMES.some(internal => componentName.startsWith(internal))
    );
  };
  const getInternalComponentPath = (name: string): string | null => {
    const componentName = INTERNAL_NAMES.find(internal => name.startsWith(internal));
    return componentName ? `${source}/${INTERNALS[componentName]}` : null;
  };

  collection
    .find(j.ExportNamedDeclaration, node => node.source && node.source.value.match(path))
    .find(j.ExportSpecifier, node => isInternalComponent(node.local.name))
    .forEach(exportSpecifier => {
      if (exportSpecifier.node.local) {
        const name = exportSpecifier.node.local.name;
        const internalPath = getInternalComponentPath(name);
        if (internalPath) {
          moveSpecifierToSeparateExport(api, exportSpecifier, internalPath);
        }
      }
    });

  collection
    .find(j.ImportDeclaration, node => node.source.value.match(path))
    .find(j.ImportSpecifier, node => isInternalComponent(node.imported.name))
    .forEach(importSpecifier => {
      const name = importSpecifier.node.imported.name;
      const internalPath = getInternalComponentPath(name);
      if (internalPath) {
        moveSpecifierToSeparateImport(api, importSpecifier, internalPath);
      }
    });
};

interface TransformOptions {
  /**
   * Альтернативный путь до контролов, который может быть настроен в проекте
   * Например, "ui" вместо "retail-ui/components"
   */
  alias: string;
  /**
   * Объединять ли разные импорты из одинаковых источников в один общий
   */
  dedupe: boolean;
}

export default function transform(file: FileInfo, api: API, options: TransformOptions) {
  const DEFAULT_SOURCE = '@skbkontur/react-ui';
  const FINAL_SOURCE = '@skbkontur/react-ui';
  const { alias = DEFAULT_SOURCE, dedupe = true } = options;

  const j = api.jscodeshift;
  const result = j(file.source);

  transformDefaultImports(api, result, alias);
  transformNamedImports(api, result, alias);
  changeImportsSource(api, result, alias, FINAL_SOURCE);
  transformReExports(api, result, alias, FINAL_SOURCE);
  transformInternals(api, result, FINAL_SOURCE, FINAL_SOURCE);
  if (dedupe) {
    deduplicateImports(api, result, FINAL_SOURCE);
    deduplicateExports(api, result, FINAL_SOURCE);
  }

  return result.toSource();
}
