var H5P = H5P || {};
H5P.CoursePresentation = H5P.CoursePresentation || {};

H5P.CoursePresentation.NavigationLine = (function ($) {

  function NavigationLine(coursePresentation) {
    this.cp = coursePresentation;
    this.initProgressbar(this.cp.slidesWithSolutions);
    this.initFooter();
    this.initTaskAnsweredListener();
    this.$progressbarPopup;
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
            if (event.getVerb() === 'attempted') {
              that.updateProgressBar(that.cp.currentSlideIndex, that.cp.currentSlideIndex);
            }
          });
        }
      });
    });
  };

  /**
   * Initialize progress bar
   */
  NavigationLine.prototype.initProgressbar = function (slidesWithSolutions) {
    var that = this;
    var progressbarPercentage = (1 / this.cp.slides.length) * 100;

    // Remove existing progressbar
    if (this.cp.progressbarParts !== undefined && this.cp.progressbarParts) {
      this.cp.progressbarParts.forEach(function (pbPart) {
        pbPart.remove();
      });
    }

    that.cp.progressbarParts = [];

    var i;
    var slide;
    var $progressbarPart;
    var progressbarPartTitle;

    var clickProgressbar = function (event) {
      that.cp.jumpToSlide($(this).data('slideNumber'));
      event.preventDefault();
    };

    var mouseenterProgressbar = function (event) {
      that.createProgressbarPopup(event, $(this));
    };

    var mouseleaveProgressbar = function () {
      that.removeProgressbarPopup();
    };

    for (i = 0; i < this.cp.slides.length; i += 1) {
      slide = this.cp.slides[i];

      // Generate tooltip for progress bar slides
      progressbarPartTitle = String(that.cp.l10n.slide) + (i + 1);
      if (slide.keywords !== undefined && slide.keywords.length) {
        progressbarPartTitle = slide.keywords[0].main;
      } else if (that.cp.editor === undefined && i >= this.cp.slides.length - 1 && this.cp.hasSlidesWithSolutions) {
        progressbarPartTitle = that.cp.l10n.showSolutions;
      }

      $progressbarPart = $('<div>', {
        'width': progressbarPercentage + '%',
        'class': 'h5p-progressbar-part'
      }).data('slideNumber', i)
        .data('keyword', progressbarPartTitle)
        .data('percentageWidth', progressbarPercentage)
        .mouseenter(mouseenterProgressbar)
        .mouseleave(mouseleaveProgressbar)
        .click(clickProgressbar)
        .appendTo(that.cp.$progressbar);

      if ((this.cp.editor === undefined) && (i === this.cp.slides.length - 1) && this.cp.hasSlidesWithSolutions) {
        $progressbarPart.addClass('progressbar-part-summary-slide');
      }

      $progressbarPart.attr('Title', progressbarPartTitle);

      if (i === 0) {
        $progressbarPart.addClass('h5p-progressbar-part-show');
      }
      // Create task indicator if less than 60 slides and not in editor
      if (this.cp.slides.length <= 60) {
        if (slide.elements !== undefined && slide.elements.length) {
          if (slidesWithSolutions[i] !== undefined && slidesWithSolutions[i].length) {
            $('<div>', {
              'class': 'h5p-progressbar-part-has-task'
            }).appendTo($progressbarPart);
          }
        }
      }
      that.cp.progressbarParts.push($progressbarPart);
    }
  };

  NavigationLine.prototype.createProgressbarPopup = function (event, $parent) {
    var that = this;
    var progressbarTitle = $parent.data('keyword');

    if (this.$progressbarPopup === undefined) {
      this.$progressbarPopup = H5P.jQuery('<div/>', {
        'class': 'h5p-progressbar-popup',
        'html': progressbarTitle
      }).appendTo(that.cp.$wrapper);
    } else {
      this.$progressbarPopup.appendTo(that.cp.$wrapper);
      this.$progressbarPopup.html(progressbarTitle);
    }
    var pbpartPercentWidth = $parent.data('percentageWidth');
    var leftPos = (pbpartPercentWidth * $parent.data('slideNumber')) + (pbpartPercentWidth / 2);
    var width = this.$progressbarPopup.width();
    var height = '10%';

    if ((((leftPos / 100) * this.cp.$container.width()) + width) >= this.cp.$container.width()) {
      leftPos -= (width / (this.cp.$container.width() / 100));
    }

    this.$progressbarPopup.css({
      'left': leftPos + '%',
      'bottom': height
    });
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

    var $rightFooter = $('<div/>', {
      'class': 'h5p-footer-right-adjusted'
    }).appendTo($footer);

    var $centerFooter = $('<div/>', {
      'class': 'h5p-footer-center-adjusted'
    }).appendTo($footer);

    // Left footer elements

    // Toggle keywords menu
    this.cp.$keywordsButton = $('<div/>', {
      'class': "h5p-footer-button h5p-footer-toggle-keywords",
      'title': this.cp.l10n.showKeywords,
      'role': 'button',
      'tabindex': '0'
    }).click(function (event) {
      if (!that.cp.presentation.keywordListAlwaysShow) {
        that.cp.toggleKeywords();
        event.stopPropagation();
      }
    }).keydown(function (e) { // Trigger the click event from the keyboard
      var code = e.which;
      // 32 = Space
      if (code === 32) {
        $(this).click();
        e.preventDefault();
      }
      $(this).focus();
    }).appendTo($leftFooter);

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
    $('<div/>', {
      'class': 'h5p-footer-button h5p-footer-previous-slide',
      'title': this.cp.l10n.prevSlide,
      'role': 'button',
      'tabindex': '0'
    }).click(function () {
      that.cp.previousSlide();
    }).keydown(function (e) { // Trigger the click event from the keyboard
      var code = e.which;
      // 32 = Space
      if (code === 32) {
        $(this).click();
        e.preventDefault();
      }
      $(this).focus();
    }).appendTo($centerFooter);

    // Current slide count
    this.cp.$footerCurrentSlide = $('<div/>', {
      'html': '1',
      'class': 'h5p-footer-slide-count-current',
      'title': this.cp.l10n.currentSlide
    }).appendTo($centerFooter);

    // Count delimiter, content configurable in css
    $('<div/>', {
      'html': '/',
      'class': 'h5p-footer-slide-count-delimiter'
    }).appendTo($centerFooter);

    // Max slide count
    this.cp.$footerMaxSlide = $('<div/>', {
      'html': this.cp.slides.length,
      'class': 'h5p-footer-slide-count-max',
      'title': this.cp.l10n.lastSlide
    }).appendTo($centerFooter);

    // Next slide
    $('<div/>', {
      'class': 'h5p-footer-button h5p-footer-next-slide',
      'title': this.cp.l10n.nextSlide,
      'role': 'button',
      'tabindex': '0'
    }).click(function () {
      that.cp.nextSlide();
    }).keydown(function (e) { // Trigger the click event from the keyboard
      var code = e.which;
      // 32 = Space
      if (code === 32) {
        $(this).click();
        e.preventDefault();
      }
      $(this).focus();
    }).appendTo($centerFooter);

    // Right footer elements

    // Toggle full screen button
    this.cp.$fullScreenButton = $('<div/>', {
      'class': 'h5p-footer-button h5p-footer-toggle-full-screen',
      'title': this.cp.l10n.fullscreen,
      'role': 'button',
      'tabindex': '0'
    }).click(function () {
      that.cp.toggleFullScreen();
    }).keydown(function (e) { // Trigger the click event from the keyboard
      var code = e.which;
      // 32 = Space
      if (code === 32) {
        $(this).click();
        e.preventDefault();
      }
      $(this).focus();
    });

    // Do not allow fullscreen in editor mode
    if (this.cp.editor === undefined) {
      this.cp.$fullScreenButton.appendTo($rightFooter);
    }

    // Exit solution mode button
    this.cp.$exitSolutionModeButton = $('<div/>', {
      'class': 'h5p-footer-exit-solution-mode',
      'title': this.cp.l10n.solutionModeTitle,
      'tabindex': '0'
    }).click(function (event) {
      that.cp.jumpToSlide(that.cp.slides.length - 1);
      event.preventDefault();
    }).keydown(function (e) { // Trigger the click event from the keyboard
      var code = e.which;
      // 32 = Space
      if (code === 32) {
        $(this).click();
        e.preventDefault();
      }
      $(this).focus();
    });

    // Solution mode elements
    this.cp.$exitSolutionModeText = $('<div/>', {
      'html': '',
      'class': 'h5p-footer-exit-solution-mode-text'
    }).appendTo(this.cp.$exitSolutionModeButton);

    this.cp.$exitSolutionModeUnderlined = $('<div/>', {
      'html': '',
      'class': 'h5p-footer-exit-solution-mode-underlined'
    }).appendTo(this.cp.$exitSolutionModeButton);
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

    if (prevSlideNumber === undefined) {
      that.cp.progressbarParts.forEach(function (pbPart) {
        pbPart.children('.h5p-progressbar-part-has-task').removeClass('h5p-answered');
      });
      return;
    }
    // Don't mark answers as answered if in solution mode or editor mode.
    if (solutionMode || (that.cp.editor !== undefined)) {
      return;
    }

    // Updates previous slide answer.
    var answered = true;
    if (this.cp.slidesWithSolutions[prevSlideNumber] !== undefined && this.cp.slidesWithSolutions[prevSlideNumber]) {
      this.cp.slidesWithSolutions[prevSlideNumber].forEach(function (slideTask) {
        if (slideTask.getAnswerGiven !== undefined) {
          if (!slideTask.getAnswerGiven()) {
            answered = false;
          }
        }
      });
    }

    if (answered) {
      that.cp.progressbarParts[prevSlideNumber]
        .children('.h5p-progressbar-part-has-task')
        .addClass('h5p-answered');
    }
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

    // Hide exit solution mode button on summary slide
    if (this.cp.isSolutionMode) {
      this.cp.$exitSolutionModeButton.detach();
      if (slideNumber + 1 !== this.cp.slides.length) {
        this.cp.$exitSolutionModeButton.insertBefore(this.cp.$fullScreenButton);
      }
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
    var keywordString = '';
    // Get current keyword
    if (this.cp.$currentKeyword !== undefined && this.cp.$currentKeyword) {
      keywordString = this.cp.$currentKeyword.find('span').html();
    }

    // Empty string if no keyword defined
    if (keywordString === undefined) {
      keywordString = '';
    }

    // Summary slide keyword
    if (this.cp.editor === undefined) {
      if (slideNumber >= this.cp.slides.length - 1) {
        keywordString = this.cp.l10n.showSolutions;
      }
    }

    // Set footer keyword
    this.cp.$keywordsButton.html(keywordString);
  };

  return NavigationLine;
})(H5P.jQuery);
