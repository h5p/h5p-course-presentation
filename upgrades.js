var H5PUpgrades = H5PUpgrades || {};

H5PUpgrades['H5P.CoursePresentation'] = (function ($) {
  return {
    1: {
      2: {
        contentUpgrade: function (parameters, finished) {

          // Move slides inside presentation wrapper.
          parameters.presentation = {
            slides: parameters.slides,
            keywordListEnabled: true,
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
