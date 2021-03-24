// @ts-check

import { addClickAndKeyboardListeners } from "./utils";
import { jQuery as $, EventDispatcher } from "./globals";

/**
 * Enum containing possible navigation types
 * @readonly
 * @enum {string}
 */
const hotspotType = {
  GO_TO_SPECIFIED: "specified",
  GO_TO_NEXT: "next",
  GO_TO_PREVIOUS: "previous",
};

/**
 * Element for linking between slides in presentations.
 *
 * @param {Object} param0
 * @param {string} param0.title
 * @param {number} param0.goToSlide
 * @param {boolean} param0.invisible
 * @param {string} param0.goToSlideType
 * @param {Object} param1
 * @param {Object} param1.l10n
 * @param {number} param1.currentIndex
 * @param {$<HTMLElement>} content
 */
export default function Hotspot(
  {
    title,
    goToSlide = 1,
    invisible,
    goToSlideType = hotspotType.GO_TO_SPECIFIED,
  },
  { l10n, currentIndex },
  content = null
) {
  this.eventDispatcher = new EventDispatcher();
  const classes = `h5p-press-to-go${invisible ? "" : " h5p-visible"}`;
  const tabindex = invisible ? -1 : 0;

  if (invisible) {
    title = undefined;
  } else {
    const useDefaultTitle = !title;
    if (useDefaultTitle) {
      // No title so use the slide number, prev, or next.
      switch (goToSlideType) {
        case hotspotType.GO_TO_SPECIFIED:
          title = l10n.goToSlide.replace(":num", goToSlide.toString());
          break;
        case hotspotType.GO_TO_NEXT:
          title = l10n.goToSlide.replace(":num", l10n.nextSlide);
          break;
        case hotspotType.GO_TO_PREVIOUS:
          title = l10n.goToSlide.replace(":num", l10n.prevSlide);
          break;
      }
    }
  }

  this.action = "goToSlide";

  // Default goes to the set number
  let goTo = goToSlide - 1;

  // Check if previous or next is selected.
  if (goToSlideType === hotspotType.GO_TO_NEXT) {
    goTo = currentIndex + 1;
  } else if (goToSlideType === hotspotType.GO_TO_PREVIOUS) {
    goTo = currentIndex - 1;
  }

  // Create button that leads to another slide
  this.$element = $("<a/>", {
    href: "#",
    class: classes,
    tabindex: tabindex,
    title: title,
  });

  addClickAndKeyboardListeners(this.$element, (event) => {
    this.eventDispatcher.trigger("navigate", goTo);
    event.preventDefault();
  });

  if (content) {
    this.attachContent(content);
  }

  Hotspot.prototype = Object.create(EventDispatcher.prototype);
  Hotspot.prototype.constructor = Hotspot;

  /**
   * Attach element to the given container.
   *
   * @public
   * @param {$} $container
   */
  this.attach = ($container) => {
    $container.html("").addClass("h5p-go-to-slide").append(this.$element);
  };

  /**
   * Register an event listener
   *
   * @param {string} name
   * @param {function} callback
   */
  this.on = (name, callback) => {
    this.eventDispatcher.on(name, callback);
  };
}

/**
 *
 * @param {$} content
 */
Hotspot.prototype.attachContent = function (content) {
  content.attach(this.$element);
};
