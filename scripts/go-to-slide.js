/** @namespace H5P */
H5P.CoursePresentationGoToSlide = (function ($) {

  /**
   * Element for linking between slides in presentations.
   *
   * @class
   * @param {Number} slideNum
   * @param {CoursePresentation} cp
   */
  function GoToSlide(slideNum, cp) {
    var self = this;
    self.$ = $(self);

    // Create button that leads to another slide
    var $button = $('<div/>', {
      'class': 'h5p-press-to-go',
      role: 'button',
      tabindex: 1,
      title: cp.l10n.goToSlide.replace(':num', slideNum),
      on: {
        click: function () {
          if (cp.editor === undefined) {
            cp.jumpToSlide(slideNum - 1);
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
