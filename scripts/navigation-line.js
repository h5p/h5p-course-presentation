var H5P = H5P || {};
H5P.CoursePresentation = H5P.CoursePresentation || {};

H5P.CoursePresentation.NavigationLine = (function ($) {

  function NavigationLine(coursePresentation) {
    this.$ = $;
    this.cp = coursePresentation;
    this.initProgressbar();
    this.initFooter();
  }

  /**
   * Initialize progress bar
   */
  NavigationLine.prototype.initProgressbar = function () {
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
    for (i = 0; i < this.cp.slides.length; i += 1) {
      slide = this.cp.slides[i];

      $progressbarPart = $('<div>', {
        'width': progressbarPercentage + '%',
        'class': 'h5p-progressbar-part'
      }).data('slideNumber', i)
        .click(function () {
          that.cp.jumpToSlide($(this).data('slideNumber'));
        }).appendTo(that.cp.$progressbar);

      // Generate tooltip for progress bar slides
      progressbarPartTitle = 'Slide ' + (i + 1);
      if (slide.keywords !== undefined && slide.keywords.length) {
        progressbarPartTitle = slide.keywords[0].main;
      }

      $progressbarPart.attr('Title', progressbarPartTitle);

      // Set tooltip for summary slide
      if (that.cp.editor === undefined && i >= this.cp.slides.length - 1) {
        $progressbarPart.attr('Title', that.cp.l10n.showSolutions);
      }

      if (i === 0) {
        $progressbarPart.addClass('h5p-progressbar-part-show');
      }

      // Create task indicator if less than 60 slides and not in editor
      if ((this.cp.slides.length <= 60) && this.cp.editor === undefined) {
        if (slide.elements !== undefined && slide.elements.length) {
          $('<div>', {
            'class': 'h5p-progressbar-part-has-task'
          }).appendTo($progressbarPart);
        }
      }
      that.cp.progressbarParts.push($progressbarPart);
    }
  };

  /**
   * Initialize footer.
   */
  NavigationLine.prototype.initFooter = function () {
    var that = this;
    var $footer = this.$footer;

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
    this.cp.$keywordsButton = $('<button/>', {
      'class': "h5p-footer-button h5p-footer-toggle-keywords",
      'title': this.cp.l10n.showKeywords
    }).click(function () {
      that.toggleKeywords();
    }).appendTo($leftFooter);

    if (this.cp.presentation.keywordListAlwaysShow) {
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
    $('<button/>', {
      'class': 'h5p-footer-button h5p-footer-previous-slide',
      'title': this.cp.l10n.prevSlide
    }).click(function () {
      that.previousSlide();
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
    $('<button/>', {
      'class': 'h5p-footer-button h5p-footer-next-slide',
      'title': this.cp.l10n.nextSlide
    }).click(function () {
      that.cp.nextSlide();
    }).appendTo($centerFooter);

    // Right footer elements

    // Toggle full screen button
    this.cp.$fullScreenButton = $('<button/>', {
      'class': 'h5p-footer-button h5p-footer-toggle-full-screen',
      'title': this.cp.l10n.fullscreen
    }).click(function () {
      that.cp.toggleFullScreen();
    });

    // Do not allow fullscreen in editor mode
    if (this.cp.editor === undefined) {
      this.cp.$fullScreenButton.appendTo($rightFooter);
    }

    // Exit solution mode button
    this.cp.$exitSolutionModeButton = $('<div/>', {
      'class': 'h5p-footer-exit-solution-mode',
      'title': this.cp.l10n.solutionModeTitle
    }).click(function () {
      that.cp.jumpToSlide(that.cp.slides.length - 1);
    }).appendTo($rightFooter);

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
  NavigationLine.prototype.updateProgressBar = function (slideNumber, prevSlideNumber) {
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
        pbPart.children('span').removeClass('h5p-answered');
      });
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