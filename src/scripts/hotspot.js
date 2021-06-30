// @ts-check

import { addClickAndKeyboardListeners } from "./utils";
import { jQuery as $, EventDispatcher } from "./globals";
import { InformationDialog } from "./information-dialog";

/**
 * Enum containing possible navigation types
 * @readonly
 * @enum {string}
 */
const hotspotType = {
  GO_TO_SPECIFIED: "specified",
  GO_TO_NEXT: "next",
  GO_TO_PREVIOUS: "previous",
  INFORMATION_DIALOG: "information-dialog",
  NONE: "none",
  GO_TO_SUMMARY_SLIDE: "go-to-summary-slide",
};

export class Hotspot extends EventDispatcher {
  /**
   * Wrapper for elements with click actions
   *
   * @param {Object} semanticParameters
   * @param {string} semanticParameters.title
   * @param {number} semanticParameters.goToSlide
   * @param {boolean} semanticParameters.invisible
   * @param {string} semanticParameters.goToSlideType
   * @param {string} semanticParameters.dialogContent
   * @param {Media[]} semanticParameters.dialogAudio
   * @param {DialogHeaderContent} semanticParameters.dialogHeaderContent
   * @param {Object} param1
   * @param {Object} param1.l10n
   * @param {number} param1.currentIndex
   * @param {$<HTMLElement>} $content
   */
  constructor(
    {
      title,
      goToSlide = 1,
      invisible,
      goToSlideType = hotspotType.GO_TO_SPECIFIED,
      dialogContent,
      dialogAudio,
      dialogHeaderContent,
    },
    { l10n, currentIndex },
    $content = null
  ) {
    super(
      {
        title,
        goToSlide,
        invisible,
        goToSlideType,
        dialogContent,
        dialogAudio,
        dialogHeaderContent,
      },
      {
        l10n,
        currentIndex,
      },
      $content
    );

    this.eventDispatcher = new EventDispatcher();
    const classes = `h5p-press-to-go ${
      invisible ? "h5p-invisible" : "h5p-visible"
    }`;
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

    const goToActions = [
      hotspotType.GO_TO_NEXT,
      hotspotType.GO_TO_PREVIOUS,
      hotspotType.GO_TO_SPECIFIED,
      hotspotType.GO_TO_SUMMARY_SLIDE,
    ];
    const isGoToLink = goToActions.includes(goToSlideType);
    const isInformationDialogTrigger =
      goToSlideType === hotspotType.INFORMATION_DIALOG;

    const isAnswerHotspotWithoutAction = goToSlideType === hotspotType.NONE;

    if (isGoToLink) {
      this.$element = this.createGoToLink(
        goToSlide,
        goToSlideType,
        currentIndex
      );
    } else if (isInformationDialogTrigger) {
      this.$element = this.createButton(() => {
        const horizontalOffset = "50%";
        const verticalOffset = "50%";

        this.dialog =
          this.dialog ||
          new InformationDialog({
            content: $(dialogContent).get(0),
            dialogHeaderContent,
            dialogAudio,
            parent: this.$element.closest(".h5p-presentation-wrapper").get(0),
            l10n,
            horizontalOffset,
            verticalOffset,
          });
        this.dialog.show();
      });
    } else if (isAnswerHotspotWithoutAction) {
      this.$element = this.createButton();
    }

    this.$element.addClass(classes);
    this.$element.attr("tabindex", tabindex);
    this.$element.attr("title", title);

    if ($content) {
      this.attachContent($content);
    }

    // Create `on` method in constructor to avoid it being overwritten
    this.on =
      /**
       * Register an event listener
       *
       * @param {string} name
       * @param {function} callback
       */
      function on(name, callback) {
        this.eventDispatcher.on(name, callback);
      };
  }

  /**
   * @param {number} goToSlide
   * @param {string} goToSlideType
   * @param {number} currentIndex
   * @returns {$}
   */
  createGoToLink(goToSlide, goToSlideType, currentIndex) {
    // Default goes to the set number
    let goTo = goToSlide - 1;

    switch (goToSlideType) {
      case hotspotType.GO_TO_NEXT:
        goTo = currentIndex + 1;
        break;
      case hotspotType.GO_TO_PREVIOUS:
        goTo = currentIndex - 1;
        break;
      default:
        break;
    }

    // Create button that leads to another slide
    const $element = $("<a/>", {
      href: "#",
    });

    addClickAndKeyboardListeners($element, (event) => {
      const isGoToSummarySlideHotspot =
        goToSlideType === hotspotType.GO_TO_SUMMARY_SLIDE;
      if (isGoToSummarySlideHotspot) {
        this.eventDispatcher.trigger("navigate-to-last-slide");
      } else {
        this.eventDispatcher.trigger("navigate", goTo);
      }
      event.preventDefault();
    });

    return $element;
  }

  /**
   * @param {(event: MouseEvent | TouchEvent) => void} [action]
   * @returns {$}
   */
  createButton(action) {
    const $element = $("<button/>", {
      type: "button",
    });

    if (action) {
      addClickAndKeyboardListeners($element, action);
    }

    return $element;
  }

  /**
   * Attach element to the given container.
   *
   * @public
   * @param {$} $container
   */
  attach($container) {
    $container.html("").addClass("h5p-go-to-slide").append(this.$element);
  }

  /**
   * @param {$} $content
   */
  attachContent($content) {
    $content.attach(this.$element);
  }
}
