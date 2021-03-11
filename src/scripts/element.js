import GoToSlide from './go-to-slide';

/**
 * @class
 * 
 * The Element class' `this` is an instance of `Slide`
 * 
 * @param {*} parameters 
 */
function Element(parameters) {
  const {
    showAsHotspot
  } = parameters;

  const isAnchor = parameters.action === undefined;

  if (isAnchor) {
    this.instance = Element.createGoToSlide(parameters, this.parent.parent.l10n, this.parent.index, this.parent.parent);

  } else if (showAsHotspot) {
    this.instance = Element.createGoToSlide(parameters, this.parent.parent.l10n, this.parent.index, this.parent.parent);

    const content = Element.createContent(this.parent, parameters);
    this.instance.attachContent(content);

  } else {
    const content = Element.createContent(this.parent, parameters);
    this.instance = content;
  }

  if (this.parent.parent.elementInstances[this.parent.index] === undefined) {
    this.parent.parent.elementInstances[this.parent.index] = [this.instance];
  } else {
    this.parent.parent.elementInstances[this.parent.index].push(this.instance);
  }

  if (this.instance.showCPComments !== undefined || this.instance.isTask || (this.instance.isTask === undefined && this.instance.showSolutions !== undefined)) {
    // Mark slide as task in CP navigation bar
    this.instance.coursePresentationIndexOnSlide = this.parent.parent.elementInstances[this.parent.index].length - 1;
    if (this.parent.parent.slidesWithSolutions[this.parent.index] === undefined) {
      this.parent.parent.slidesWithSolutions[this.parent.index] = [];
    }
    this.parent.parent.slidesWithSolutions[this.parent.index].push(this.instance);
  }

  // Check if this is an Exportable Text Area
  if (this.instance.exportAnswers !== undefined && this.instance.exportAnswers) {
    this.parent.parent.hasAnswerElements = true;
  }

  if (!this.parent.parent.isTask && !this.parent.parent.hideSummarySlide) {
    // CP is not a task by default, but it will be if one of the elements is task or have a solution
    if (this.instance.isTask || (this.instance.isTask === undefined && this.instance.showSolutions !== undefined)) {
      this.parent.parent.isTask = true; // (checking for showSolutions will not work for compound content types, which is why we added isTask instead.)
    }
  }
}

Element.overrideAutoplay = function (h5pLibrary) {
  const {
    params
  } = h5pLibrary;

  /* If library allows autoplay, control this from CP */
  if (params.autoplay) {
    h5pLibrary.params.autoplay = false;
    h5pLibrary.params.cpAutoplay = true;

  } else if (params.playback && params.playback.autoplay) {
    h5pLibrary.params.playback.autoplay = false;
    h5pLibrary.params.cpAutoplay = true;

  } else if (params.media &&
    params.media.params &&
    params.media.params.playback &&
    params.media.params.playback.autoplay) {
    // Control libraries that has content with autoplay through CP
    h5pLibrary.params.media.params.playback.autoplay = false;
    h5pLibrary.params.cpAutoplay = true;

  } else if (params.media &&
    params.media.params &&
    params.media.params.autoplay) {
    // Control libraries that has content with autoplay through CP
    h5pLibrary.params.media.params.autoplay = false;
    h5pLibrary.params.cpAutoplay = true;

  } else if (params.override &&
    params.override.autoplay) {
    // Control libraries that has content with autoplay through CP
    h5pLibrary.params.override.autoplay = false;
    h5pLibrary.params.cpAutoplay = true;
  }

  return h5pLibrary;
}

Element.createContent = function (parent, parameters) {
  let h5pLibrary;
  if (parent.parent.isEditor()) {
    // Clone the whole tree to avoid libraries accidentally changing params while running.
    h5pLibrary = H5P.jQuery.extend(true, {}, parameters.action, parent.parent.elementsOverride);
  } else {
    // Add defaults
    h5pLibrary = H5P.jQuery.extend(true, parameters.action, parent.parent.elementsOverride);
  }

  h5pLibrary = Element.overrideAutoplay(h5pLibrary);

  const internalSlideId = parent.parent.elementInstances[parent.index] ? parent.parent.elementInstances[parent.index].length : 0;
  const state = parent.parent.previousState &&
    parent.parent.previousState.answers &&
    parent.parent.previousState.answers[parent.index] &&
    parent.parent.previousState.answers[parent.index][internalSlideId];

  if (state) {
    // Restore previous state
    h5pLibrary.userDatas = {
      state
    };
  }

  // Override child settings
  h5pLibrary.params = h5pLibrary.params || {};
  const instance = H5P.newRunnable(h5pLibrary, parent.parent.contentId, undefined, true, {
    parent: parent.parent
  });

  if (instance.preventResize !== undefined) {
    instance.preventResize = true;
  }

  return instance;
}

Element.createGoToSlide = function (parameters, l10n, currentIndex, grandparent) {
  const goToSlide = new GoToSlide(parameters, {
    l10n,
    currentIndex,
  });

  if (!grandparent.isEditor()) {
    goToSlide.on('navigate', event => {
      const index = event.data;
      grandparent.jumpToSlide(index);
    });
  }

  return goToSlide;
}

export default Element;