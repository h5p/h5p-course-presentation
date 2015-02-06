var H5PUpgrades = H5PUpgrades || {};

H5PUpgrades['H5P.CoursePresentation'] = (function ($) {
  return {
    1: {
      3: {
        contentUpgrade: function (parameters, finished) {
          delete parameters.l10n.goHome;
          delete parameters.l10n.scrollLeft;
          delete parameters.l10n.jumpToSlide;
          delete parameters.l10n.scrollRight;
          delete parameters.l10n.goToSlide;

          parameters.l10n.fullscreen = 'fullscreen';
          parameters.l10n.exitFullscreen = 'Exit fullscreen';
          parameters.l10n.prevSlide = 'Previous slide';
          parameters.l10n.nextSlide = 'Next slide';
          parameters.l10n.currentSlide = 'Current slide';
          parameters.l10n.lastSlide = 'Last slide';
          parameters.l10n.solutionModeTitle = 'Exit solution mode';
          parameters.l10n.solutionModeText = 'Solution Mode:';
          parameters.l10n.solutionModeUnderlined = 'Close';
          parameters.l10n.summaryMultipleTaskText = 'Text when multiple tasks on a page';
          parameters.l10n.scoreMessage = 'You achieved:';
          parameters.l10n.shareFacebook = 'Share on Facebook';
          parameters.l10n.shareTwitter = 'Share on Twitter';

          finished(null, parameters);
        }
      }
    }
  };
})(H5P.jQuery);
