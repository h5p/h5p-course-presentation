// @ts-check

import { jQuery as $ } from "./globals";
import { initAnswerHotspot } from "./answer-hotspot";
import CoursePresentation from "./cp";
import { Hotspot } from "./hotspot";

const H5P = window.H5P || {};

/**
 * @class
 *
 * The Element class' `this` is an instance of `Slide`
 *
 * @param {*} parameters
 */
function Element(parameters) {
  const { showAsHotspot, answerType } = parameters;

  // @ts-expect-error Element extends Parent
  const slide = this.parent;
  const coursePresentation = slide.parent;

  if (showAsHotspot) {
    const content = Element.createContent(
      slide,
      coursePresentation,
      parameters
    );
    this.instance = Element.createHotspot(
      parameters,
      coursePresentation.l10n,
      slide.index,
      coursePresentation,
      content
    );
  } else {
    const content = Element.createContent(
      slide,
      coursePresentation,
      parameters
    );
    this.instance = content;
  }

  const isAnswerHotspot = !!answerType;
  if (isAnswerHotspot) {
    initAnswerHotspot(this.instance, answerType);
  }

  const slideHasElements = !!coursePresentation.elementInstances[slide.index];
  if (slideHasElements) {
    coursePresentation.elementInstances[slide.index].push(this.instance);
  } else {
    coursePresentation.elementInstances[slide.index] = [this.instance];
  }

  const slideIsTask =
    this.instance.showCPComments !== undefined ||
    this.instance.isTask ||
    (this.instance.isTask === undefined &&
      this.instance.showSolutions !== undefined);
  if (slideIsTask) {
    // Mark slide as task in CP navigation bar
    this.instance.coursePresentationIndexOnSlide =
      coursePresentation.elementInstances[slide.index].length - 1;

    const { slidesWithSolutions } = coursePresentation;
    const slideAlreadyHasTasks = !!slidesWithSolutions[slide.index];
    if (!slideAlreadyHasTasks) {
      slidesWithSolutions[slide.index] = [];
    }

    slidesWithSolutions[slide.index].push(this.instance);
  }
  // Check for comments to show after solution button is pressed
  else if (parameters.solution) {
    if (slide.parent.showCommentsAfterSolution[slide.index] === undefined) {
      slide.parent.showCommentsAfterSolution[slide.index] = [];
    }
    slide.parent.showCommentsAfterSolution[slide.index].push(this.instance);
  }

  const isExportableTextArea = this.instance.exportAnswers;
  if (isExportableTextArea) {
    coursePresentation.hasAnswerElements = true;
  }

  if (!coursePresentation.isTask && !coursePresentation.hideSummarySlide) {
    // CP is not a task by default, but it will be if one of the elements is task or have a solution
    if (
      this.instance.isTask ||
      (this.instance.isTask === undefined &&
        this.instance.showSolutions !== undefined)
    ) {
      coursePresentation.isTask = true; // (checking for showSolutions will not work for compound content types, which is why we added isTask instead.)
    }
  }
}

Element.overrideAutoplay = function (h5pLibrary) {
  const { params } = h5pLibrary;

  /* If library allows autoplay, control this from CP */
  if (params.autoplay) {
    h5pLibrary.params.autoplay = false;
    h5pLibrary.params.cpAutoplay = true;
  } else if (params.playback && params.playback.autoplay) {
    h5pLibrary.params.playback.autoplay = false;
    h5pLibrary.params.cpAutoplay = true;
  } else if (
    params.media &&
    params.media.params &&
    params.media.params.playback &&
    params.media.params.playback.autoplay
  ) {
    // Control libraries that has content with autoplay through CP
    h5pLibrary.params.media.params.playback.autoplay = false;
    h5pLibrary.params.cpAutoplay = true;
  } else if (
    params.media &&
    params.media.params &&
    params.media.params.autoplay
  ) {
    // Control libraries that has content with autoplay through CP
    h5pLibrary.params.media.params.autoplay = false;
    h5pLibrary.params.cpAutoplay = true;
  } else if (params.override && params.override.autoplay) {
    // Control libraries that has content with autoplay through CP
    h5pLibrary.params.override.autoplay = false;
    h5pLibrary.params.cpAutoplay = true;
  }

  return h5pLibrary;
};

/**
 *
 * @param {Object} slide
 * @param {CoursePresentation} coursePresentation
 * @param {*} parameters
 * @returns
 */
Element.createContent = function (slide, coursePresentation, parameters) {
  let h5pLibrary;

  if (coursePresentation.isEditor()) {
    // Clone the whole tree to avoid libraries accidentally changing params while running.
    h5pLibrary = H5P.jQuery.extend(
      true,
      {},
      parameters.action,
      coursePresentation.elementsOverride
    );
  } else {
    // Add defaults
    h5pLibrary = H5P.jQuery.extend(
      true,
      parameters.action,
      coursePresentation.elementsOverride
    );
  }

  h5pLibrary = Element.overrideAutoplay(h5pLibrary);

  const internalSlideId = coursePresentation.elementInstances[slide.index]
    ? coursePresentation.elementInstances[slide.index].length
    : 0;
  const state =
    coursePresentation.previousState &&
    coursePresentation.previousState.answers &&
    coursePresentation.previousState.answers[slide.index] &&
    coursePresentation.previousState.answers[slide.index][internalSlideId];

  if (state) {
    // Restore previous state
    h5pLibrary.userDatas = {
      state,
    };
  }

  // Override child settings
  h5pLibrary.params = h5pLibrary.params || {};
  const instance = H5P.newRunnable(
    h5pLibrary,
    coursePresentation.contentId,
    undefined,
    true,
    {
      parent: coursePresentation,
    }
  );

  if (instance.preventResize !== undefined) {
    instance.preventResize = true;
  }

  return instance;
};

/**
 *
 * @param {Object} parameters
 * @param {string} parameters.title
 * @param {number} parameters.goToSlide
 * @param {boolean} parameters.invisible
 * @param {string} parameters.goToSlideType}
 * @param {string} parameters.dialogContent
 * @param {Media[]} parameters.dialogAudio
 * @param {DialogHeaderContent} parameters.dialogHeaderContent
 * @param {Object} l10n
 * @param {number} currentIndex
 * @param {CoursePresentation} coursePresentation
 * @param {$<HTMLElement>} content
 * @returns {Hotspot}
 */
Element.createHotspot = function (
  parameters,
  l10n,
  currentIndex,
  coursePresentation,
  content
) {
  const hotspot = new Hotspot(
    parameters,
    {
      l10n,
      currentIndex,
    },
    content
  );

  if (!coursePresentation.isEditor()) {
    hotspot.on("navigate", (event) => {
      const index = event.data;
      coursePresentation.jumpToSlide(index);
    });

    hotspot.on("navigate-to-last-slide", () => {
      coursePresentation.jumpToSlide(coursePresentation.slides.length - 1);
    })
  }

  return hotspot;
};

export default Element;
