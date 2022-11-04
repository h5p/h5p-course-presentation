import { jQuery as $ } from './globals';

/**
 * @class
 */
export default class SlideBackground {
  /**
   * Create a Slide specific background selector
   *
   * @param {H5P.InteractiveBoard} cp Course Presentation instance
   */
  constructor(cp) {
    var params = cp.presentation;

    // Extend defaults
    params = $.extend(true, {
      globalBackgroundSelector: {
        fillGlobalBackground: "",
        imageGlobalBackground: {}
      },
      slides: [
        {
          slideBackgroundSelector: {
            fillSlideBackground: "",
            imageSlideBackground: {}
          }
        }
      ]
    }, params);

    /**
     * Set global background
     * @private
     */
    var setGlobalBackground = function () {
      var globalSettings = params.globalBackgroundSelector;
      setBackground(globalSettings.fillGlobalBackground, globalSettings.imageGlobalBackground);
    };

    /**
     * Set single slide background
     * @private
     */
    var setSlideBackgrounds = function () {
      params.slides.forEach(function (slideParams, idx) {
        var bgParams = slideParams.slideBackgroundSelector;
        if (bgParams) {
          setBackground(bgParams.fillSlideBackground, bgParams.imageSlideBackground, idx);
        }
      });
    };

    /**
     * Set background of slide(s)
     *
     * @private
     * @param {Object} fillSettings Background color settings
     * @param {Object} imageSettings Image background settings
     * @param {number} [index] Optional target slide index, otherwise all slides.
     */
    var setBackground = function (fillSettings, imageSettings, index) {
      var $updateSlides = cp.$slidesWrapper.children().filter(':not(.h5p-summary-slide)');

      if (index !== undefined) {
        $updateSlides = $updateSlides.eq(index);
      }

      if (fillSettings && fillSettings !== "") {

        // Fill with background color
        $updateSlides.addClass('has-background')
          .css('background-image', '')
          .css('background-color', fillSettings);
      }
      else if (imageSettings && imageSettings.path) {

        // Fill with image
        $updateSlides.addClass('has-background')
          .css('background-color', '')
          .css('background-image', 'url(' + H5P.getPath(imageSettings.path, cp.contentId) + ')');
      }
    };

    // Set backgrounds
    setGlobalBackground();
    setSlideBackgrounds();
  }
}
