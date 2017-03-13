/** @namespace H5P */
H5P.CoursePresentation.GoToSlide = (function ($) {

  /**
   * Element for linking between slides in presentations.
   *
   * @class
   * @param {Number} slideNum
   * @param {CoursePresentation} cp
   * @param {String} goToSlideNextPrevious
   * @param {Number} index
   */
  function GoToSlide(title, slideNum, invisible, cp, goToSlideNextPrevious, index) {
    var self = this;

    var classes = 'h5p-press-to-go';
    var tabindex = 1;
    if (invisible) {
      title = undefined;
      tabindex = -1;
    }
    else {
      title = title ? title : cp.l10n.goToSlide.replace(':num', slideNum);
      classes += ' h5p-visible';
    }
    
    // Check if previous or next is selected.
    if (goToSlideNextPrevious == "next") {
      slideNum = index + 1;
      // If the title wasn't set, you don't want slide undefined to be shown.
      title = title.replace('slide undefined', "next slide");
    } else if (goToSlideNextPrevious == "previous") {
      slideNum = index - 1;
      title = title.replace('slide undefined', "previous slide");
    } else {
      // There is no goToSlideNextPrevious set, so jump to slide number is used.
      slideNum--;
    }


    /**
     * @private
     */
    var go = function () {
      if (cp.editor === undefined && cp.slides[slideNum] !== undefined) {
        cp.jumpToSlide(slideNum);
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
