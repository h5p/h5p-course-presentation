var H5PUpgrades = H5PUpgrades || {};

H5PUpgrades['H5P.CoursePresentation'] = (function ($) {
  return {
    1: {
      2: function (parameters, finished) {
        // Allows overriding of buttons for subcontent.
        parameters.override = {
          overrideButtons: true,
          overrideShowSolutionButton: parameters.showSolutions === undefined ? true : parameters.showSolutions,
          overrideRetry: true
        };
        delete parameters.showSolutions;

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
      },
      3: function (parameters, finished) {
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
  };
})(H5P.jQuery);
