import Printer from './printer';
import Controls from 'h5p-lib-controls/src/scripts/controls';
import UIKeyboard from 'h5p-lib-controls/src/scripts/ui/keyboard';
import { defaultValue, contains, isFunction, addClickAndKeyboardListeners, isIOS } from './utils';

/**
 * Enum indicating which state a navigation bar part is in
 * @enum {string}
 */
const answeredState = {
  NO_INTERACTIONS: 'none',
  NOT_ANSWERED: 'not-answered',
  ANSWERED: 'answered',
  CORRECT: 'has-only-correct',
  INCORRECT: 'has-incorrect'
};

/**
 * @class
 */
const NavigationLine = (function ($) {
  function NavigationLine(coursePresentation) {
    this.cp = coursePresentation;

    /**
     * Mapping for labels indicating the answered state of a part
     * @property {Object.<answeredState, string>} answeredLabels
     */
    this.answeredLabels = {
      [answeredState.NOT_ANSWERED]: this.cp.l10n.containsNotCompleted + '.',
      [answeredState.ANSWERED]: this.cp.l10n.containsCompleted + '.',
      [answeredState.CORRECT]: this.cp.l10n.containsOnlyCorrect + '.',
      [answeredState.INCORRECT]: this.cp.l10n.containsIncorrectAnswers + '.',
      [answeredState.NO_INTERACTIONS]: '',
    };

    this.initProgressbar(this.cp.slidesWithSolutions);
    this.initFooter();
    this.initTaskAnsweredListener();
    this.toggleNextAndPreviousButtonDisabled(this.cp.getCurrentSlideIndex());
  }

  /**
   * Initializes xAPI event listener, updates progressbar when a task is changed.
   */
  NavigationLine.prototype.initTaskAnsweredListener = function () {
    this.cp.elementInstances.forEach((slide, index) => {
      slide
        .filter(interaction => isFunction(interaction.on))
        .forEach(interaction => {
          interaction.on('xAPI', (event) => {
            const shortVerb = event.getVerb();

            if (contains(['interacted', 'answered', 'attempted'], shortVerb)) {
              const isAnswered = this.cp.slideHasAnsweredTask(index);
              this.setTaskAnswered(index, isAnswered);
            }
            else if (shortVerb === 'completed') {
              event.setVerb('answered');
            }

            if (event.data.statement.context.extensions === undefined) {
              event.data.statement.context.extensions = {};
            }

            event.data.statement.context.extensions['http://id.tincanapi.com/extension/ending-point'] = index + 1;
          });
        });
    });
  };

  /**
   * Initialize progress bar
   */
  NavigationLine.prototype.initProgressbar = function (slidesWithSolutions) {
    const that = this;
    const currentSlideIndex = (that.cp.previousState && that.cp.previousState.progress) || 0;

    this.progresbarKeyboardControls = new Controls([new UIKeyboard()]);
    this.progresbarKeyboardControls.negativeTabIndexAllowed = true;
    this.progresbarKeyboardControls.on('select', event => {
      that.displaySlide($(event.element).data('slideNumber'));
    });

    // if last element, prevent next progression
    this.progresbarKeyboardControls.on('beforeNextElement', event => event.index !== (event.elements.length - 1));

    // if first element, prevent previous progression
    this.progresbarKeyboardControls.on('beforePreviousElement', event => event.index !== 0);

    // Remove existing progressbar
    if (this.cp.progressbarParts !== undefined && this.cp.progressbarParts) {
      this.cp.progressbarParts.forEach(function (part) {
        that.progresbarKeyboardControls.removeElement(part.children('a').get(0));
        part.remove();
      });
    }

    that.cp.progressbarParts = [];

    const clickProgressbar = function (event) {
      event.preventDefault();
      const index = $(this).data('slideNumber');
      that.progresbarKeyboardControls.setTabbableByIndex(index);
      that.displaySlide(index);
      that.cp.focus();
    };

    for (let i = 0; i < this.cp.slides.length; i += 1) {
      const slide = this.cp.slides[i];
      const progressbarPartTitle = this.createSlideTitle(i);

      // create tab item
      const $li = $('<div>', {
        'class': 'h5p-progressbar-part',
        'id': 'progressbar-part-' + i,
        'role': 'tab',
        'aria-label': progressbarPartTitle,
        'aria-controls': 'slide-' + i,
        'aria-selected': false,
      })
        .appendTo(that.cp.$progressbar);

      // create link
      const $link = $('<a>', {
        href: '#',
        html: '<span class="h5p-progressbar-part-title hidden-but-read">' + progressbarPartTitle + '</span>',
        tabindex: '-1'
      }).data('slideNumber', i)
        .click(clickProgressbar)
        .appendTo($li);

      this.progresbarKeyboardControls.addElement($link.get(0));

      // Add hover effect if not an ipad or iphone.
      if (!isIOS) {
        // create popup
        const $popup = $('<div/>', {
          'class': 'h5p-progressbar-popup',
          'html': progressbarPartTitle,
          'aria-hidden': 'true'
        }).appendTo($li);

        $li.mouseenter(() => this.ensurePopupVisible($popup));
      }

      if (this.isSummarySlide(i)) {
        $li.addClass('progressbar-part-summary-slide');
      }


      if (i === 0) {
        $li.addClass('h5p-progressbar-part-show');
      }

      if (i === currentSlideIndex) {
        $li.addClass('h5p-progressbar-part-selected')
          .attr('aria-selected', true);
      }

      that.cp.progressbarParts.push($li);

      this.updateSlideTitle(i);

      // Create task indicator if less than 60 slides and not in editor
      if (this.cp.slides.length <= 60 && slide.elements && slide.elements.length > 0) {
        var hasTask = slidesWithSolutions[i] && slidesWithSolutions[i].length > 0;
        var isAnswered = !!(that.cp.previousState && that.cp.previousState.answered && that.cp.previousState.answered[i]);

        if (hasTask) {
          // Add task indicator
          $('<div>', {
            'class': 'h5p-progressbar-part-has-task'
          }).appendTo($link);

          this.setTaskAnswered(i, isAnswered);
        }
      }
    }
  };

  /**
   * Ensures that all of a popup is visible
   *
   * @param {jQuery} $popup
   */
  NavigationLine.prototype.ensurePopupVisible = function ($popup) {
    const availableWidth = this.cp.$container.width();
    const popupWidth = $popup.outerWidth();
    const popupOffsetLeft = $popup.offset().left;

    if (popupOffsetLeft < 0) {
      $popup.css('left', 0);
      $popup.css('transform', 'translateX(0)');
    }
    else if ((popupOffsetLeft + popupWidth) > availableWidth) {
      $popup.css('left', 'auto');
      $popup.css('right', 0);
      $popup.css('transform', 'translateX(0)');
    }
  };

  /**
   * Displays a slide
   *
   * @param {number} index
   */
  NavigationLine.prototype.displaySlide = function (index) {
    const self = this;

    // navigate to slide
    this.cp.jumpToSlide(index, false, function () {
      const oldIndex = self.cp.getCurrentSlideIndex();

      // update current progress task
      self.updateSlideTitle(index, { isCurrent: true });

      // update old progress task
      self.updateSlideTitle(oldIndex, { isCurrent: false });

      // toggle next and prev buttons
      self.toggleNextAndPreviousButtonDisabled(index);
    });
  };

  /**
   * Generate tooltip for progress bar slides
   *
   * @param {number} slideNumber
   * @return {string}
   */
  NavigationLine.prototype.createSlideTitle = function (slideNumber) {
    const slide = this.cp.slides[slideNumber];
    const hasKeyWords = slide.keywords && slide.keywords.length > 0;

    if (hasKeyWords) {
      return slide.keywords[0].main;
    }
    else if (this.isSummarySlide(slideNumber)) {
      return this.cp.l10n.summary;
    }
    else {
      return this.cp.l10n.slide + ' ' + (slideNumber + 1);
    }
  };

  /**
   *
   * Returns true if slide with given index is summary slide
   *
   * @param {number} index
   * @return {boolean}
   */
  NavigationLine.prototype.isSummarySlide = function (index) {
    return !!((this.cp.editor === undefined)
      && (index === this.cp.slides.length - 1)
      && this.cp.showSummarySlide);
  };

  /**
   * Initialize footer.
   */
  NavigationLine.prototype.initFooter = function () {
    var that = this;
    var $footer = this.cp.$footer;

    // Inner footer adjustment containers
    var $leftFooter = $('<div/>', {
      'class': 'h5p-footer-left-adjusted'
    }).appendTo($footer);

    var $centerFooter = $('<div/>', {
      'class': 'h5p-footer-center-adjusted'
    }).appendTo($footer);

    var $rightFooter = $('<div/>', {
      'role': 'toolbar',
      'class': 'h5p-footer-right-adjusted'
    }).appendTo($footer);

    // Left footer elements

    // Toggle keywords menu
    this.cp.$keywordsButton = $('<div/>', {
      'class': "h5p-footer-button h5p-footer-toggle-keywords",
      'aria-expanded': 'false',
      'aria-label': this.cp.l10n.showKeywords,
      'role': 'button',
      'tabindex': '0',
      'html': '<span class="h5p-icon-menu"></span><span class="current-slide-title"></span>'
    }).appendTo($leftFooter);

    addClickAndKeyboardListeners(this.cp.$keywordsButton, event => {
      if (!that.cp.presentation.keywordListAlwaysShow) {
        that.cp.toggleKeywords();
        event.stopPropagation();
      }
    });

    if (this.cp.presentation.keywordListAlwaysShow || !this.cp.initKeywords) {
      this.cp.$keywordsButton.hide();
    }

    if (!this.cp.presentation.keywordListEnabled) {
      // Hide in editor when disabled.
      this.cp.$keywordsWrapper.add(this.$keywordsButton).hide();
    }

    // Update keyword for first slide.
    this.updateFooterKeyword(0);

    // Center footer elements

    // Previous slide
    this.cp.$prevSlideButton = $('<div/>', {
      'class': 'h5p-footer-button h5p-footer-previous-slide',
      'aria-label': this.cp.l10n.prevSlide,
      'role': 'button',
      'tabindex': '-1',
      'aria-disabled': 'true'
    }).appendTo($centerFooter);

    addClickAndKeyboardListeners(this.cp.$prevSlideButton, () => this.cp.previousSlide(undefined, false));

    const $slideNumbering = $('<div/>', {
      'class': 'h5p-footer-slide-count'
    }).appendTo($centerFooter);

    // Current slide count
    this.cp.$footerCurrentSlide = $('<div/>', {
      'html': '1',
      'class': 'h5p-footer-slide-count-current',
      'title': this.cp.l10n.currentSlide,
      'aria-hidden': 'true'
    }).appendTo($slideNumbering);

    this.cp.$footerCounter = $('<div/>', {
      'class': 'hidden-but-read',
      'html': this.cp.l10n.slideCount
        .replace('@index', '1')
        .replace('@total', this.cp.slides.length.toString())
    }).appendTo($centerFooter);

    // Count delimiter, content configurable in css
    $('<div/>', {
      'html': '/',
      'class': 'h5p-footer-slide-count-delimiter',
      'aria-hidden': 'true'
    }).appendTo($slideNumbering);

    // Max slide count
    this.cp.$footerMaxSlide = $('<div/>', {
      'html': this.cp.slides.length,
      'class': 'h5p-footer-slide-count-max',
      'title': this.cp.l10n.lastSlide,
      'aria-hidden': 'true'
    }).appendTo($slideNumbering);

    // Next slide
    this.cp.$nextSlideButton = $('<div/>', {
      'class': 'h5p-footer-button h5p-footer-next-slide',
      'aria-label': this.cp.l10n.nextSlide,
      'role': 'button',
      'tabindex': '0'
    }).appendTo($centerFooter);

    addClickAndKeyboardListeners(this.cp.$nextSlideButton, () => this.cp.nextSlide(undefined, false));

    // *********************
    // Right footer elements
    // *********************

    // Do not add these buttons in editor mode
    if (this.cp.editor === undefined) {

      // Exit solution mode button
      this.cp.$exitSolutionModeButton = $('<div/>', {
        'role': 'button',
        'class': 'h5p-footer-exit-solution-mode',
        'aria-label': this.cp.l10n.solutionModeTitle,
        'tabindex': '0'
      }).appendTo($rightFooter);

      addClickAndKeyboardListeners(this.cp.$exitSolutionModeButton, () => that.cp.jumpToSlide(that.cp.slides.length - 1));

      if (this.cp.enablePrintButton && Printer.supported()) {
        this.cp.$printButton = $('<div/>', {
          'class': 'h5p-footer-button h5p-footer-print',
          'aria-label': this.cp.l10n.printTitle,
          'role': 'button',
          'tabindex': '0'
        }).appendTo($rightFooter);

        addClickAndKeyboardListeners(this.cp.$printButton, () => that.openPrintDialog());
      }

      if (H5P.fullscreenSupported) {
        // Toggle full screen button
        this.cp.$fullScreenButton = $('<div/>', {
          'class': 'h5p-footer-button h5p-footer-toggle-full-screen',
          'aria-label': this.cp.l10n.fullscreen,
          'role': 'button',
          'tabindex': '0'
        });

        addClickAndKeyboardListeners(this.cp.$fullScreenButton, () => that.cp.toggleFullScreen());

        this.cp.$fullScreenButton.appendTo($rightFooter);
      }
    }

    // Solution mode text
    this.cp.$exitSolutionModeText = $('<div/>', {
      'html': '',
      'class': 'h5p-footer-exit-solution-mode-text'
    }).appendTo(this.cp.$exitSolutionModeButton);
  };


  NavigationLine.prototype.openPrintDialog = function () {
    const $h5pWrapper = $('.h5p-wrapper');
    const $dialog = Printer.showDialog(this.cp.l10n, $h5pWrapper, (printAllSlides) => {
      Printer.print(this.cp, $h5pWrapper, printAllSlides);
    });

    $dialog.children('[role="dialog"]').focus();
  };

  /**
   * Updates progress bar.
   */
  NavigationLine.prototype.updateProgressBar = function (slideNumber, prevSlideNumber, solutionMode) {
    var that = this;

    // Updates progress bar progress (blue line)
    var i;
    for (i = 0; i < that.cp.progressbarParts.length; i += 1) {
      if (slideNumber + 1 > i) {
        that.cp.progressbarParts[i].addClass('h5p-progressbar-part-show');
      }
      else {
        that.cp.progressbarParts[i].removeClass('h5p-progressbar-part-show');
      }
    }

    that.progresbarKeyboardControls.setTabbableByIndex(slideNumber);

    that.cp.progressbarParts[slideNumber]
      .addClass("h5p-progressbar-part-selected")
      .attr('aria-selected', true)
      .siblings()
        .removeClass("h5p-progressbar-part-selected")
        .attr('aria-selected', false);

    if (prevSlideNumber === undefined) {
      that.cp.progressbarParts.forEach(function (part, i) {
        that.setTaskAnswered(i, false);
      });
      return;
    }
    // Don't mark answers as answered if in solution mode or editor mode.
    if (solutionMode || (that.cp.editor !== undefined)) {
      return;
    }
  };

  /**
   * Sets a part to be answered, or un answered
   *
   * @param {number} index
   * @param {boolean} isAnswered
   */
  NavigationLine.prototype.setTaskAnswered = function (index, isAnswered) {
    const $answeredIndicator = this.cp.progressbarParts[index].find('.h5p-progressbar-part-has-task');

    $answeredIndicator.toggleClass('h5p-answered', isAnswered);
    this.updateSlideTitle(index, { state: isAnswered ? answeredState.ANSWERED : answeredState.NOT_ANSWERED });
  };

  /**
   * Updates a slides title with values from state, if overrides are not provided
   *
   * @param {number} index
   * @param {object} [config]
   * @param {answeredState} [config.state]
   * @param {boolean} [config.isCurrent]
   */
  NavigationLine.prototype.updateSlideTitle = function (index, { state } = {}) {
    this.setSlideTitle(index, {
      state: defaultValue(state, this.getAnsweredState(index)),
    });
  };

  /**
   * Sets a part to be answered, or un answered
   *
   * @param {number} index
   * @param {answeredState} [state]
   * @param {boolean} [isCurrent]
   */
  NavigationLine.prototype.setSlideTitle = function (index, { state = answeredState.NO_INTERACTIONS }) {
    const $part = this.cp.progressbarParts[index];
    const $partTitle = $part.find('.h5p-progressbar-part-title');
    const answeredLabel = this.answeredLabels[state].replace('@slideName', this.createSlideTitle(index));
    
    $partTitle.html(`${answeredLabel}`);
  };

  /**
   * Returns the answered state of a given slide
   *
   * @param {number} index
   * @return {answeredState}
   */
  NavigationLine.prototype.getAnsweredState = function (index) {
    const $part = this.cp.progressbarParts[index];
    const hasTask = this.slideHasInteraction(index);
    const isAnswered = this.cp.slideHasAnsweredTask(index);

    if (!hasTask) {
      return answeredState.NO_INTERACTIONS;
    }
    else if ($part.find('.h5p-is-correct').length > 0) {
      return answeredState.CORRECT;
    }
    else if ($part.find('.h5p-is-wrong').length > 0) {
      return answeredState.INCORRECT;
    }
    else if (isAnswered) {
      return answeredState.ANSWERED;
    }
    else {
      return answeredState.NOT_ANSWERED;
    }
  };

  /**
   * Returns true if a slide was initiated with an interaction
   *
   * @param {number} index
   * @return {boolean}
   */
  NavigationLine.prototype.slideHasInteraction = function (index) {
    return this.cp.progressbarParts[index].find('.h5p-progressbar-part-has-task').length > 0;
  };

  /**
   * Update footer with current slide data
   *
   * @param {Number} slideNumber Current slide number
   */
  NavigationLine.prototype.updateFooter = function (slideNumber) {
    // Update current slide number in footer
    this.cp.$footerCurrentSlide.html(slideNumber + 1);
    this.cp.$footerMaxSlide.html(this.cp.slides.length);

    this.cp.$footerCounter.html(this.cp.l10n.slideCount
      .replace('@index', (slideNumber + 1).toString())
      .replace('@total', this.cp.slides.length.toString()));

    // Hide exit solution mode button on summary slide
    if (this.cp.isSolutionMode && slideNumber === this.cp.slides.length - 1) {
      this.cp.$footer.addClass('summary-slide');
    }
    else {
      this.cp.$footer.removeClass('summary-slide');
    }

    this.toggleNextAndPreviousButtonDisabled(slideNumber);

    // Update keyword in footer
    this.updateFooterKeyword(slideNumber);
  };

  /**
   * Disables previous button if on the first slide,
   * and disables the next button if on the last slide
   *
   * @param {number} index
   */
  NavigationLine.prototype.toggleNextAndPreviousButtonDisabled = function (index) {
    const lastSlideIndex = this.cp.slides.length - 1;

    this.cp.$prevSlideButton.attr('aria-disabled', (index === 0).toString());
    this.cp.$nextSlideButton.attr('aria-disabled', (index === lastSlideIndex).toString());
    this.cp.$prevSlideButton.attr('tabindex', (index === 0) ? '-1' : '0');
    this.cp.$nextSlideButton.attr('tabindex', (index === lastSlideIndex) ? '-1' : '0');
  };

  /**
   * Update keyword in footer with current slide data
   *
   * @param {Number} slideNumber Current slide number
   */
  NavigationLine.prototype.updateFooterKeyword = function (slideNumber) {
    const currentSlide = this.cp.slides[slideNumber];
    let keywordString = '';

    // Get current keyword
    if (currentSlide && currentSlide.keywords && currentSlide.keywords[0]) {
      keywordString = currentSlide.keywords[0].main;
    }

    // Summary slide keyword
    if (!this.cp.isEditor() && this.cp.showSummarySlide && (slideNumber >= this.cp.slides.length - 1)) {
      keywordString = this.cp.l10n.summary;
    }

    // Set footer keyword
    this.cp.$keywordsButton
      .children('.current-slide-title')
      .html(defaultValue(keywordString, ''));
  };

  return NavigationLine;
})(H5P.jQuery);

export default NavigationLine;
