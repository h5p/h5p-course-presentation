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
  }

  /**
   * Initializes xAPI event listener, updates progressbar when a task is changed.
   */
  NavigationLine.prototype.initTaskAnsweredListener = function () {
    this.cp.elementInstances.forEach((slide, index) => {
      slide
        .filter((interaction) => isFunction(interaction.on))
        .forEach((interaction) => {
          interaction.on('xAPI', (event) => {
            const shortVerb = event.getVerb();

            if (contains(['interacted', 'answered', 'attempted'], shortVerb)) {
              const isAnswered = this.cp.slideHasAnsweredTask(index);
              this.setTaskAnswered(index, isAnswered);
            }
            else if (shortVerb === 'completed') {
              const isAnswered = this.cp.slideHasAnsweredTask(index);
              this.setTaskAnswered(index, isAnswered);
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
    this.progresbarKeyboardControls.on('select', (event) => {
      that.displaySlide($(event.element).data('slideNumber'));
    });

    // if last element, prevent next progression
    this.progresbarKeyboardControls.on('beforeNextElement', (event) => event.index !== (event.elements.length - 1));

    // if first element, prevent previous progression
    this.progresbarKeyboardControls.on('beforePreviousElement', (event) => event.index !== 0);

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

      if (this.isSummarySlide(i)) {
        $li.addClass('progressbar-part-summary-slide');
      }

      // Add hover effect if not an ipad or iphone.
      if (!isIOS) {
        H5P.Tooltip($li.get(0), { position: 'top' });
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
        var hasTask = that.cp.getSlideTasks(i).length > 0;
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

      // focus on current slide
      self.cp.focus();
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
      'class': 'h5p-footer-button h5p-footer-toggle-keywords',
      'aria-expanded': 'false',
      'aria-label': this.cp.l10n.showKeywords,
      'role': 'button',
      'tabindex': '0',
      'html': '<span class="h5p-icon-menu"></span><span class="current-slide-title"></span>'
    }).appendTo($leftFooter);

    H5P.Tooltip(this.cp.$keywordsButton.get(0));

    addClickAndKeyboardListeners(this.cp.$keywordsButton, (event) => {
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

    this.navigation = H5P.Components.Navigation({
      index: this.cp.getCurrentSlideIndex(),
      navigationLength: this.cp.slides.length,
      showDisabledButtons: true,
      variant: '3-split',
      progressType: 'text',
      className: 'h5p-cp-footer-navigation',
      texts: {
        previousButtonAriaLabel: this.cp.l10n.prevSlide,
        nextButtonAriaLabel: this.cp.l10n.nextSlide,
        textualProgress: '@current / @total',
      },
      handlePrevious: () => {
        this.cp.previousSlide(undefined, false);
        return false; // Prevent Navigation's `previous` method from being called
      },
      handleNext: () => {
        this.cp.nextSlide(undefined, false);
        return false; // Prevent Navigation's `next` method from being called
      }
    });
    $centerFooter.append(this.navigation);

    const progressText = this.navigation.querySelector('.progress-container.h5p-theme-progress');

    this.cp.footerCounterAria = document.createElement('div');
    this.cp.footerCounterAria.className = 'hidden-but-read';
    this.cp.footerCounterAria.innerHTML = this.cp.l10n.slideCount
      .replace('@index', '1')
      .replace('@total', this.cp.slides.length.toString());
    progressText.insertAdjacentElement('afterend', this.cp.footerCounterAria);

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

      H5P.Tooltip(this.cp.$exitSolutionModeButton.get(0));

      addClickAndKeyboardListeners(this.cp.$exitSolutionModeButton, () => that.cp.jumpToSlide(that.cp.slides.length - 1));

      if (this.cp.enablePrintButton && Printer.supported()) {
        this.cp.$printButton = $('<div/>', {
          'class': 'h5p-footer-button h5p-footer-print',
          'aria-label': this.cp.l10n.printTitle,
          'role': 'button',
          'tabindex': '0'
        }).appendTo($rightFooter);

        H5P.Tooltip(this.cp.$printButton.get(0));

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

        H5P.Tooltip(this.cp.$fullScreenButton.get(0), { position: 'left' });

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
  NavigationLine.prototype.updateProgressBar = function (slideNumber, prevSlideNumber, solutionMode, skipAnimation = false) {
    var that = this;

    const from = prevSlideNumber ?? 0;
    this.animateFill(from, slideNumber, skipAnimation);

    that.progresbarKeyboardControls.setTabbableByIndex(slideNumber);

    that.cp.progressbarParts[slideNumber]
      .addClass('h5p-progressbar-part-selected')
      .attr('aria-selected', true)
      .siblings()
      .removeClass('h5p-progressbar-part-selected')
      .attr('aria-selected', false);

    that.navigation.setNavigationLength(that.cp.progressbarParts.length);

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
   * Fills navigation bar segments sequentially
   * @param {number} fromIndex Current slide index
   * @param {number} toIndex Index of slide that we're navigating to
   * @param {boolean} [skipAnimation] Opt to skip animation, useful for editor updates
   */
  NavigationLine.prototype.animateFill = function (fromIndex, toIndex, skipAnimation = false) {
    const parts = this.cp.progressbarParts;
    const totalTransitionTime = 200;
    const isForward = toIndex > fromIndex;

    // NOTE: Immediately fill segments that are outside our animation
    // Sometimes updating navigation is called from slide 6->6
    // when our current slide is currently at 0. We have to handle these without
    // animation
    const low = Math.min(fromIndex, toIndex);
    const high = Math.max(fromIndex, toIndex)
    parts.forEach((part, index) => {
      part.get(0).style.setProperty('--h5p-cp-nav-bar-fill-duration', '0ms');
      if (index < low) {
        part.addClass('h5p-progressbar-part-show');
      }
      else if (index > high) {
        part.removeClass('h5p-progressbar-part-show');
      }
    });



    let animatedParts = Array.from(parts).filter((part, index) => {
      return isForward
        ? (index > fromIndex && index <= toIndex)
        : (index <= fromIndex && index > toIndex);
    });

    if (!isForward) {
      animatedParts = animatedParts.reverse();
    }

    // Divide transition speed on all parts that will transition
    let segmentTransitionDelay = totalTransitionTime / animatedParts.length;
    if (skipAnimation) {
      segmentTransitionDelay = 0;
    }
    animatedParts.forEach(part => {
      part.get(0).style.setProperty('--h5p-cp-nav-bar-fill-duration', `${segmentTransitionDelay}ms`);
    })

    animatedParts.forEach((part, idx) => {
      setTimeout(() => {
        if (isForward) {
          part.addClass('h5p-progressbar-part-show');
        }
        else {
          part.removeClass('h5p-progressbar-part-show');
        }
      }, idx * segmentTransitionDelay);
    })
  }

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
    this.cp.footerCounterAria.innerHTML = this.cp.l10n.slideCount
      .replace('@index', (slideNumber + 1).toString())
      .replace('@total', this.cp.slides.length.toString());

    this.navigation.setCurrentIndex(slideNumber);

    // Hide exit solution mode button on summary slide
    if (this.cp.isSolutionMode && slideNumber === this.cp.slides.length - 1) {
      this.cp.$footer.addClass('summary-slide');
    }
    else {
      this.cp.$footer.removeClass('summary-slide');
    }

    // Update keyword in footer
    this.updateFooterKeyword(slideNumber);
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
