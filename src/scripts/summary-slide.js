// @ts-check

import { jQuery as $, JoubelUI } from './globals';
import {addClickAndKeyboardListeners} from "./utils";

const SummarySlide = (function () {

  /**
   * Constructor for summary slide
   * @param {import("./cp").default} coursePresentation Course presentation parent of summary slide
   * @param {jQuery} $summarySlide Summary slide element
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
   * @param {number} slideNumber Summary slide that will be updated
   * @param {boolean} noJump
   */
  SummarySlide.prototype.updateSummarySlide = function (slideNumber, noJump) {
    // Validate update.
    var isValidUpdate = (this.cp.editor === undefined) && (this.$summarySlide !== undefined) && (slideNumber >= this.cp.slides.length - 1);
    var isExportSlide = (!this.cp.showSummarySlide && this.cp.hasAnswerElements);
    if (!isValidUpdate) {
      return;
    }

    // Hide keywordlist on summary slide
    if (this.cp.presentation.keywordListEnabled && this.cp.presentation.keywordListAlwaysShow) {
      this.cp.hideKeywords();
    }

    // Remove old content
    this.$summarySlide.children().remove();

    // Get scores and updated html for summary slide
    var slideScores = this.cp.getSlideScores(noJump);
    var htmlText = this.outputScoreStats(slideScores);
    $(htmlText).appendTo(this.$summarySlide);

    if (!isExportSlide) {
      // Get total scores and construct progress circle
      const totalScores = this.totalScores(slideScores);
      if (!isNaN(totalScores.totalPercentage)) {
        var totalScoreBar = JoubelUI.createScoreBar(totalScores.totalMaxScore, "", "", "");
        totalScoreBar.setScore(totalScores.totalScore);
        var $totalScore = $('.h5p-summary-total-score', this.$summarySlide);
        totalScoreBar.appendTo($totalScore);

        setTimeout(() => {
          // Announce total score
          $totalScore.append($('<div/>', {
            'aria-live': 'polite',
            'class': 'hidden-but-read',
            'html': `${this.cp.l10n.summary}. ${this.cp.l10n.accessibilityTotalScore
              .replace('@score', totalScores.totalScore)
              .replace('@maxScore', totalScores.totalMaxScore)}`
          }));
        }, 100);
      }

      // Construct twitter share score link
      if (this.cp.enableTwitterShare == true) {
        var $twitterContainer = $('.h5p-summary-twitter-message', this.$summarySlide);
        this.addTwitterScoreLinkTo($twitterContainer, totalScores);
      }

      // Construct facebook share score link
      if (this.cp.enableFacebookShare == true) {
        var $facebookContainer = $('.h5p-summary-facebook-message', this.$summarySlide);
        this.addFacebookScoreLinkTo($facebookContainer, totalScores);
      }

      // Update slide links
      var links = this.$summarySlide.find('.h5p-td > .h5p-slide-link');
      links.each((index, $slideLink) => {
        $slideLink.click((event) => {
          this.cp.jumpToSlide(parseInt($slideLink.data('slide'), 10) - 1);
          event.preventDefault();
        });
      });
    }

    // Button container ref
    var $summaryFooter = $('.h5p-summary-footer', this.$summarySlide);

    // Show solutions button
    if (this.cp.showSummarySlideSolutionButton) {
      JoubelUI.createButton({
        'class': 'h5p-show-solutions',
        html: this.cp.l10n.showSolutions,
        on: {
          click: () => {
            // Enable solution mode
            this.toggleSolutionMode(true);
          }
        },
        appendTo: $summaryFooter
      });
    }

    // Show solutions button
    if (this.cp.showSummarySlideRetryButton) {
      JoubelUI.createButton({
        'class': 'h5p-cp-retry-button',
        html: this.cp.l10n.retry,
        on: {
          click: () => {
            this.cp.resetTask();
            // event.preventDefault();
          }
        },
        appendTo: $summaryFooter
      });
    }

    // Only make export button if there is an export area in CP
    if (this.cp.hasAnswerElements) {
      JoubelUI.createButton({
        'class': 'h5p-eta-export',
        html: this.cp.l10n.exportAnswers,
        on: {
          click: () => {
            H5P.ExportableTextArea.Exporter.run(this.cp.slides, this.cp.elementInstances);
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
  if (slideScores === undefined) {
    this.$summarySlide.addClass('h5p-summary-only-export');
    return '<div class="h5p-summary-footer"></div>';
  }

  let totalScore = 0;
  let totalMaxScore = 0;
  let tableRows = '';
  let slidePercentageScore = 0;
  let slideDescription = '';

  for (let i = 0; i < slideScores.length; i += 1) {
    slideDescription = this.getSlideDescription(slideScores[i]);

    // Get percentage score for slide
    slidePercentageScore = Math.round(
      (slideScores[i].score / slideScores[i].maxScore) * 100,
    );

    if (isNaN(slidePercentageScore)) {
      slidePercentageScore = 0;
    }

    const td = `<tr>
      <td class="h5p-td h5p-summary-task-title">
        <a
          href="#"
          class="h5p-slide-link"
          aria-label=" ${this.cp.l10n.slide} ${slideScores[i]
            .slide}: ${slideDescription.replace(
            /(<([^>]+)>)/gi,
            '',
          )} ${slidePercentageScore}%"
          data-slide="${slideScores[i].slide}"
          >${this.cp.l10n.slide} ${slideScores[i].slide}:
          ${slideDescription.replace(/(<([^>]+)>)/gi, '')}</a
        >
      </td>
      <td class="h5p-td h5p-summary-score-bar">
        <p class="hidden-but-read">${slidePercentageScore}%</p>
        <p>${slideScores[i].score}<span>/</span>${slideScores[i].maxScore}</p>
      </td>
    </tr>`;

    tableRows += td;
    totalScore += slideScores[i].score;
    totalMaxScore += slideScores[i].maxScore;
  }

  // @ts-ignore
  this.cp.triggerXAPICompleted(totalScore, totalMaxScore);
  const shareResultContainer =
    this.cp.enableTwitterShare ||
    this.cp.enableFacebookShare
      ? `<span class="h5p-show-results-text">${this.cp.l10n.shareResult}</span>`
      : '';
  const twitterContainer =
    this.cp.enableTwitterShare == true
      ? `<span class="h5p-summary-twitter-message" aria-label="${this.cp.l10n.shareTwitter}"></span>`
      : '';
  const facebookContainer =
    this.cp.enableFacebookShare == true
      ? `<span class="h5p-summary-facebook-message" aria-label="${this.cp.l10n.shareFacebook}"></span>`
      : '';

  return `<div class="h5p-summary-table-holder">
      <div class="h5p-summary-table-pages">
        <table class="h5p-score-table">
          <thead>
            <tr>
              <th class="h5p-summary-table-header slide">
                ${this.cp.l10n.slide}
              </th>
              <th class="h5p-summary-table-header score">
                ${this.cp.l10n
                  .score}<span>/</span>${this.cp.l10n.total.toLowerCase()}
              </th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </div>
      <div class="h5p-summary-total-table">
        <div class="h5p-summary-social">
          ${shareResultContainer}${facebookContainer}${twitterContainer}
        </div>
        <div class="h5p-summary-total-score">
          <p>${this.cp.l10n.totalScore}</p>
        </div>
      </div>
    </div>
    <div class="h5p-summary-footer"></div>`;
  };

  SummarySlide.prototype.getSlideDescription = function (slideScoresSlide) {
    // Get task description, task name or identify multiple tasks:
    let slideDescription = "";
    let action;
    
    var slideElements = this.cp.slides[slideScoresSlide.slide - 1].elements;
    if (slideScoresSlide.indexes.length > 1) {
      slideDescription = this.cp.l10n.summaryMultipleTaskText;
    }
    else if (slideElements[slideScoresSlide.indexes[0]] !== undefined && slideElements[0]) {
      action = slideElements[slideScoresSlide.indexes[0]].action;
      if (typeof this.cp.elementInstances[slideScoresSlide.slide - 1][slideScoresSlide.indexes[0]].getTitle === 'function') {
        slideDescription = this.cp.elementInstances[slideScoresSlide.slide - 1][slideScoresSlide.indexes[0]].getTitle();
      }
      else if (action.library !== undefined && action.library) {

        // Remove major, minor version and h5p prefix, Split on uppercase
        var humanReadableLibrary = action.library
          .split(' ')[0]
          .split('.')[1]
          .split(/(?=[A-Z])/);
        var humanReadableString = '';

        // Make library human readable
        humanReadableLibrary.forEach((readableWord, index) => {

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
    // Get data from the localization object.
    var twitterShareStatement = this.cp.twitterShareStatement || '';
    var twitterHashtagList = this.cp.twitterShareHashtags || '';
    var twitterShareUrl = this.cp.twitterShareUrl || '';

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
    var twitterString = 'https://twitter.com/intent/tweet?';
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
        this.cp.l10n.shareTwitter,
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
    // Get data from the localization object.
    var facebookShareUrl = this.cp.facebookShareUrl || '';
    var facebookShareQuote = this.cp.facebookShareQuote || '';

    // Replace any placeholders with variables.
    facebookShareUrl = facebookShareUrl.replace('@currentpageurl', window.location.href);

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
        this.cp.l10n.shareFacebook,
        'width=' + popupWidth +
        ',height=' + popupHeight +
        ',left=' + leftPos +
        ',top=' + topPos);

      return false;
    });
  };

  /**
   * Gets total scores for all slides
   * @param {Array<{score: number, maxScore: number}>} slideScores
   * @returns {{totalScore: number, totalMaxScore: number, totalPercentage: number}} totalScores Total scores object
   */
  SummarySlide.prototype.totalScores = function (slideScores) {

    if (slideScores === undefined) {
      return {
        totalScore: 0,
        totalMaxScore: 0,
        totalPercentage: 0,
      };
    }

    let totalScore = 0;
    let totalMaxScore = 0;

    for (const slideScore of slideScores) {
      totalScore += slideScore.score;
      totalMaxScore += slideScore.maxScore;
    }
    
    let totalPercentage = Math.round((totalScore / totalMaxScore) * 100);
    if (Number.isNaN(totalPercentage)) {
      totalPercentage = 0;
    }

    return {
      totalScore,
      totalMaxScore,
      totalPercentage,
    };
  };

  /**
   * Toggles solution mode on/off.
   *
   * @param {boolean} enableSolutionMode Enable/disable solution mode
   */
  SummarySlide.prototype.toggleSolutionMode = function (enableSolutionMode) {
    this.cp.isSolutionMode = enableSolutionMode;
    if (enableSolutionMode) {
      // Get scores for summary slide
      const slideScores = this.cp.showSolutions();

      // Update feedback icons in solution mode
      this.cp.setProgressBarFeedback(slideScores);
      this.cp.$footer.addClass('h5p-footer-solution-mode');
      this.cp.$boxWrapper.addClass('h5p-solution-mode');
      this.setFooterSolutionModeText(this.cp.l10n.solutionModeText);
    } else {
      this.cp.$footer.removeClass('h5p-footer-solution-mode');
      this.cp.$boxWrapper.removeClass('h5p-solution-mode');
      this.setFooterSolutionModeText();
      this.cp.setProgressBarFeedback();
    }
  };

  /**
   * Sets the solution mode button text in footer.
   *
   * @param {string} [solutionModeText]
   */
  SummarySlide.prototype.setFooterSolutionModeText = function (solutionModeText) {
    if (!this.cp.$exitSolutionModeText) {
      return;
    }

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
