import React from 'react';
import PropTypes from 'prop-types';

import * as LayoutEvents from '../../lib/LayoutEvents';
import { CommonWrapper, CommonProps } from '../../internal/CommonWrapper';
import { Nullable } from '../../typings/utility-types';
import { Theme } from '../../lib/theming/Theme';
import { ThemeContext } from '../../lib/theming/ThemeContext';

import { styles } from './ScrollContainer.styles';
import {
  getScrollYOffset,
  scrollSizeParametersNames,
  convertScrollbarXScrollState,
  convertScrollbarYScrollState,
} from './ScrollContainer.helpers';
import { ScrollAxis, ScrollBar, ScrollBarScrollState } from './ScrollBar';

export type ScrollContainerScrollXState = 'left' | 'scroll' | 'right';
export type ScrollContainerScrollYState = 'top' | 'scroll' | 'bottom';
export type ScrollContainerScrollState = ScrollContainerScrollYState; // deprecated
export type ScrollBehaviour = 'auto' | 'smooth';

export interface ScrollContainerProps extends CommonProps {
  /**
   * Инвертировать цвет скроллбара
   * @default false
   */
  invert: boolean;
  maxHeight?: React.CSSProperties['maxHeight'];
  maxWidth?: React.CSSProperties['maxWidth'];
  /**
   * @default false
   */
  preventWindowScroll: boolean;
  /**
   * Поведение скролла (https://developer.mozilla.org/en-US/docs/Web/CSS/scroll-behavior)
   * @default 'auto'
   */
  scrollBehaviour?: ScrollBehaviour;
  onScrollXStateChange?: (scrollState: ScrollContainerScrollXState) => void;
  onScrollYStateChange?: (scrollState: ScrollContainerScrollYState) => void;
  onScrollStateChange?: (scrollYState: ScrollContainerScrollState) => void; // deprecated
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
}

export class ScrollContainer extends React.Component<ScrollContainerProps> {
  public static __KONTUR_REACT_UI__ = 'ScrollContainer';

  public static propTypes = {
    invert: PropTypes.bool,
    maxWidth: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    maxHeight: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    scrollBehaviour: PropTypes.oneOf(['auto', 'smooth']),
    preventWindowScroll: PropTypes.bool,
    onScrollStateChange: PropTypes.func,
  };

  public static defaultProps = {
    invert: false,
    scrollBehaviour: 'auto',
    preventWindowScroll: false,
  };

  private scrollX: Nullable<ScrollBar>;
  private scrollY: Nullable<ScrollBar>;
  private inner: Nullable<HTMLElement>;
  private theme!: Theme;

  public componentDidMount() {
    this.scrollX?.setInnerElement(this.inner);
    this.scrollY?.setInnerElement(this.inner);
  }

  public componentDidUpdate(prevProps: ScrollContainerProps) {
    if (this.inner) {
      if (prevProps.preventWindowScroll && !this.props.preventWindowScroll) {
        this.inner.removeEventListener('wheel', this.handleInnerScrollWheel);
      }
      if (!prevProps.preventWindowScroll && this.props.preventWindowScroll) {
        this.inner.addEventListener('wheel', this.handleInnerScrollWheel, { passive: false });
      }
    }
  }

  public render() {
    return (
      <ThemeContext.Consumer>
        {(theme) => {
          this.theme = theme;
          return <CommonWrapper {...this.props}>{this.renderMain}</CommonWrapper>;
        }}
      </ThemeContext.Consumer>
    );
  }

  /**
   * @public
   * @param {HTMLElement} element
   */
  public scrollTo(element: Nullable<HTMLElement>) {
    if (!element || !this.inner) {
      return;
    }

    this.inner.scrollLeft = element.offsetLeft;
    this.inner.scrollTop = getScrollYOffset(element, this.inner);
  }

  /**
   * @public
   */
  public scrollToTop() {
    if (!this.inner) {
      return;
    }
    this.inner.scrollTop = 0;
  }

  /**
   * @public
   */
  public scrollToBottom() {
    if (!this.inner) {
      return;
    }
    this.inner.scrollTop = this.inner.scrollHeight - this.inner.offsetHeight;
  }

  /**
   * @public
   */
  public scrollToLeft() {
    if (!this.inner) {
      return;
    }
    this.inner.scrollLeft = 0;
  }

  /**
   * @public
   */
  public scrollToRight() {
    if (!this.inner) {
      return;
    }

    this.inner.scrollLeft = this.inner.scrollWidth - this.inner.offsetWidth;
  }

  private renderMain = () => {
    const props = this.props;

    const innerStyle: React.CSSProperties = {
      scrollBehavior: props.scrollBehaviour,
      maxHeight: props.maxHeight,
      maxWidth: props.maxWidth,
    };

    const scrollbarY = this.renderScrollbar('y');
    const scrollbarX = this.renderScrollbar('x');

    return (
      <div className={styles.root()} onMouseMove={this.handleMouseMove} onMouseLeave={this.handleMouseLeave}>
        {scrollbarY}
        {scrollbarX}
        <div
          style={innerStyle}
          ref={this.refInner}
          data-tid="ScrollContainer__inner"
          onScroll={this.handleNativeScroll}
          className={styles.inner(this.theme)}
        >
          {props.children}
        </div>
      </div>
    );
  };

  private hasScrollBar(axis: ScrollAxis) {
    if (!this.inner) {
      return false;
    }

    return axis === 'x'
      ? this.inner.offsetWidth < this.inner.scrollWidth
      : this.inner.offsetHeight < this.inner.scrollHeight;
  }

  private renderScrollbar = (axis: ScrollAxis) => {
    const refSctollBar = axis === 'x' ? this.refScrollBarX : this.refScrollBarY;

    return (
      <ScrollBar
        axis={axis}
        ref={refSctollBar}
        invert={this.props.invert}
        onScrollStateChange={this.handleScrollStateChange}
      />
    );
  };

  private handleScrollStateChange = (scrollState: ScrollBarScrollState, axis: ScrollAxis) => {
    if (!this.scrollY || !this.scrollX) {
      return;
    }

    if (axis === 'x') {
      const scrollXState = convertScrollbarXScrollState(scrollState);

      this.props.onScrollXStateChange?.(scrollXState);
      return;
    }

    const scrollYState = convertScrollbarYScrollState(scrollState);

    this.props.onScrollStateChange?.(scrollYState);
    this.props.onScrollYStateChange?.(scrollYState);
  };

  private refScrollBarY = (scrollbar: Nullable<ScrollBar>) => {
    this.scrollY = scrollbar;
  };

  private refScrollBarX = (scrollbar: Nullable<ScrollBar>) => {
    this.scrollX = scrollbar;
  };

  private refInner = (element: HTMLElement | null) => {
    if (!this.inner && element && this.props.preventWindowScroll) {
      element.addEventListener('wheel', this.handleInnerScrollWheel, { passive: false });
    }
    if (this.inner && !element) {
      this.inner.removeEventListener('wheel', this.handleInnerScrollWheel);
    }
    this.inner = element;
  };

  private handleNativeScroll = (event: React.UIEvent<HTMLDivElement>) => {
    this.scrollX?.reflow();
    this.scrollY?.reflow();

    this.props.onScroll?.(event);
    if (this.props.preventWindowScroll) {
      event.preventDefault();
      return;
    }
    LayoutEvents.emit();
  };

  private handleInnerScrollWheel = (event: Event) => {
    this.handleInnerScrollAxisWheel(event, 'y');
    this.handleInnerScrollAxisWheel(event, 'x');
  };

  private handleInnerScrollAxisWheel = (event: Event, axis: ScrollAxis) => {
    if (!this.inner || !(event instanceof WheelEvent) || (axis === 'x' && !event.shiftKey)) {
      return;
    }

    if (this.hasScrollBar(axis)) {
      const { pos, size, offset } = scrollSizeParametersNames[axis];

      if (event.deltaY > 0 && this.inner[size] <= this.inner[pos] + this.inner[offset]) {
        event.preventDefault();
        return false;
      }
      if (event.deltaY < 0 && this.inner[pos] <= 0) {
        event.preventDefault();
        return false;
      }
    }
  };

  private handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const right = event.currentTarget.getBoundingClientRect().right - event.pageX;
    const bottom = event.currentTarget.getBoundingClientRect().bottom - event.pageY;

    this.scrollY?.setHover(right <= 12);
    this.scrollX?.setHover(right >= 12 && bottom <= 12);
  };

  private handleMouseLeave = () => {
    this.scrollY?.setHover(false);
    this.scrollX?.setHover(false);
  };
}
