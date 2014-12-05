var H5PUpgrades = H5PUpgrades || {};

H5PUpgrades['H5P.CoursePresentation'] = (function ($) {
  return {
    1: {
      2: {
        contentUpgrade: function (parameters, finished) {
          // Allows overriding of buttons for subcontent.
          parameters.override = {
            overrideButtons: true,
            overrideShowSolutionButton: parameters.showSolutions,
            overrideRetry: true
            };
          delete parameters.showSolutions;
          finished(null, parameters);
        }
      }
    }
  };
})(H5P.jQuery);