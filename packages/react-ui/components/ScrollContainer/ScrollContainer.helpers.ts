import { MIN_SCROLL_SIZE } from './ScrollContainer.constants';
import { ScrollBarScrollState } from './ScrollBar';
import { ScrollContainerScrollXState, ScrollContainerScrollYState } from './ScrollContainer';

export const scrollSizeParametersNames = {
  x: {
    offset: 'offsetWidth',
    size: 'scrollWidth',
    pos: 'scrollLeft',
    coord: 'clientX',
    clientSize: 'clientWidth',
    customScrollPos: 'left',
    customScrollSize: 'width',
  },
  y: {
    offset: 'offsetHeight',
    size: 'scrollHeight',
    pos: 'scrollTop',
    coord: 'clientY',
    clientSize: 'clientHeight',
    customScrollPos: 'top',
    customScrollSize: 'height',
  },
} as const;

export const getScrollSizeParams = (inner: HTMLElement, axis: 'x' | 'y') => {
  const { offset, size, pos } = scrollSizeParametersNames[axis];

  const contentSize = inner[size];
  const scrollOffset = inner[pos];
  const containerSize = inner[offset];

  const scrollActive = containerSize < contentSize;

  let scrollSize = 0;
  let scrollPos = 0;

  if (scrollActive) {
    scrollSize = Math.max((containerSize / contentSize) * containerSize, MIN_SCROLL_SIZE);
    scrollPos = (scrollOffset / (contentSize - containerSize)) * (containerSize - scrollSize);
  }

  return {
    scrollActive,
    scrollSize,
    scrollPos,
  };
};

export const getScrollYOffset = (element: HTMLElement, container: HTMLElement) => {
  const elementOffset = element.offsetTop;

  if (container.scrollTop > elementOffset) {
    return elementOffset;
  }

  const offset = elementOffset + element.scrollHeight - container.offsetHeight;
  if (container.scrollTop < offset) {
    return offset;
  }

  return container.scrollTop;
};

export const convertScrollbarXScrollState = (state: ScrollBarScrollState): ScrollContainerScrollXState => {
  const scrollBarState: Record<ScrollBarScrollState, ScrollContainerScrollXState> = {
    begin: 'left',
    end: 'right',
    middle: 'scroll',
  };

  return scrollBarState[state];
};

export const convertScrollbarYScrollState = (state: ScrollBarScrollState): ScrollContainerScrollYState => {
  const scrollBarState: Record<ScrollBarScrollState, ScrollContainerScrollYState> = {
    begin: 'top',
    end: 'bottom',
    middle: 'scroll',
  };

  return scrollBarState[state];
};
