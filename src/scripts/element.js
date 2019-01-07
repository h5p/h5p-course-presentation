import GoToSlide from './go-to-slide';

/**
 * @class
 */
function Element(parameters) {
  const self = this;

  if (parameters.action === undefined) {
    // goToSlide, internal element
    self.instance = new GoToSlide(parameters, {
      l10n: self.parent.parent.l10n,
      currentIndex: self.parent.index
    });

    if (!self.parent.parent.isEditor()) {
      instance.on('navigate', event => {
        const index = event.data;
        self.parent.parent.jumpToSlide(index);
      });
    }
  }
  else {
    // H5P library
    var library;
    if (self.parent.parent.isEditor()) {
      // Clone the whole tree to avoid libraries accidentally changing params while running.
      library = H5P.jQuery.extend(true, {}, parameters.action, self.parent.parent.elementsOverride);
    }
    else {
      // Add defaults
      library = H5P.jQuery.extend(true, parameters.action, self.parent.parent.elementsOverride);
    }

    /* If library allows autoplay, control this from CP */
    if (library.params.autoplay) {
      library.params.autoplay = false;
      library.params.cpAutoplay = true;
    }
    else if (library.params.playback && library.params.playback.autoplay) {
      library.params.playback.autoplay = false;
      library.params.cpAutoplay = true;
    }
    else if (library.params.media &&
      library.params.media.params &&
      library.params.media.params.playback &&
      library.params.media.params.playback.autoplay) {
      // Control libraries that has content with autoplay through CP
      library.params.media.params.playback.autoplay = false;
      library.params.cpAutoplay = true;
    }
    else if (library.params.media &&
      library.params.media.params &&
      library.params.media.params.autoplay) {
      // Control libraries that has content with autoplay through CP
      library.params.media.params.autoplay = false;
      library.params.cpAutoplay = true;
    }

    var internalSlideId = self.parent.parent.elementInstances[self.parent.index] ? self.parent.parent.elementInstances[self.parent.index].length : 0;
    if (self.parent.parent.previousState && self.parent.parent.previousState.answers && self.parent.parent.previousState.answers[self.parent.index] && self.parent.parent.previousState.answers[self.parent.index][internalSlideId]) {
      // Restore previous state
      library.userDatas = {
        state: self.parent.parent.previousState.answers[self.parent.index][internalSlideId]
      };
    }

    // Override child settings
    library.params = library.params || {};
    self.instance = H5P.newRunnable(library, self.parent.parent.contentId, undefined, true, {parent: self.parent.parent});
    if (self.instance.preventResize !== undefined) {
      self.instance.preventResize = true;
    }
  }

  if (self.parent.parent.elementInstances[self.parent.index] === undefined) {
    self.parent.parent.elementInstances[self.parent.index] = [self.instance];
  }
  else {
    self.parent.parent.elementInstances[self.parent.index].push(self.instance);
  }

  if (self.instance.showSolutions !== undefined || self.instance.showCPComments !== undefined) {
    // Mark slide as task in CP navigation bar
    self.instance.coursePresentationIndexOnSlide = self.parent.parent.elementInstances[self.parent.index].length - 1;
    if (self.parent.parent.slidesWithSolutions[self.parent.index] === undefined) {
      self.parent.parent.slidesWithSolutions[self.parent.index] = [];
    }
    self.parent.parent.slidesWithSolutions[self.parent.index].push(self.instance);
  }

  // Check if this is an Exportable Text Area
  if (self.instance.exportAnswers !== undefined && self.instance.exportAnswers) {
    self.parent.parent.hasAnswerElements = true;
  }

  if (!self.parent.parent.isTask) {
    // CP is not a task by default, but it will be if one of the elements is task or have a solution
    if (self.instance.isTask || (self.instance.isTask === undefined && self.instance.showSolutions !== undefined)) {
      self.parent.parent.isTask = true; // (checking for showSolutions will not work for compound content types, which is why we added isTask instead.)
    }
  }
}

export default Element;
