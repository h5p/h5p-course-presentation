/** @namespace H5P */
H5P.CoursePresentation.GoToSlide = (function ($) {

  /**
   * Element for linking between slides in presentations.
   *
   * @class
   * @param {Number} slideNum
   * @param {CoursePresentation} cp
   * @param {String} goToSlideType
   */
  function GoToSlide(title, slideNum, invisible, cp, goToSlideType) {
    var self = this;

    var classes = 'h5p-press-to-go';
    var tabindex = 1;
    // Set default value.
    if (goToSlideType === undefined) {
      goToSlideType = 'specified';
    }
    if (invisible) {
      title = undefined;
      tabindex = -1;
    }
    else {
      if (!title) {
        // No title so use the slide number, prev, or next.
        switch(goToSlideType) {
          case "specified":
            title = cp.l10n.goToSlide.replace(':num', slideNum);
            break;
          case "next":
            title = cp.l10n.goToSlide.replace(':num', cp.l10n.nextSlide);
            break;
          case "previous":
            title = cp.l10n.goToSlide.replace(':num', cp.l10n.prevSlide);
            break;
        }
      }
      classes += ' h5p-visible';
    }

    /**
     * @private
     */
    var go = function () {
      // Default goes to the set number
      var goTo = slideNum - 1;

      // Check if previous or next is selected.
      if (goToSlideType === 'next') {
        goTo = cp.currentSlideIndex + 1;
      }
      else if (goToSlideType === 'previous') {
        goTo = cp.currentSlideIndex - 1;
      }

      if (cp.editor === undefined && cp.slides[goTo] !== undefined) {
        cp.jumpToSlide(goTo);
      }
    };

    // Create button that leads to another slide
    var $button = $('<div/>', {
      'class': classes,
      role: 'button',
      tabindex: tabindex,
      title: title,
      on: {
        click: go,
        keypress: function (event) {
          if (event.which === 13) {
            go();
          }
        }
      }
    });

    /**
     * Attach element to the given container.
     *
     * @public
     * @param {jQuery} $container
     */
    self.attach = function ($container) {
      $container.html('').addClass('h5p-go-to-slide').append($button);
    };
  }

  return GoToSlide;
})(H5P.jQuery);
