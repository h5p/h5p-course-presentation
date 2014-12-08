var H5PUpgrades = H5PUpgrades || {};

H5PUpgrades['H5P.CoursePresentation'] = (function ($) {
  return {
    1: {
      2: {
        contentUpgrade: function (parameters, finished) {
          var i, j, slide;

          // Determine if keywords has been removed
          var keywordsRemoved = true;
          for (i = 0; i < parameters.slides.length; i++) {
            slide = parameters.slides[i];
            if (keywordsRemoved && slide.keywords !== undefined) {
              keywordsRemoved = false;
              break;
            }
          }

          if (!keywordsRemoved) {
            // Move and resize elements
            for (i = 0; i < parameters.slides.length; i++) {
              slide = parameters.slides[i];

              for (j = 0; j < slide.elements.length; j++) {
                var element = slide.elements[j];

                element.x += 31.25;
                element.width *= 0.6875;
              }
            }
          }

          // Move slides inside presentation wrapper.
          parameters.presentation = {
            slides: parameters.slides,
            keywordListEnabled: !keywordsRemoved,
            keywordListAlwaysShow: true,
            keywordListAutoHide: false,
            keywordListOpacity: 90
          };
          delete parameters.slides;

          finished(null, parameters);
        }
      }
    }
  };
})(H5P.jQuery);
