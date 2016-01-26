H5P.CoursePresentation.SlideBackground = (function ($) {
  /**
   * SlideBackground class
   * @class SlideBackground
   */
  function SlideBackground (cp) {
    var params = cp.presentation;

    var setGlobalBackground = function () {
      var globalSettings = params.globalBackgroundSelector;
      if (globalSettings) {
        setBackground(globalSettings.fillGlobalBackground, globalSettings.imageGlobalBackground);
      }
    };

    var setSlideBackgrounds = function () {
      params.slides.forEach(function (slideParams, idx) {
        var bgParams = slideParams.slideBackgroundSelector;
        if (bgParams) {
          setBackground(bgParams.fillSlideBackground, bgParams.imageSlideBackground, idx);
        }
      });
    };

    /**
     *
     * @param fillSettings
     * @param imageSettings
     * @param index
     */
    var setBackground = function (fillSettings, imageSettings, index) {
      var $updateSlides = cp.$slidesWrapper.children();

      if (index !== undefined) {
        $updateSlides = $updateSlides.eq(index);
      }

      if (fillSettings && fillSettings !== "") {

        // Fill with background color
        $updateSlides.addClass('has-background')
          .css('background-image', '')
          .css('background-color', '#' + fillSettings);
      }
      else if (imageSettings && imageSettings.path) {

        // Fill with image
        $updateSlides.addClass('has-background')
          .css('background-color', '')
          .css('background-image', 'url(' + H5P.getPath(imageSettings.path, cp.contentId) + ')');
      }
    };

    setGlobalBackground();
    setSlideBackgrounds();
  }

  return SlideBackground;

})(H5P.jQuery);
