import { jQuery as $, JoubelUI } from './globals';
import {addClickAndKeyboardListeners} from "./utils";

const SummarySlide = (function () {

  /**
   * Constructor for summary slide
   * @param {H5P.CoursePresentation} coursePresentation Course presentation parent of summary slide
   * @param {$} $summarySlide Summary slide element
   * @constructor
   */
  function SummarySlide(coursePresentation, $summarySlide) {
    // Create summary slide if not an editor
    this.$summarySlide = $summarySlide;
    this.cp = coursePresentation;
  }

  /**
   * Updates the provided summary slide with current values.
   *
   * @param {$} $summarySlide Summary slide that will be updated
   */
  SummarySlide.prototype.updateSummarySlide = function (slideNumber, noJump) {
    var that = this;
    // Validate update.
    var isValidUpdate = (this.cp.editor === undefined) && (this.$summarySlide !== undefined) && (slideNumber >= this.cp.slides.length - 1);
    var isExportSlide = (!this.cp.showSummarySlide && this.cp.hasAnswerElements);
    if (!isValidUpdate) {
      return;
    }

    // Hide keywordlist on summary slide
    if (that.cp.presentation.keywordListEnabled && that.cp.presentation.keywordListAlwaysShow) {
      that.cp.hideKeywords();
    }

    // Remove old content
    this.$summarySlide.children().remove();

    // Get scores and updated html for summary slide
    var slideScores = that.cp.getSlideScores(noJump);
    var htmlText = that.outputScoreStats(slideScores);
    $(htmlText).appendTo(that.$summarySlide);

    if (!isExportSlide) {
      // Get total scores and construct progress circle
      var totalScores = that.totalScores(slideScores);
      if (!isNaN(totalScores.totalPercentage)) {
        var totalScoreBar = JoubelUI.createScoreBar(totalScores.totalMaxScore, "", "", "");
        totalScoreBar.setScore(totalScores.totalScore);
        totalScoreBar.appendTo($('.h5p-summary-total-score', that.$summarySlide));
      }

      // Construct twitter share score link
      if (that.cp.enableTwitterShare == true) {
        var $twitterContainer = $('.h5p-summary-twitter-message', that.$summarySlide);
        this.addTwitterScoreLinkTo($twitterContainer, totalScores);
      }

      // Construct facebook share score link
      if (that.cp.enableFacebookShare == true) {
        var $facebookContainer = $('.h5p-summary-facebook-message', that.$summarySlide);
        this.addFacebookScoreLinkTo($facebookContainer, totalScores);
      }

      // Construct google share score link
      if (that.cp.enableGoogleShare == true) {
        var $googleContainer = $('.h5p-summary-google-message', that.$summarySlide);
        this.addGoogleScoreLinkTo($googleContainer);
      }

      // Update slide links
      var links = that.$summarySlide.find('.h5p-td > .h5p-slide-link');
      links.each(function () {
        var slideLink = $(this);
        slideLink.click(function (event) {
          that.cp.jumpToSlide(parseInt(slideLink.data('slide'), 10) - 1);
          event.preventDefault();
        });
      });
    }

    // Button container ref
    var $summaryFooter = $('.h5p-summary-footer', that.$summarySlide);

    // Show solutions button
    JoubelUI.createButton({
      'class': 'h5p-show-solutions',
      html: that.cp.l10n.showSolutions,
      on: {
        click: function () {
          // Enable solution mode
          that.toggleSolutionMode(true);
        }
      },
      appendTo: $summaryFooter
    });

    // Show solutions button
    JoubelUI.createButton({
      'class': 'h5p-cp-retry-button',
      html: that.cp.l10n.retry,
      on: {
        click: function () {
          that.cp.resetTask();
          // event.preventDefault();
        }
      },
      appendTo: $summaryFooter
    });

    // Only make export button if there is an export area in CP
    if (that.cp.hasAnswerElements) {
      JoubelUI.createButton({
        'class': 'h5p-eta-export',
        html: that.cp.l10n.exportAnswers,
        on: {
          click: function () {
            H5P.ExportableTextArea.Exporter.run(that.cp.slides, that.cp.elementInstances);
            // event.preventDefault();
          }
        },
        appendTo: $summaryFooter
      });
    }
  };

  /**
   * Gets html for summary slide.
   *
   * @param slideScores Scores for all pages
   * @returns {string} html
   */
  SummarySlide.prototype.outputScoreStats = function (slideScores) {
    var self = this;
    if (slideScores === undefined) {
      this.$summarySlide.addClass('h5p-summary-only-export');
      return '<div class="h5p-summary-footer"></div>';
    }
    var that = this;
    var totalScore = 0;
    var totalMaxScore = 0;
    var tds = ''; // For saving the main table rows
    var i;
    var slidePercentageScore = 0;
    var slideDescription = '';
    for (i = 0; i < slideScores.length; i += 1) {
      slideDescription = self.getSlideDescription(slideScores[i]);

      // Get percentage score for slide
      slidePercentageScore = Math.round((slideScores[i].score / slideScores[i].maxScore) * 100);
      if (isNaN(slidePercentageScore)) {
        slidePercentageScore = 0;
      }
      tds +=
        '<tr>' +
          '<td class="h5p-td h5p-summary-task-title">' +
            '<a href="#" class="h5p-slide-link"  aria-label=" ' +
              that.cp.l10n.slide + ' ' + slideScores[i].slide + ': ' + (slideDescription.replace(/(<([^>]+)>)/ig, "")) + ' ' +
              slidePercentageScore + '%' +
              '" data-slide="' +
              slideScores[i].slide + '">' + that.cp.l10n.slide + ' ' + slideScores[i].slide + ': ' + (slideDescription.replace(/(<([^>]+)>)/ig, "")) +
            '</a>' +
          '</td>' +
          '<td class="h5p-td h5p-summary-score-bar">' +
            '<p class="hidden-but-read">' + slidePercentageScore + '%' + '</p>' +
            '<p>' + slideScores[i].score + '<span>/</span>' + slideScores[i].maxScore + '</p>' +
          '</td>' +
        '</tr>';
      totalScore += slideScores[i].score;
      totalMaxScore += slideScores[i].maxScore;
    }

    that.cp.triggerXAPICompleted(totalScore, totalMaxScore);

    var percentScore = Math.round((totalScore / totalMaxScore) * 100);

    var twitterContainer = (that.cp.enableTwitterShare == true) ? '<span class="h5p-summary-twitter-message" aria-label="Share on Twitter"></span>': '';
    var facebookContainer = (that.cp.enableFacebookShare == true) ? '<span class="h5p-summary-facebook-message" aria-label="Share on Facebook"></span>': '';
    var googleContainer = (that.cp.enableGoogleShare == true) ? '<span class="h5p-summary-google-message" aria-label="Share on Google Plus"></span>' : '';

    var html =
      '<div class="h5p-summary-table-holder">' +
        '<div class="h5p-table-title-right">' +
          that.cp.l10n.score + '<span>/</span>' + that.cp.l10n.total +
        '</div>' +
        '<div class="h5p-summary-table-pages">' +
          '<table class="h5p-score-table">' +
            '<tbody>' + tds + '</tbody>' +
          '</table>' +
        '</div>' +
        '<div class="h5p-summary-total-table">' +
          '<p class="hidden-but-read">' + percentScore + '%' + '</p>' +
          '<div class="h5p-summary-social">' +
            '<span class="h5p-show-results-text">' + that.cp.l10n.shareResult + '</span>' + 
            facebookContainer +
            twitterContainer +
            googleContainer +
          '</div>' +
          '<div class="h5p-summary-total-score">' +
            '<p>' + that.cp.l10n.totalScore + '</p>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="h5p-summary-footer">' +
      '</div>';

    return html;
  };

  SummarySlide.prototype.getSlideDescription = function (slideScoresSlide) {
    var self = this;

    // Get task description, task name or identify multiple tasks:
    var slideDescription, action;
    var slideElements = self.cp.slides[slideScoresSlide.slide - 1].elements;
    if (slideScoresSlide.indexes.length > 1) {
      slideDescription = self.cp.l10n.summaryMultipleTaskText;
    } else if (slideElements[slideScoresSlide.indexes[0]] !== undefined && slideElements[0]) {
      action = slideElements[slideScoresSlide.indexes[0]].action;
      if (typeof self.cp.elementInstances[slideScoresSlide.slide - 1][slideScoresSlide.indexes[0]].getTitle === 'function') {
        slideDescription = self.cp.elementInstances[slideScoresSlide.slide - 1][slideScoresSlide.indexes[0]].getTitle();
      } else if (action.library !== undefined && action.library) {

        // Remove major, minor version and h5p prefix, Split on uppercase
        var humanReadableLibrary = action.library
          .split(' ')[0]
          .split('.')[1]
          .split(/(?=[A-Z])/);
        var humanReadableString = '';

        // Make library human readable
        humanReadableLibrary.forEach(function (readableWord, index) {

          // Make sequential words lowercase
          if (index !== 0) {
            readableWord = readableWord.toLowerCase();
          }
          humanReadableString += readableWord;

          // Add space between words
          if (index <= humanReadableLibrary.length - 1) {
            humanReadableString += ' ';
          }
        });
        slideDescription = humanReadableString;
      }
    }
    return slideDescription;
  };

  /**
   * Adds a link to the given container which will link achieved score to twitter.
   *
   * @param {jQuery} $twitterContainer Container that should hold the twitter link.
   * @param {Object} scores totalScores object to pull data from.
   */
  SummarySlide.prototype.addTwitterScoreLinkTo = function ($twitterContainer, scores) {
    var that = this;

    // Get data from the localization object.
    var twitterShareStatement = that.cp.twitterShareStatement || '';
    var twitterHashtagList = that.cp.twitterShareHashtags || '';
    var twitterShareUrl = that.cp.twitterShareUrl || '';

    // Replace any placeholders with variables.
    twitterShareUrl = twitterShareUrl.replace('@currentpageurl', window.location.href);
    twitterShareStatement = twitterShareStatement
      .replace('@score', scores.totalScore)
      .replace('@maxScore', scores.totalMaxScore)
      .replace('@percentage', scores.totalPercentage + '%')
      .replace('@currentpageurl', window.location.href);

    // Parse data from the localization object.
    twitterHashtagList = twitterHashtagList.trim().replace(' ', '');

    // Encode components that may contain breaking characters.
    twitterShareStatement = encodeURIComponent(twitterShareStatement);
    twitterHashtagList = encodeURIComponent(twitterHashtagList);
    twitterShareUrl = encodeURIComponent(twitterShareUrl);

    // Add query strings to the URL based on settings.
    var twitterString = 'http://twitter.com/intent/tweet?';
    twitterString += (twitterShareStatement.length > 0) ? "text="+twitterShareStatement+"&" : "";
    twitterString += (twitterShareUrl.length > 0) ? "url="+twitterShareUrl+"&" : "";
    twitterString += (twitterHashtagList.length > 0) ? "hashtags="+twitterHashtagList : "";

    var leftPos = (window.innerWidth / 2);
    var topPos = (window.innerHeight / 2);
    var popupWidth = 800;
    var popupHeight = 300;

    // Create the new Twitter window.
    $twitterContainer.attr('tabindex', '0')
      .attr('role', 'button');

    addClickAndKeyboardListeners($twitterContainer, () => {
      window.open(twitterString,
        that.cp.l10n.shareTwitter,
        'width=' + popupWidth +
        ',height=' + popupHeight +
        ',left=' + leftPos +
        ',top=' + topPos);
      return false;
    });
  };

  /**
   * Adds a link to the given container which will link achieved score to facebook.
   *
   * @param {jQuery} $facebookContainer Container that should hold the facebook link.
   * @param {Object} scores totalScores object to pull data from.
   */
  SummarySlide.prototype.addFacebookScoreLinkTo = function ($facebookContainer, scores) {
    var that = this;

    // Get data from the localization object.
    var facebookShareUrl = that.cp.facebookShareUrl || '';
    var facebookShareQuote = that.cp.facebookShareQuote || '';

    // Replace any placeholders with variables.
    facebookShareUrl = facebookShareUrl.replace('@currentpageurl', window.location.href)
      .replace("@percentage", scores.totalPercentage + '%')
      .replace('@score', scores.totalScore)
      .replace('@maxScore', scores.totalMaxScore);

    facebookShareQuote = facebookShareQuote.replace('@currentpageurl', window.location.href)
    .replace("@percentage", scores.totalPercentage + '%')
    .replace('@score', scores.totalScore)
    .replace('@maxScore', scores.totalMaxScore);

    // Parse data from the localization object.
    facebookShareUrl = encodeURIComponent(facebookShareUrl);
    facebookShareQuote = encodeURIComponent(facebookShareQuote);

    // Add query strings to the URL based on settings.
    var facebookUrl = 'https://www.facebook.com/sharer/sharer.php?';
    facebookUrl += (facebookShareUrl.length > 0) ? "u="+facebookShareUrl+"&" : "";
    facebookUrl += (facebookShareQuote.length > 0) ? "quote="+facebookShareQuote : '';

    var popupWidth = 800;
    var popupHeight = 300;
    var leftPos = (window.innerWidth / 2);
    var topPos = (window.innerHeight / 2);

    // Create the new Facebook window.
    $facebookContainer.attr('tabindex', '0')
      .attr('role', 'button');

    addClickAndKeyboardListeners($facebookContainer, () => {
      window.open(facebookUrl,
        that.cp.l10n.shareFacebook,
        'width=' + popupWidth +
        ',height=' + popupHeight +
        ',left=' + leftPos +
        ',top=' + topPos);

      return false;
    });
  };

  /**
   * Adds a link to the given container which will link achieved score to google.
   *
   * @param {jQuery} $googleContainer Container that should hold the google link.
   */
  SummarySlide.prototype.addGoogleScoreLinkTo = function ($googleContainer) {
    var that = this;

    // Get data from the localization object.
    var googleShareUrl = that.cp.googleShareUrl || '';

    // Replace any placeholders with variables.
    googleShareUrl = googleShareUrl.replace('@currentpageurl', window.location.href);

    // Parse data from the localization object.
    googleShareUrl = encodeURIComponent(googleShareUrl);

    // Add query strings to the URL based on settings.
    var googleUrl = "https://plus.google.com/share?";
    googleUrl += (googleShareUrl.length > 0) ? "url="+googleShareUrl+"" : "";

    var popupWidth = 401;
    var popupHeight = 437;
    var leftPos = (window.innerWidth / 2);
    var topPos = (window.innerHeight / 2);

    // Create the new Google+ window.
    $googleContainer.attr('tabindex', '0')
      .attr('role', 'button');

    addClickAndKeyboardListeners($googleContainer, () => {
      window.open(googleUrl,
        that.cp.l10n.shareGoogle,
        'width=' + popupWidth +
        ',height=' + popupHeight +
        ',left=' + leftPos +
        ',top=' + topPos);
      return false;
    });
  };

  /**
   * Gets total scores for all slides
   * @param {Array} slideScores
   * @returns {{totalScore: number, totalMaxScore: number, totalPercentage: number}} totalScores Total scores object
   */
  SummarySlide.prototype.totalScores = function (slideScores) {
    if (slideScores === undefined) {
      return {
        totalScore: 0,
        totalMaxScore: 0,
        totalPercentage: 0
      };
    }
    var totalScore = 0;
    var totalMaxScore = 0;
    var i;
    for (i = 0; i < slideScores.length; i += 1) {
      // Get percentage score for slide
      totalScore += slideScores[i].score;
      totalMaxScore += slideScores[i].maxScore;
    }

    var totalPercentage = Math.round((totalScore / totalMaxScore) * 100);
    if (isNaN(totalPercentage)) {
      totalPercentage = 0;
    }

    return {
      totalScore: totalScore,
      totalMaxScore: totalMaxScore,
      totalPercentage: totalPercentage
    };
  };

  /**
   * Toggles solution mode on/off.
   *
   * @params {Boolean} enableSolutionMode Enable/disable solution mode
   */
  SummarySlide.prototype.toggleSolutionMode = function (enableSolutionMode) {
    var that = this;

    this.cp.isSolutionMode = enableSolutionMode;
    if (enableSolutionMode) {
      // Get scores for summary slide
      var slideScores = that.cp.showSolutions();

      // Update feedback icons in solution mode
      this.cp.setProgressBarFeedback(slideScores);
      this.cp.$footer.addClass('h5p-footer-solution-mode');
      this.setFooterSolutionModeText(this.cp.l10n.solutionModeText);
    }
    else {
      this.cp.$footer.removeClass('h5p-footer-solution-mode');
      this.setFooterSolutionModeText();
      this.cp.setProgressBarFeedback();
    }
  };

  /**
   * Sets the solution mode button text in footer.
   *
   * @param solutionModeText
   */
  SummarySlide.prototype.setFooterSolutionModeText = function (solutionModeText) {
    if (solutionModeText !== undefined && solutionModeText) {
      this.cp.$exitSolutionModeText.html(solutionModeText);
    }
    else if (this.cp.$exitSolutionModeText) {
      this.cp.$exitSolutionModeText.html('');
    }
  };

  return SummarySlide;
})();

export default SummarySlide;
