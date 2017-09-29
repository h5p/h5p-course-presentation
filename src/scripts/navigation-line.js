import Printer from './printer';
import Controls from 'h5p-lib-controls/src/scripts/controls';
import UIKeyboard from 'h5p-lib-controls/src/scripts/ui/keyboard';
import { defaultValue, addClickAndKeyboardListeners } from './utils';


/**
 * @class
 */
const NavigationLine = (function ($) {
  function NavigationLine(coursePresentation) {
    this.cp = coursePresentation;
    this.initProgressbar(this.cp.slidesWithSolutions);
    this.initFooter();
    this.initTaskAnsweredListener();
    this.toggleNextAndPreviousButtonDisabled(this.cp.getCurrentSlideIndex());
  }

  /**
   * Initializes xAPI event listener, updates progressbar when a task is changed.
   */
  NavigationLine.prototype.initTaskAnsweredListener = function () {
    var that = this;

    this.cp.elementInstances.forEach(function (element) {
      element.forEach(function (elementInstance) {
        if (elementInstance.on !== undefined) {
          elementInstance.on('xAPI', function (event) {
            var shortVerb = event.getVerb();
            if (shortVerb === 'interacted') {
              const hasAnswered = that.slideHasAnsweredTask(that.cp.currentSlideIndex);
              that.setTaskAnswered(that.cp.currentSlideIndex, hasAnswered);
            }
            else if (shortVerb === 'completed') {
              event.setVerb('answered');
            }
            if (event.data.statement.context.extensions === undefined) {
              event.data.statement.context.extensions = {};
            }
            event.data.statement.context.extensions['http://id.tincanapi.com/extension/ending-point'] = that.cp.currentSlideIndex + 1;
          });
        }
      });
    });
  };

  /**
   * Initialize progress bar
   */
  NavigationLine.prototype.initProgressbar = function (slidesWithSolutions) {
    const that = this;

    this.progresbarKeyboardControls = new Controls([new UIKeyboard()]);
    this.progresbarKeyboardControls.negativeTabIndexAllowed = true;
    this.progresbarKeyboardControls.on('select', event => {
      that.displaySlide($(event.element).data('slideNumber'));
    });

    var supportsHover = true;
    if (navigator.userAgent.match(/iPad|iPod|iPhone/i) !== null) {
      supportsHover = false;
    }

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
    };

    const mouseenterProgressbar = function (event) {
      that.createProgressbarPopup(event, $(this));
    };

    const mouseleaveProgressbar = function () {
      that.removeProgressbarPopup();
    };

    for (let i = 0; i < this.cp.slides.length; i += 1) {
      const slide = this.cp.slides[i];
      const progressbarPartTitle = this.createSlideTitle(i);

      // create list item
      const $li = $('<li>', {
        'class': 'h5p-progressbar-part'
      })
        .appendTo(that.cp.$progressbar);

      // create link
      const $link = $('<a>', {
        href: '#',
        html: '<span class="h5p-progressbar-part-title hidden-but-read">' + progressbarPartTitle + '</span>',
        tabindex: '-1'
      }).data('slideNumber', i)
        .data('keyword', progressbarPartTitle)
        .click(clickProgressbar)
        .appendTo($li);

      this.progresbarKeyboardControls.addElement($link.get(0));

      // Add hover effect if not an ipad or iphone.
      if (supportsHover) {
        $link
          .mouseenter(mouseenterProgressbar)
          .mouseleave(mouseleaveProgressbar);
      }

      if (this.isSummarySlide(i)) {
        $li.addClass('progressbar-part-summary-slide');
      }

      if (i === 0) {
        $li.addClass('h5p-progressbar-part-show h5p-progressbar-part-selected');
      }

      that.cp.progressbarParts.push($li);

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
   * Displays a slide
   *
   * @param {number} index
   */
  NavigationLine.prototype.displaySlide = function (index) {
    const oldIndex = this.cp.getCurrentSlideIndex();

    // update current progress task
    this.updateSlideTitle(index, { isCurrent: true });

    // update old progress task
    this.updateSlideTitle(oldIndex, { isCurrent: false });

    // navigate to slide
    this.cp.jumpToSlide(index);

    // toggle next and prev buttons
    this.toggleNextAndPreviousButtonDisabled(index);
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
      && this.cp.showSummarySlide)
  };

  /**
   * Creates the progressbar popup
   *
   * @param {Event} event
   * @param {jQuery} $parent
   */
  NavigationLine.prototype.createProgressbarPopup = function (event, $parent) {
    var progressbarTitle = $parent.data('keyword');

    if (this.$progressbarPopup === undefined) {
      this.$progressbarPopup = H5P.jQuery('<div/>', {
        'class': 'h5p-progressbar-popup',
        'html': progressbarTitle
      }).appendTo($parent);
    }
    else {
      this.$progressbarPopup.appendTo($parent);
      this.$progressbarPopup.html(progressbarTitle);
    }

    var availableWidth = this.cp.$container.width();
    var popupWidth = this.$progressbarPopup.outerWidth();
    var parentWidth = $parent.outerWidth();
    var leftPos = ($parent.position().left + (parentWidth / 2) - (popupWidth / 2));

    // default behavior, this will allow it to automatically center
    var left = '';
    // If the popup overflows beyond the right bound of container
    if ((leftPos + popupWidth) >= availableWidth) {
      // Get the overflow amount in pixels
      var overflow = leftPos + popupWidth - availableWidth;
      // Get the difference between the pop up and the progress bar 'part'
      var diff = (popupWidth/2) - (parentWidth/2);
      // Reset the left position
      left = 1 - overflow - diff + 'px'; // +1 due to rounding in CSS
    }
    // If the popup overflows beyond the left bound of container
    else if (leftPos < 0) {
      left = '0';
    }

    this.$progressbarPopup.css('left', left);
  };

  NavigationLine.prototype.removeProgressbarPopup = function () {
    if (this.$progressbarPopup !== undefined) {
      this.$progressbarPopup.remove();
    }
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
      'title': this.cp.l10n.showKeywords,
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
      'title': this.cp.l10n.prevSlide,
      'role': 'button',
      'tabindex': '-1',
      'aria-disabled': 'true'
    }).appendTo($centerFooter);

    addClickAndKeyboardListeners(this.cp.$prevSlideButton, () => this.cp.previousSlide());

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
      'title': this.cp.l10n.nextSlide,
      'role': 'button',
      'tabindex': '0'
    }).appendTo($centerFooter);

    addClickAndKeyboardListeners(this.cp.$nextSlideButton, () => this.cp.nextSlide());

    // *********************
    // Right footer elements
    // *********************

    // Do not add these buttons in editor mode
    if (this.cp.editor === undefined) {

      // Exit solution mode button
      this.cp.$exitSolutionModeButton = $('<div/>', {
        'class': 'h5p-footer-exit-solution-mode',
        'title': this.cp.l10n.solutionModeTitle,
        'tabindex': '0'
      }).appendTo($rightFooter);

      addClickAndKeyboardListeners(this.cp.$exitSolutionModeButton, () => that.cp.jumpToSlide(that.cp.slides.length - 1));

      if (this.cp.enablePrintButton && Printer.supported()) {
        this.cp.$printButton = $('<div/>', {
          'class': 'h5p-footer-button h5p-footer-print',
          'title': this.cp.l10n.printTitle,
          'role': 'button',
          'tabindex': '0'
        }).appendTo($rightFooter);

        addClickAndKeyboardListeners(this.cp.$printButton, () => that.openPrintDialog());
      }

      if (H5P.fullscreenSupported) {
        // Toggle full screen button
        this.cp.$fullScreenButton = $('<div/>', {
          'class': 'h5p-footer-button h5p-footer-toggle-full-screen',
          'title': this.cp.l10n.fullscreen,
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
      } else {
        that.cp.progressbarParts[i].removeClass('h5p-progressbar-part-show');
      }
    }

    that.cp.progressbarParts[slideNumber]
      .addClass("h5p-progressbar-part-selected")
      .siblings().removeClass("h5p-progressbar-part-selected");

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
   * Returns true if a slide has an answered task
   *
   * @param {number} index
   * @return {boolean}
   */
  NavigationLine.prototype.slideHasAnsweredTask = function (index) {
    const tasks = this.cp.slidesWithSolutions[index] || [];

    return tasks
      .filter(task => task.getAnswerGiven !== undefined)
      .some(task => task.getAnswerGiven());
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
    this.updateSlideTitle(index, { isAnswered });
  };

  /**
   * Updates a slides title with values from state, if overrides are not provided
   *
   * @param {number} index
   * @param {boolean} [hasTask]
   * @param {boolean} [isAnswered]
   * @param {boolean} [isCurrent]
   */
  NavigationLine.prototype.updateSlideTitle = function (index, { isAnswered, hasTask, isCurrent }) {
    this.setSlideTitle(index, {
      hasTask: defaultValue(hasTask, this.slideHasInteraction(index)),
      isAnswered: defaultValue(isAnswered, this.slideHasAnsweredTask(index)),
      isCurrent: defaultValue(isCurrent, this.cp.isCurrentSlide(index))
    });
  };

  /**
   * Sets a part to be answered, or un answered
   *
   * @param {number} index
   * @param {boolean} [hasTask]
   * @param {boolean} [isAnswered]
   * @param {boolean} [isCurrent]
   */
  NavigationLine.prototype.setSlideTitle = function (index, { isAnswered = false, hasTask = false, isCurrent = false}) {
    const total =  this.cp.slides.length;
    const $part = this.cp.progressbarParts[index];
    const $partTitle = $part.find('.h5p-progressbar-part-title');
    const numberedLabel = this.cp.l10n.slideCount.replace('@index', (index + 1)).replace('@total', total) + ': ';
    const answeredLabel = this.cp.l10n[isAnswered ? 'containsCompleted' : 'containsNotCompleted'];
    const currentSlideLabel = isCurrent ? ('. ' + this.cp.l10n['currentSlide']) : '';

    if (hasTask) {
      $partTitle.html(numberedLabel + answeredLabel.replace('@slideName', this.createSlideTitle(index)) + currentSlideLabel);
    }
    else {
      $partTitle.html(numberedLabel + this.createSlideTitle(index) + currentSlideLabel);
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
    } else {
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
    var keywordString = '';
    // Get current keyword
    if (this.cp.$currentKeyword !== undefined && this.cp.$currentKeyword) {
      keywordString = this.cp.$currentKeyword.find('.h5p-keyword-title').html();
    }

    // Summary slide keyword
    if (this.cp.editor === undefined && this.cp.showSummarySlide) {
      if (slideNumber >= this.cp.slides.length - 1) {
        keywordString = this.cp.l10n.summary;
      }
    }

    // Empty string if no keyword defined
    if (keywordString === undefined) {
      keywordString = '';
    }

    // Set footer keyword
    this.cp.$keywordsButton
      .children('.current-slide-title')
      .html(keywordString);
  };

  return NavigationLine;
})(H5P.jQuery);

export default NavigationLine;