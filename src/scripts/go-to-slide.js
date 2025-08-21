import { addClickAndKeyboardListeners, stripHTML, decodeHTML } from './utils';
import { jQuery as $, EventDispatcher } from './globals';

/**
 * Enum containing possible navigation types
 * @readonly
 * @enum {string}
 */
const navigationType = {
  SPECIFIED: 'specified',
  NEXT: 'next',
  PREVIOUS: 'previous'
};

/**
 * @class
 */
export default class GoToSlide {
  /**
   * Element for linking between slides in presentations.
   *
   * @constructor
   * @param {string} title
   * @param {number} goToSlide
   * @param {boolean} invisible
   * @param {string} goToSlideType
   * @param {object} l10n
   * @param {number} currentIndex
   */
  constructor({ title, goToSlide = 1, invisible, goToSlideType  = navigationType.SPECIFIED }, { l10n, currentIndex }) {
    this.eventDispatcher = new EventDispatcher();
    let classes = 'h5p-press-to-go';
    let tabindex = 0;

    if (invisible) {
      title = undefined;
      tabindex = -1;
    }
    else {
      if (!title) {
        // No title so use the slide number, prev, or next.
        switch (goToSlideType) {
          case navigationType.SPECIFIED:
            title = l10n.goToSlide.replace(':num', goToSlide.toString());
            break;
          case navigationType.NEXT:
            title = l10n.goToSlide.replace(':num', l10n.nextSlide);
            break;
          case navigationType.PREVIOUS:
            title = l10n.goToSlide.replace(':num', l10n.prevSlide);
            break;
        }
      }
      classes += ' h5p-visible';
    }

    // Default goes to the set number
    let goTo = goToSlide - 1;

    // Check if previous or next is selected.
    if (goToSlideType === navigationType.NEXT) {
      goTo = currentIndex + 1;
    }
    else if (goToSlideType === navigationType.PREVIOUS) {
      goTo = currentIndex - 1;
    }

    // Create button that leads to another slide
    this.$element = $('<a/>', {
      href: '#',
      'class': classes,
      tabindex: tabindex,
      'aria-label': stripHTML(decodeHTML(title))
    });

    addClickAndKeyboardListeners(this.$element, (event) => {
      this.eventDispatcher.trigger('navigate', goTo);
      event.preventDefault();
    });
  }

  /**
   * Attach element to the given container.
   *
   * @public
   * @param {jQuery} $container
   */
  attach($container) {
    $container.html('').addClass('h5p-go-to-slide').append(this.$element);
  }

  /**
   * Register an event listener
   *
   * @param {string} name
   * @param {function} callback
   */
  on(name, callback) {
    this.eventDispatcher.on(name, callback);
  }
}
