var H5P = H5P || {};

/**
 * Constructor.
 *
 * @param {object} params Start paramteres.
 * @param {int} id Content identifier
 * @param {function} editor
 *  Set if an editor is initiating this library
 * @returns {undefined} Nothing.
 */
H5P.CoursePresentation = function (params, id, editor) {
  this.$ = H5P.jQuery(this);
  this.presentation = params.presentation;
  this.slides = this.presentation.slides;
  this.contentId = id;
  this.currentSlideIndex = 0;
  // elementInstances holds the instances for elements in an array.
  this.elementInstances = [];
  this.elementsAttached = []; // Map to keep track of which slide has attached elements
  this.slidesWithSolutions = [];
  this.hasAnswerElements = false;
  this.editor = editor;

  this.l10n = H5P.jQuery.extend({
    goHome: 'Go to first slide',
    scrollLeft: 'Hold to scroll left',
    jumpToSlide: 'Jump to slide',
    scrollRight: 'Hold to scroll right',
    slide: 'Slide',
    yourScore: 'Your score',
    maxScore: 'Max score',
    goodScore: 'Congratulations! You got @percent correct!',
    okScore: 'Nice effort! You got @percent correct!',
    badScore: 'You need to work more on this. You only got @percent correct...',
    total: 'TOTAL',
    showSolutions: 'Show solutions',
    retry: 'Retry',
    exportAnswers: 'Export text',
    close: 'Close',
    hideKeywords: 'Hide keywords list',
    showKeywords: 'Show keywords list',
    goToSlide: 'Go to slide :num',
    fullscreen: 'Fullscreen',
    exitFullscreen: 'Exit fullscreen'
  }, params.l10n !== undefined ? params.l10n : {});

  if (params.override !== undefined) {
    this.overrideButtons = (params.override.overrideButtons === undefined ? false : params.override.overrideButtons);
    this.overrideShowSolutionsButton = (params.override.overrideShowSolutionButton === undefined ? false : params.override.overrideShowSolutionButton);
    this.overrideRetry = (params.override.overrideRetry === undefined ? false : params.override.overrideRetry);
  }

  this.postUserStatistics = (H5P.postUserStatistics === true);
};

/**
 * Render the presentation inside the given container.
 *
 * @param {H5P.jQuery} $container Container for this presentation.
 * @returns {undefined} Nothing.
 */
H5P.CoursePresentation.prototype.attach = function ($container) {
  var that = this;

  var html =
          '<div class="h5p-wrapper" tabindex="0">' +
          '  <div class="h5p-box-wrapper">' +
          '    <div class="h5p-presentation-wrapper">' +
          '      <div class="h5p-keywords-wrapper"></div>' +
          '      <div class="h5p-slides-wrapper"></div>' +
          '    </div>' +
          '  </div>' +
          '  <div class="h5p-progressbar"></div>' +
          '  <div class="h5p-footer"></div>' +
          '</div>';

  $container.addClass('h5p-course-presentation').html(html);

  if (window.navigator.userAgent.indexOf('MSIE 8.0') !== -1) {
    $container.find('.h5p-box-wrapper').css({
      border: '1px solid #a9a9a9',
      boxSizing: 'border-box'
    });
  }

  this.$container = $container;
  this.$wrapper = $container.children('.h5p-wrapper').focus(function () {
    that.initKeyEvents();
  }).blur(function () {
    H5P.jQuery('body').unbind('keydown', that.keydown);
    delete that.keydown;
  }).click(function (event) {
    var $target = H5P.jQuery(event.target);
    if (!$target.is('input, textarea')) {
      // Add focus to the wrapper so that it may capture keyboard events
      that.$wrapper.focus();
    }

    if (that.keywordsClicked) {
      that.keywordsClicked = false;
    }
    else if (that.presentation.keywordListEnabled &&
            !that.presentation.keywordListAlwaysShow &&
            that.presentation.keywordListAutoHide) {
      that.hideKeywords();
    }
  });

  // Get intended base width from CSS.
  this.width = parseInt(this.$wrapper.css('width'));
  this.height = parseInt(this.$wrapper.css('height'));
  this.ratio = 16/9;
  // Intended base font size cannot be read from CSS, as it might be modified
  // by mobile browsers already. (The Android native browser does this.)
  this.fontSize = 16;

  this.$boxWrapper = this.$wrapper.children('.h5p-box-wrapper');
  var $presentationWrapper = this.$boxWrapper.children('.h5p-presentation-wrapper');
  this.$slidesWrapper = $presentationWrapper.children('.h5p-slides-wrapper');
  this.$keywordsWrapper = $presentationWrapper.children('.h5p-keywords-wrapper');
  this.$progressbar = this.$wrapper.children('.h5p-progressbar');
  this.$footer = this.$wrapper.children('.h5p-footer');

  // Initialize solution mode as off.
  this.solutionMode = false;

  var initKeywords = (this.presentation.keywordListEnabled === undefined || this.presentation.keywordListEnabled === true || this.editor !== undefined);

  var $summarySlide;

  // Create summary slide if not an editor
  if (this.editor === undefined) {
    var summarySlideData = {
      elements: new Array(),
      keywords: new Array()
    };
    this.slides.push(summarySlideData);
  }

  // Create keywords html
  var keywords = '';
  var foundKeywords = false;
  for (var i = 0; i < this.slides.length; i++) {
    var slide = this.slides[i];
    var $slide = H5P.jQuery(H5P.CoursePresentation.createSlide(slide)).appendTo(this.$slidesWrapper);
    var first = i === 0;
    var last = false;

    //Add summary slide if not in editor
    if (this.editor === undefined) {
      last = i === this.slides.length - 1;
    }

    if (first) {
      this.$current = $slide.addClass('h5p-current');
    }

    this.addElements(slide, $slide, i);

    if (!foundKeywords && slide.keywords !== undefined && slide.keywords.length) {
      foundKeywords = true;
    }
    if (initKeywords) {
      keywords += this.keywordsHtml(slide.keywords, first);
    }

    if (last) {
      $slide.addClass('h5p-summary-slide');
      $summarySlide = H5P.jQuery('.h5p-summary-slide');
    }
  }

  if (!foundKeywords && this.editor === undefined) {
    initKeywords = false; // Do not show keywords pane if it's empty!
  }

  // Initialize keywords
  if (initKeywords) {
    this.initKeywordsList(keywords);
  }
  else {
    this.$keywordsWrapper.remove();
  }

  // Initialize progress bar
  this.initProgressbar();

  // Initialize touch events
  this.initTouchEvents();

  // Initialize footer
  this.initFooter();

  // Update summary slide whenever it is pressed.
  H5P.jQuery('.h5p-slideination-summary-button').click(function (event) {
    that.updateSummarySlide($summarySlide);
    event.preventDefault();
  });
  this.$summarySlide = $summarySlide;

};

/**
 * Adds a link to the given container which will link achieved score to facebook.
 *
 * @param {jQuery} $facebookContainer Container that should hold the facebook link.
 * @param {Number} percentageScore Percentage score that should be linked.
 */
H5P.CoursePresentation.prototype.addFacebookScoreLinkTo = function ($facebookContainer, percentageScore) {
  //TODO: l10n variables for facebook and twitter buttons and messages, and improve share content.
  H5P.jQuery('<span class="show-facebook-icon">Share on Facebook</span>')
    .appendTo($facebookContainer);

  var facebookString = 'http://www.facebook.com/dialog/feed?' +
    'app_id=1385640295075628&' +
    'link=http://h5p.org/&' +
    'name=H5P&20task&' +
    'caption=I%20just%20finished%20a%20H5P%20task!&'+
    'description=I%20got%20' + percentageScore + '%25%20at:%20' + window.location.href + '&'+
    'redirect_uri=http://h5p.org/';

  $facebookContainer.click(function () {
    window.open(facebookString);
  });
};

/**
 * Adds a link to the given container which will link achieved score to twitter.
 *
 * @param {jQuery} $twitterContainer Container that should hold the twitter link.
 * @param {Number} percentageScore Percentage score that should be linked.
 */
H5P.CoursePresentation.prototype.addTwitterScoreLinkTo = function ($twitterContainer, percentageScore) {
  //TODO: l10n variables for facebook and twitter buttons and messages, and improve shared content.
  var twitterString = 'http://twitter.com/share?text=I%20got%20' + percentageScore + '%25%20on%20this%20task:';
  $twitterContainer.click(function () {
    window.open(twitterString);
  });

  H5P.jQuery('<span class="show-twitter-icon">Share on Twitter</span>')
    .appendTo($twitterContainer);
};

/**
 * Updates the feedback icons for the progres bar.
 *
 * @param slideScores
 */
H5P.CoursePresentation.prototype.setProgressBarFeedback = function (slideScores) {
  var that = this;

  if (slideScores !== undefined && slideScores) {
    // Set feedback icons for progress bar.
    slideScores.forEach(function (singleSlide) {
      if (that.progressbarParts[singleSlide.slide-1].children('span').hasClass('h5p-answered')) {
        if (singleSlide.score >= singleSlide.maxScore) {
          that.progressbarParts[singleSlide.slide-1].addClass('h5p-is-correct');
        } else {
          that.progressbarParts[singleSlide.slide-1].addClass('h5p-is-wrong');
        }
      }
    });
  } else {
    // Remove all feedback icons.
    that.progressbarParts.forEach(function (pbPart) {
      pbPart.removeClass('h5p-is-correct');
      pbPart.removeClass('h5p-is-wrong');
    });
  }
};

/**
 * Updates the provided summary slide with current values.
 *
 * @param {jQuery} $summarySlide Summary slide that will be updated
 */
H5P.CoursePresentation.prototype.updateSummarySlide = function ($summarySlide) {
  var that = this;

  // Remove old content
  $summarySlide.children().remove();

  // Enable solution mode
  that.toggleSolutionMode(true);

  // Get scores and updated html for summary slide
  var slideScores = that.showSolutions();
  var htmlText = that.outputScoreStats(slideScores);
  H5P.jQuery(htmlText).appendTo($summarySlide);

  // Update feedback icons in solution mode
  that.setProgressBarFeedback(slideScores);

  // Get total scores and construct progress circle
  var totalScores = that.totalScores(slideScores);
  H5P.JoubelUI
    .createProgressCircle(totalScores.totalPercentage)
    .appendTo(H5P.jQuery('.h5p-score-message-percentage', $summarySlide));

  // Construct facebook share score link
  var $facebookContainer = H5P.jQuery('.h5p-summary-facebook-message', $summarySlide);
  that.addFacebookScoreLinkTo($facebookContainer, totalScores.totalPercentage);

  // Construct twitter share score link
  var $twitterContainer = H5P.jQuery('.h5p-summary-twitter-message', $summarySlide);
  that.addTwitterScoreLinkTo($twitterContainer, totalScores.totalPercentage);

  // Update slide links
  var links = $summarySlide.find('.h5p-td > a');
  links.each(function (link) {
    var slideLink = H5P.jQuery(this);
    slideLink.click(function (event) {
      that.jumpToSlide(parseInt(slideLink.data('slide')) - 1);
      event.preventDefault();
    });
  });

  // Add button click events
  H5P.jQuery('.h5p-show-solutions', $summarySlide)
    .click(function (event) {
      that.jumpToSlide(0);
      event.preventDefault();
    });

  H5P.jQuery('.h5p-eta-export', $summarySlide)
    .click(function (event) {
      H5P.ExportableTextArea.Exporter.run(that.slides, that.elementInstances);
      event.preventDefault();
    });

  H5P.jQuery('.h5p-cp-retry-button', $summarySlide)
    .click(function (event) {
      that.resetTask();
      event.preventDefault();
    });
};

/**
 * Sets the solution mode button text in footer.
 *
 * @param solutionModeText
 * @param underlinedText
 */
H5P.CoursePresentation.prototype.setFooterSolutionModeText = function (solutionModeText, underlinedText) {
  if (solutionModeText !== undefined && solutionModeText) {
    this.$exitSolutionModeText.html(solutionModeText);
  }
  else {
    this.$exitSolutionModeText.html('');
  }
  if (underlinedText !== undefined && underlinedText) {
    this.$exitSolutionModeUnderlined.html(underlinedText);
  }
  else {
    this.$exitSolutionModeUnderlined.html('');
  }
};

/**
 * Toggles solution mode on/off.
 *
 * @params {Boolean} enableSolutionMode Enable/disable solution mode
 */
H5P.CoursePresentation.prototype.toggleSolutionMode = function (enableSolutionMode) {
  if (enableSolutionMode) {
    this.$footer.addClass('h5p-footer-solution-mode');
    this.setFooterSolutionModeText('Solution Mode:','Close')
  }
  else {
    this.$footer.removeClass('h5p-footer-solution-mode');
    this.setFooterSolutionModeText();
    this.setProgressBarFeedback();
  }
};

/**
 * Create html for a summary slideination slide.
 *
 */
H5P.CoursePresentation.createSummarySlideinationSlide = function (title) {
  var html =  '<li class="h5p-slide-button h5p-slide-summary-button';
  html += '"><a href="#" title="' + title + '">';
  return html + '</a></li>';
};

/**
 * Toggle keywords list on/off depending on current state
 */
H5P.CoursePresentation.prototype.toggleKeywords = function () {
  // Check state of keywords
  if (this.$keywordsWrapper.hasClass('h5p-open')) {
    // Already open, remove keywords
    this.$keywordsButton.attr('title', this.l10n.showKeywords);
    this.$keywordsWrapper.add(this.$keywordsButton).removeClass('h5p-open');
  }
  else {
    // Open keywords
    this.$keywordsButton.attr('title', this.l10n.hideKeywords);
    this.$keywordsWrapper.add(this.$keywordsButton).addClass('h5p-open');
  }
};

/**
 * Change the background opacity of the keywords list.
 *
 * @param {Number} value 0 - 100
 */
H5P.CoursePresentation.prototype.setKeywordsOpacity = function (value) {
  var self = this;
  var color = self.$keywordsWrapper.css('background-color').split(/\(|\)|,/g);
  self.$keywordsWrapper.css('background-color', 'rgba(' + color[1] + ', ' + color[2] + ', ' + color[3] + ',' + (value / 100) + ')');
};

/**
 * Makes continuous text smaller if it does not fit inside its container.
 * Only works in view mode.
 *
 * @returns {undefined}
 */
H5P.CoursePresentation.prototype.fitCT = function () {
  if (this.editor !== undefined) {
    return;
  }

  this.$current.find('.h5p-ct').each(function () {
    var percent = 100;
    var $parent = H5P.jQuery(this);
    var $ct = $parent.children('.ct').css({
      fontSize: '',
      lineHeight: ''
    });
    var parentHeight = $parent.height();

    while ($ct.outerHeight() > parentHeight) {
      percent--;
      $ct.css({
        fontSize: percent + '%',
        lineHeight: (percent + 65) + '%'
      });

      if (percent < 0) {
        break; // Just in case.
      }
    }
  });
};

/**
 * Resize handling.
 *
 * @param {Boolean} fullscreen
 * @returns {undefined}
 */
H5P.CoursePresentation.prototype.resize = function () {
  var fullscreenOn = H5P.$body.hasClass('h5p-fullscreen') || H5P.$body.hasClass('h5p-semi-fullscreen');

  // Fill up all available width
  this.$wrapper.css('width', 'auto');
  var width = this.$container.width();
  var style = {};

  if (fullscreenOn) {
    var maxHeight = this.$container.height();
    if (width / maxHeight > this.ratio) {
      // Top and bottom would be cut off so scale down.
      width = maxHeight * this.ratio;
      style.width = width + 'px';
    }
  }

  // TODO: Add support for -16 when content conversion script is created?
  var widthRatio = width / this.width;
  style.height = (width / this.ratio) + 'px';
  style.fontSize = (this.fontSize * widthRatio) + 'px';
  this.$wrapper.css(style);

  this.swipeThreshold = widthRatio * 100; // Default swipe threshold is 50px.

  // Resize elements
  var instances = this.elementInstances[this.$current.index()];
  if (instances !== undefined) {
    for (var i = 0; i < instances.length; i++) {
      var instance = instances[i];
      if ((instance.preventResize === undefined || instance.preventResize === false) && instance.$ !== undefined) {
        instance.$.trigger('resize');
      }
    }
  }

  this.fitCT();
};

/**
 * Enter/exit full screen mode.
 */
H5P.CoursePresentation.prototype.toggleFullScreen = function () {
  if (this.$fullScreenButton.hasClass('h5p-exit')) {
    this.$fullScreenButton.removeClass('h5p-exit').attr('title', this.l10n.fullscreen);
    if (H5P.fullScreenBrowserPrefix === undefined) {
      // Click button to disable fullscreen
      $('.h5p-disable-fullscreen').click();
    }
    else {
      if (H5P.fullScreenBrowserPrefix === '') {
        window.top.document.exitFullScreen();
      }
      else if (H5P.fullScreenBrowserPrefix === 'ms') {
        window.top.document.msExitFullscreen();
      }
      else {
        window.top.document[H5P.fullScreenBrowserPrefix + 'CancelFullScreen']();
      }
    }
  }
  else {
    this.$fullScreenButton.addClass('h5p-exit').attr('title', this.l10n.exitFullscreen);
    H5P.fullScreen(this.$container, this);
    if (H5P.fullScreenBrowserPrefix === undefined) {
      // Hide disable full screen button. We have our own!
      $('.h5p-disable-fullscreen').hide();
    }
  }
};

/**
 * Set focus.
 */
H5P.CoursePresentation.prototype.focus = function () {
  this.$wrapper.focus();
};

/**
 *
 * @param {jQuery} $keyword
 * @returns {undefined}
 */
H5P.CoursePresentation.prototype.keywordClick = function ($keyword) {
  if ($keyword.hasClass('h5p-current')) {
    return;
  }

  if (this.presentation.keywordListEnabled &&
      !this.presentation.keywordListAlwaysShow &&
      this.presentation.keywordListAutoHide) {
    // Auto-hide keywords list
    this.hideKeywords();
  }

  this.jumpToSlide($keyword.index());
};

/**
 * Add all element to the given slide.
 *
 * @param {Object} slide
 * @param {jQuery} $slide
 * @param {Number} index
 */
H5P.CoursePresentation.prototype.addElements = function (slide, $slide, index) {
  if (slide.elements === undefined) {
    return;
  }
  var attach = (this.editor !== undefined || index === 0 || index === 1);

  for (var i = 0; i < slide.elements.length; i++) {
    var element = slide.elements[i];
    var instance = this.addElement(element, $slide, index);
    if (attach) {
      // The editor requires all fields to be attached/rendered right away
      this.attachElement(element, instance, $slide, index);
    }
  }

  if (attach) {
    this.elementsAttached[index] = true;
  }
};

/**
 * Add element to the given slide and stores elements with solutions.
 *
 * @param {Object} element The Element to add.
 * @param {jQuery} $slide Optional, the slide. Defaults to current.
 * @param {Number} index Optional, the index of the slide we're adding elements to.
 * @returns {unresolved}
 */
H5P.CoursePresentation.prototype.addElement = function (element, $slide, index) {
  var instance;
  if (element.action === undefined) {
    // goToSlide, internal element
    instance = new H5P.CoursePresentationGoToSlide(element.title, element.goToSlide, element.invisible, this);
  }
  else {
    // H5P library
    var defaults;
    if (this.overrideButtons) {
      defaults = {
        params: {
          behaviour: {
            enableSolutionsButton: this.overrideShowSolutionsButton,
            enableRetry: this.overrideRetry
          },
          postUserStatistics: false
        }
      };
    }
    else {
      defaults = {
        params: {
          postUserStatistics: false
        }
      };
    }

    var library;
    if (this.editor !== undefined) {
      // Clone the whole tree to avoid libraries accidentally changing params while running.
      library = H5P.jQuery.extend(true, {}, element.action, defaults);
    }
    else {
      // Add defaults
      library = H5P.jQuery.extend(true, element.action, defaults);
    }

    /* If library allows autoplay, control this from CP */
    if (library.params.autoplay) {
      library.params.autoplay = false;
      library.params.cpAutoplay = true;
    }

    instance = H5P.newRunnable(library, this.contentId);
    if (instance.preventResize !== undefined) {
      instance.preventResize = true;
    }

    if (this.checkForSolutions(instance)) {
      if (this.slidesWithSolutions[index] === undefined) {
        this.slidesWithSolutions[index] = [];
      }
      this.slidesWithSolutions[index].push(instance);
    }
  }

  if (this.elementInstances[index] === undefined) {
    this.elementInstances[index] = [instance];
  }
  else {
    this.elementInstances[index].push(instance);
  }

  return instance;
};

/**
 * Attach all element instances to slide.
 *
 * @param {jQuery} $slide
 * @param {Number} index
 */
H5P.CoursePresentation.prototype.attachElements = function ($slide, index) {
  if (this.elementsAttached[index] !== undefined) {
    return; // Already attached
  }

  var slide = this.slides[index];
  var instances = this.elementInstances[index];
  if (slide.elements !== undefined) {
    for (var i = 0; i < slide.elements.length; i++) {
      this.attachElement(slide.elements[i], instances[i], $slide, index);
    }
  }

  this.elementsAttached[index] = true;
};

/**
 * Attach element to slide container.
 *
 * @param {Object} element
 * @param {Object} instance
 * @param {jQuery} $slide
 * @param {Number} index
 * @returns {jQuery}
 */
H5P.CoursePresentation.prototype.attachElement = function (element, instance, $slide, index) {
  var that = this;
  var displayAsButton = (element.displayAsButton !== undefined && element.displayAsButton);

  var $elementContainer = H5P.jQuery('<div class="h5p-element' + (displayAsButton ? ' h5p-element-button-wrapper' : '') + '" style="left: ' + element.x + '%; top: ' + element.y + '%; width: ' + element.width + '%; height: ' + element.height + '%;background-color:rgba(255,255,255,' + (element.backgroundOpacity === undefined ? 0 : element.backgroundOpacity / 100) + ')"></div>').appendTo($slide);
  if (displayAsButton) {
    var $buttonElement = H5P.jQuery('<div class="h5p-button-element"></div>');
    instance.attach($buttonElement);

    // Parameterize library name to use as html class.
    var libTypePmz = element.action.library.split(' ')[0].toLowerCase().replace(/[\W]/g, '-');
    H5P.jQuery('<a href="#" class="h5p-element-button ' + libTypePmz + '-button"></a>').appendTo($elementContainer).click(function () {
      if (that.editor === undefined) {
        $buttonElement.appendTo(that.showPopup('',function () {
          if (instance.pause !== undefined) {
            instance.pause();
          }
          else if (instance.stop !== undefined) {
            instance.stop();
          }
          $buttonElement.detach();
        }).find('.h5p-popup-wrapper'));
        instance.$.trigger('resize'); // Drop on audio and video??
        // Stop sound??
      }
      return false;
    });
  }
  else {
    instance.attach($elementContainer);
    if (element.action !== undefined && element.action.library === 'H5P.InteractiveVideo 1.2') {
      $elementContainer.addClass('h5p-fullscreen').find('.h5p-fullscreen').remove();
    }
  }

  if (this.editor !== undefined) {
    // If we're in the H5P editor, allow it to manipulate the elementInstances
    this.editor.processElement(element, $elementContainer, index, instance);
  }
  else {
    if (element.solution) {
      this.addElementSolutionButton(element, instance, $elementContainer);
    }

    /* When in view mode, we need to know if there are any answer elements,
     * so that we can display the export answers button on the last slide */
    this.hasAnswerElements = this.hasAnswerElements || instance.exportAnswers !== undefined;
  }

  return $elementContainer;
};

/**
 * Adds a info button
 *
 * @param {Object} element Properties from params.
 * @param {Object} elementInstance Instance of the element.
 * @param {jQuery} $elementContainer Wrapper for the element.
 * @returns {undefined}
 */
H5P.CoursePresentation.prototype.addElementSolutionButton = function (element, elementInstance, $elementContainer) {
  var that = this;
  elementInstance.showCPComments = function() {
    if ($elementContainer.children('.h5p-element-solution').length === 0) {
      H5P.jQuery('<a href="#" class="h5p-element-solution" title="' + that.l10n.solutionsButtonTitle + '"></a>')
        .click(function(event) {
          event.preventDefault();
          that.showPopup(element.solution);
        })
        .appendTo($elementContainer);
    }
  };
  if (element.alwaysDisplayComments !== undefined && element.alwaysDisplayComments) {
    elementInstance.showCPComments();
  }
};

/**
 * Displays a popup.
 *
 * @param {String} popupContent
 * @param {Function} [remove] Gets called before the popup is removed.
 * @returns {undefined}
 */
H5P.CoursePresentation.prototype.showPopup = function (popupContent, remove) {
  var doNotClose;
  var self = this;

  /** @private */
  var close = function(event) {
    if (doNotClose) {
      // Prevent closing the popup
      doNotClose = false;
      return;
    }

    // Remove popup
    if (remove !== undefined) {
      remove();
    }
    event.preventDefault();
    $popup.remove();
  };

  var $popup = H5P.jQuery('<div class="h5p-popup-overlay"><div class="h5p-popup-container"><div class="h5p-popup-wrapper">' + popupContent +
          '</div><div role="button" tabindex="1" class="h5p-button h5p-close-popup" title="' + this.l10n.close + '"></div></div></div>')
    .prependTo(this.$wrapper)
    .click(close)
    .find('.h5p-popup-container')
      .click(function () {
        doNotClose = true;
      })
      .end()
    .find('.h5p-close-popup')
      .click(close)
      .end();

  return $popup;
};

/**
 * Does the element have a solution?
 *
 * @param {H5P library instance} elementInstance
 * @returns {Boolean}
 *  true if the element has a solution
 *  false otherwise
 */
H5P.CoursePresentation.prototype.checkForSolutions = function (elementInstance) {
  return (elementInstance.showSolutions !== undefined || elementInstance.showCPComments !== undefined);
};

/**
 * Generate html for the given keywords.
 *
 * @param {Array} keywords List of keywords.
 * @param {Boolean} first Indicates if this is the first slide.
 * @returns {String} HTML.
 */
H5P.CoursePresentation.prototype.keywordsHtml = function (keywords, first) {
  var html = '';
  if (keywords === undefined) {
    keywords = [];
  }
  for (var i = 0; i < keywords.length; i++) {
    var keyword = keywords[i];

    html += '<li class="h5p-keywords-li"><span>' + keyword.main + '</span>';

    if (keyword.subs !== undefined && keyword.subs.length) {
      html += '<ol class="h5p-keywords-ol">';
      for (var j = 0; j < keyword.subs.length; j++) {
        html += '<li class="h5p-keywords-li h5p-sub-keyword"><span>' + keyword.subs[j] + '</span></li>';
      }
      html += '</ol>';
    }
    html += '</li>';
  }
  if (html) {
    html = '<ol class="h5p-keywords-ol">' + html + '</ol>';
  }

  return '<li class="h5p-keywords-li' + (first ? ' h5p-current' : '') + '">' + html + '</li>';
};

/**
 * Initialize list of keywords
 *
 * @param {string} keywords Html string list entries for keywords
 */
H5P.CoursePresentation.prototype.initKeywordsList = function (keywords) {
  var that = this;

  this.$keywords = this.$keywordsWrapper.html('<ol class="h5p-keywords-ol">' + keywords + '</ol>').children('ol');
  this.$currentKeyword = this.$keywords.children('.h5p-current');

  this.$keywords.children('li').click(function () {
    that.keywordClick(H5P.jQuery(this));
  });

  this.setKeywordsOpacity(this.presentation.keywordListOpacity === undefined ? 90 : this.presentation.keywordListOpacity);

};

/**
 * Initialize key press events.
 *
 * @returns {undefined} Nothing.
 */
H5P.CoursePresentation.prototype.initKeyEvents = function () {
  if (this.keydown !== undefined) {
    return;
  }

  var that = this;
  var wait = false;

  this.keydown = function (event) {
    if (wait) {
      return;
    }

    // Left
    if (event.keyCode === 37 && that.previousSlide()) {
      wait = true;
    }

    // Right
    else if (event.keyCode === 39 && that.nextSlide()) {
      wait = true;
    }

    if (wait) {
      // Make sure we only change slide every 300ms.
      setTimeout(function () {
        wait = false;
      }, 300);
    }
  };

  H5P.jQuery('body').keydown(this.keydown);
};

/**
 * Initialize progress bar
 */
H5P.CoursePresentation.prototype.initProgressbar = function () {

  var that = this;
  var progressbarPercentage = (1/this.slides.length)*100;

  // Remove existing progressbar
  if (this.progressbarParts !== undefined && this.progressbarParts) {
    this.progressbarParts.forEach(function (pbPart) {
      pbPart.remove();
    });
  }

  that.progressbarParts = new Array();

  for (var i = 0; i<this.slides.length; i++) {
    var slide = this.slides[i];
    var slideNumber = Number(i);

    var $progressbarPart = H5P.jQuery('<div>', {
      'width': progressbarPercentage+'%',
      'class': 'h5p-progressbar-part'
    }).data('slideNumber', i)
      .click( function () {
        that.jumpToSlide(H5P.jQuery(this).data('slideNumber'));
      }).appendTo(that.$progressbar);

    // Generate tooltip for progress bar slides
    var progressbarPartTitle = 'Slide '+(i+1);
    if(slide.keywords !== undefined && slide.keywords.length) {
      progressbarPartTitle = slide.keywords[0].main;
    }

    $progressbarPart.attr('Title', progressbarPartTitle);

    // Set tooltip for summary slide
    if (that.editor === undefined && i>=this.slides.length-1) {
      $progressbarPart.attr('Title', that.l10n.showSolutions);
    }

    if (i === 0) {
      $progressbarPart.addClass('h5p-progressbar-part-show');
    }

    if (slide.elements !== undefined && slide.elements.length) {
      H5P.jQuery('<div>', {
        'class': 'h5p-progressbar-part-has-task'
      }).appendTo($progressbarPart);
    }

    that.progressbarParts.push($progressbarPart);
  }
};

H5P.CoursePresentation.prototype.updateProgressbarSlides = function () {
  var that = this;
  var progressbarPercentage = (1/this.slides.length)*100;


};

/**
 * Initialize touch events
 *
 * @returns {undefined} Nothing.
 */
H5P.CoursePresentation.prototype.initTouchEvents = function () {
  var that = this;
  var startX, startY, lastX, prevX, nextX, scroll;
  var transform = function (value) {
    return {
      '-webkit-transform': value,
      '-moz-transform': value,
      '-ms-transform': value,
      'transform': value
    };
  };
  var reset = transform('');
  var getTranslateX = function ($element) {
    var prefixes = ['', '-webkit-', '-moz-', '-ms-'];
    for (var i = 0; i < prefixes.length; i++) {
      var matrix = $element.css(prefixes[i] + 'transform');
      if (matrix !== undefined) {
        return parseInt(matrix.match(/\d+/g)[4]);
      }
    }
  };

  this.$slidesWrapper.bind('touchstart', function (event) {
    // Set start positions
    lastX = startX = event.originalEvent.touches[0].pageX;
    startY = event.originalEvent.touches[0].pageY;
    prevX = getTranslateX(that.$current.addClass('h5p-touch-move').prev().addClass('h5p-touch-move'));
    nextX = getTranslateX(that.$current.next().addClass('h5p-touch-move'));

    scroll = null;

  }).bind('touchmove', function (event) {
    var touches = event.originalEvent.touches;

    // Determine horizontal movement
    lastX = touches[0].pageX;
    var movedX = startX - lastX;

    if (scroll === null) {
      // Detemine if we're scrolling horizontally or changing slide
      scroll = Math.abs(startY - event.originalEvent.touches[0].pageY) > Math.abs(movedX);
    }
    if (touches.length !== 1 || scroll) {
      // Do nothing if we're scrolling, zooming etc.
      return;
    }

    // Disable horizontal scrolling when changing slide
    event.preventDefault();

    if (movedX < 0) {
      // Move previous slide
      that.$current.next().css(reset);
      that.$current.prev().css(transform('translateX(' + (prevX - movedX) + 'px'));
    }
    else {
      // Move next slide
      that.$current.prev().css(reset);
      that.$current.next().css(transform('translateX(' + (nextX - movedX) + 'px)'));
    }

    // Move current slide
    that.$current.css(transform('translateX(' + (-movedX) + 'px)'));

  }).bind('touchend', function () {
    if (!scroll) {
      // If we're not scrolling detemine if we're changing slide
      var moved = startX - lastX;
      if (moved > that.swipeThreshold && that.nextSlide() || moved < -that.swipeThreshold && that.previousSlide()) {
        return;
      }
    }
    // Reset.
    that.$slidesWrapper.children().css(reset).removeClass('h5p-touch-move');
  });
};

/**
 * Initialize footer.
 */
H5P.CoursePresentation.prototype.initFooter = function () {
  var that = this;
  var $footer = this.$footer;

  // Inner footer adjustment containers
  var $leftFooter = H5P.jQuery('<div/>', {
    'class': 'h5p-footer-left-adjusted'
  }).appendTo($footer);

  var $rightFooter = H5P.jQuery('<div/>', {
    'class': 'h5p-footer-right-adjusted'
  }).appendTo($footer);

  var $centerFooter = H5P.jQuery('<div/>', {
    'class': 'h5p-footer-center-adjusted'
  }).appendTo($footer);

  // Left footer elements

  // Toggle keywords menu
  this.$keywordsButton = H5P.jQuery('<div/>', {
    'html': '',
    'class': "h5p-footer-toggle-keywords",
    role: 'button',
    'title': this.l10n.showKeywords
  }).click(function () {
    that.toggleKeywords();
  }).appendTo($leftFooter);

  if (this.presentation.keywordListAlwaysShow) {
    this.$keywordsButton.hide();
  }

  if (!this.presentation.keywordListEnabled) {
    // Hide in editor when disabled.
    this.$keywordsWrapper.add(this.$keywordsButton).hide();
  }

  // Update keyword for first slide.
  this.updateFooterKeyword(0);

  // Center footer elements

  // Previous slide
  H5P.jQuery('<div/>', {
    'class': 'h5p-footer-previous-slide',
    'role': 'button'
  }).click(function () {
    that.previousSlide();
  })
    .appendTo($centerFooter);

  // Current slide count
  this.$footerCurrentSlide = H5P.jQuery('<div/>', {
    'html': '1',
    'class': 'h5p-footer-slide-count-current'
  }).appendTo($centerFooter);

  // Count delimiter, content configurable in css
  H5P.jQuery('<div/>', {
    'html': '/',
    'class': 'h5p-footer-slide-count-delimiter'
  }).appendTo($centerFooter);

  // Max slide count
  this.$footerMaxSlide = H5P.jQuery('<div/>', {
    'html': this.slides.length,
    'class': 'h5p-footer-slide-count-max'
  }).appendTo($centerFooter);

  // Next slide
  H5P.jQuery('<div/>', {
    'class': 'h5p-footer-next-slide',
    'role': 'button'
  }).click(function (event) {
    that.nextSlide();
  })
    .appendTo($centerFooter);

  // Right footer elements

  // Toggle full screen button
  this.$fullScreenButton = H5P.jQuery('<div/>', {
    'class': 'h5p-footer-toggle-full-screen',
    'role': 'button'
  }).click(function () {
    that.toggleFullScreen();
  }).appendTo($rightFooter);

  // Exit solution mode button
  this.$exitSolutionModeButton = H5P.jQuery('<div/>', {
    'class': 'h5p-footer-exit-solution-mode'
  }).click(function () {
    that.jumpToSlide(that.slides.length-1);
  }).appendTo($rightFooter);

  // Solution mode elements
  this.$exitSolutionModeText = H5P.jQuery('<div/>', {
    'html': '',
    'class': 'h5p-footer-exit-solution-mode-text'
  }).appendTo(this.$exitSolutionModeButton);

  this.$exitSolutionModeUnderlined = H5P.jQuery('<div/>', {
    'html': '',
    'class': 'h5p-footer-exit-solution-mode-underlined'
  }).appendTo(this.$exitSolutionModeButton);



};

/**
 * Switch to previous slide
 *
 * @param {Boolean} noScroll Skip UI scrolling.
 * @returns {Boolean} Indicates if the move was made.
 */
H5P.CoursePresentation.prototype.previousSlide = function (noScroll) {
  var $prev = this.$current.prev();
  if (!$prev.length) {
    return false;
  }

  return this.jumpToSlide($prev.index(), noScroll);
};

/**
 * Switch to next slide.
 *
 * @param {Boolean} noScroll Skip UI scrolling.
 * @returns {Boolean} Indicates if the move was made.
 */
H5P.CoursePresentation.prototype.nextSlide = function (noScroll) {
  var $next = this.$current.next();
  if (!$next.length) {
    return false;
  }

  return this.jumpToSlide($next.index(), noScroll);
};

/**
 * Jump to the given slide.
 *
 * @param {type} slideNumber The slide number to jump to.
 * @param {Boolean} noScroll Skip UI scrolling.
 * @returns {Boolean} Always true.
 */
H5P.CoursePresentation.prototype.jumpToSlide = function (slideNumber, noScroll) {
  var that = this;

  if (this.$current.hasClass('h5p-animate')) {
    return;
  }

  // Jump to given slide and enable animation.
  var $old = this.$current.addClass('h5p-animate');
  var $slides = that.$slidesWrapper.children();
  var $prevs = $slides.filter(':lt(' + slideNumber + ')');
  this.$current = $slides.eq(slideNumber).addClass('h5p-animate');
  var previousSlideIndex = this.currentSlideIndex;
  this.currentSlideIndex = slideNumber;

  // Attach elements for this slide
  this.attachElements(this.$current, slideNumber);

  // Attach elements for next slide
  var $nextSlide = this.$current.next();
  if ($nextSlide.length) {
    this.attachElements($nextSlide, slideNumber + 1);
  }

  // Stop media on old slide
  // this is done no mather what autoplay says
  var instances = this.elementInstances[previousSlideIndex];
  if (instances !== undefined) {
    for (var i = 0; i < instances.length; i++) {
      // TODO: Check instance type instead to avoid accidents?
      if (typeof instances[i].stop === 'function') {
        instances[i].stop();
      }
    }
  }

  setTimeout(function () {
    // Play animations
    $old.removeClass('h5p-current');
    $slides.css({
      '-webkit-transform': '',
      '-moz-transform': '',
      '-ms-transform': '',
      'transform': ''
    }).removeClass('h5p-touch-move').removeClass('h5p-previous');
    $prevs.addClass('h5p-previous');
    that.$current.addClass('h5p-current');
  }, 1);

  setTimeout(function () {
    // Done animating
    that.$slidesWrapper.children().removeClass('h5p-animate');

    // Start media on new slide for elements beeing setup with autoplay!
    var instances = that.elementInstances[that.currentSlideIndex];
    if (instances !== undefined) {
      for (var i = 0; i < instances.length; i++) {
        // TODO: Check instance type instead to avoid accidents?
        if (instances[i].params && instances[i].params.cpAutoplay && typeof instances[i].play === 'function') {
          instances[i].play();
        }
      }
    }
  }, 250);

  // Jump keywords
  if (this.$keywords !== undefined) {
    this.$currentKeyword.removeClass('h5p-current');
    this.$currentKeyword = this.$keywords.children(':eq(' + slideNumber + ')').addClass('h5p-current');

    if (!noScroll) {
      this.scrollToKeywords();
    }

    if (this.editor !== undefined) {
      // Move add keywords button if using editor
      this.editor.$newKeyword.appendTo(this.$currentKeyword);
    }
  }

  // Update progress bar
  this.updateProgressBar(slideNumber, previousSlideIndex);

  // Update footer
  this.updateFooter(slideNumber);

  // Update summary slide if on last slide
  if (this.editor === undefined && this.$summarySlide !== undefined && slideNumber >= this.slides.length-1) {
    that.updateSummarySlide(this.$summarySlide);
  }

  // Export answers on last slide
  if (slideNumber === this.slides.length - 1 && this.editor === undefined) {
    if (this.postUserStatistics === true) {
      H5P.setFinished(this.contentId, 0, 0);
    }
  }

  // Editor specific settings
  if (this.editor !== undefined && this.editor.dnb !== undefined) {
    // Update drag and drop menu bar container
    this.editor.dnb.setContainer(this.$current);
    this.editor.dnb.blur();
  }

  this.$.trigger('resize'); // Triggered to resize elements.
  this.fitCT();
  return true;
};

/**
 * Updates progress bar.
 */
H5P.CoursePresentation.prototype.updateProgressBar = function (slideNumber, prevSlideNumber) {
  var that = this;

  // Updates progress bar progress (blue line)
  for (var i = 0; i < that.progressbarParts.length; i++) {
    if (slideNumber+1 > i) {
      that.progressbarParts[i].addClass('h5p-progressbar-part-show');
    }
    else {
      that.progressbarParts[i].removeClass('h5p-progressbar-part-show');
    }
  }

  if (prevSlideNumber === undefined) {
    that.progressbarParts.forEach(function (pbPart) {
      pbPart.children('span').removeClass('h5p-answered');
    });
    return;
  }

  // Updates previous slide answer.
  var answered = true;
  if (this.slidesWithSolutions[prevSlideNumber] !== undefined && this.slidesWithSolutions[prevSlideNumber]) {
    this.slidesWithSolutions[prevSlideNumber].forEach(function (slideTask) {
      if (slideTask.getAnswerGiven !== undefined) {
        if (!slideTask.getAnswerGiven()) {
          answered = false;
        }
      }
    });
  }

  if (answered) {
    that.progressbarParts[prevSlideNumber].children('span').addClass('h5p-answered');
  }

};

/**
 * Update footer with current slide data
 *
 * @param {Number} slideNumber Current slide number
 */
H5P.CoursePresentation.prototype.updateFooter = function (slideNumber) {

  // Update current slide number in footer
  this.$footerCurrentSlide.html(slideNumber+1);
  this.$footerMaxSlide.html(this.slides.length);

  // Update keyword in footer
  this.updateFooterKeyword(slideNumber);
};

/**
 * Update keyword in footer with current slide data
 *
 * @param {Number} slideNumber Current slide number
 */
H5P.CoursePresentation.prototype.updateFooterKeyword = function (slideNumber) {
  var keywordString = '';
  // Get current keyword
  if (this.$currentKeyword !== undefined && this.$currentKeyword) {
    keywordString = this.$currentKeyword.find('span').html();
  }

  // Empty string if no keyword defined
  if (keywordString === undefined) {
    keywordString = '';
  }

  // Summary slide keyword
  if (slideNumber >= this.slides.length-1) {
    keywordString = this.l10n.showSolutions;
  }

  // Set footer keyword
  this.$keywordsButton.html(keywordString);
};

/**
 * Scroll to current keywords.
 *
 * @returns {undefined} Nothing
 */
H5P.CoursePresentation.prototype.scrollToKeywords = function () {
  var $parent = this.$currentKeyword.parent();
  var move = $parent.scrollTop() + this.$currentKeyword.position().top - 8;

  if (H5P.CoursePresentation.isiPad) {
    // scrollTop animations does not work well on ipad.
    // TODO: Check on iPhone.
    $parent.scrollTop(move);
  }
  else {
    $parent.stop().animate({scrollTop: move}, 250);
  }
};

/**
 * @type Boolean Indicate if this is an ipad user.
 */
H5P.CoursePresentation.isiPad = navigator.userAgent.match(/iPad/i) !== null;

/**
 * Create HTML for a slide.
 *
 * @param {object} slide Params.
 * @returns {String} HTML.
 */
H5P.CoursePresentation.createSlide = function (slide) {
  return '<div class="h5p-slide"' + (slide.background !== undefined ? ' style="background:' + slide.background + '"' : '') + '"></div>';
};

/**
 * Reset the content for all slides.
 * @public
 */
H5P.CoursePresentation.prototype.resetTask = function () {
  this.toggleSolutionMode(false);
  for (var i = 0; i < this.slidesWithSolutions.length; i++) {
    if (this.slidesWithSolutions[i] !== undefined) {
      for (var j = 0; j < this.slidesWithSolutions[i].length; j++) {
        var elementInstance = this.slidesWithSolutions[i][j];
        if (elementInstance.resetTask) {
          elementInstance.resetTask();
        }
      }
    }
  }
  this.jumpToSlide(0, false);
  this.$container.find('.h5p-popup-overlay').remove();
};

/**
 * Show solutions for all slides that have solutions
 *
 * @returns {undefined}
 */
H5P.CoursePresentation.prototype.showSolutions = function () {
  var jumpedToFirst = false;
  var slideScores = [];
  var hasScores = false;
  for (var i = 0; i < this.slidesWithSolutions.length; i++) {
    if (this.slidesWithSolutions[i] !== undefined) {
      if (!this.elementsAttached[i]) {
        // Attach elements before showing solutions
        this.attachElements(this.$slidesWrapper.children(':eq(' + i + ')'), i);
      }
      if (!jumpedToFirst) {
        this.jumpToSlide(i, false);
        jumpedToFirst = true; // TODO: Explain what this really does.
      }
      var slideScore = 0;
      var slideMaxScore = 0;
      for (var j = 0; j < this.slidesWithSolutions[i].length; j++) {
        var elementInstance = this.slidesWithSolutions[i][j];
        if (elementInstance.addSolutionButton !== undefined) {
          elementInstance.addSolutionButton();
        }
        if (elementInstance.showSolutions) {
          elementInstance.showSolutions();
        }
        if (elementInstance.showCPComments) {
          elementInstance.showCPComments();
        }
        if (elementInstance.getMaxScore !== undefined) {
          slideMaxScore += elementInstance.getMaxScore();
          slideScore += elementInstance.getScore();
          hasScores = true;
        }
      }
      slideScores.push({
        slide: (i + 1),
        score: slideScore,
        maxScore: slideMaxScore
      });
    }
  }
  if (hasScores) {
    return slideScores;
  }
};

H5P.CoursePresentation.prototype.totalScores = function (slideScores) {
  var totalScore = 0;
  var totalMaxScore = 0;
  var tds = ''; // For saving the main table rows...
  for (var i = 0; i < slideScores.length; i++) {
    // Get percentage score for slide
    var slidePercentageScore = (slideScores[i].score / slideScores[i].maxscore) * 100;
    if (slideScores[i].score === 0) {
      slidePercentageScore = 0
    }
    totalScore += slideScores[i].score;
    totalMaxScore += slideScores[i].maxScore;
  }

  return {
    totalScore: totalScore,
    totalMaxScore: totalMaxScore,
    totalPercentage: Math.round((totalScore/totalMaxScore)*100)
  }
};

/**
 * Gets html for summary slide.
 *
 * @param slideScores Scores for all pages
 * @returns {string} html
 */
H5P.CoursePresentation.prototype.outputScoreStats = function (slideScores) {
  var that = this;
  var totalScore = 0;
  var totalMaxScore = 0;
  var tds = ''; // For saving the main table rows...
  for (var i = 0; i < slideScores.length; i++) {
    // Get percentage score for slide
    var slidePercentageScore = (slideScores[i].score / slideScores[i].maxscore)*100;
    if (slideScores[i].score === 0) {
      slidePercentageScore = 0
    }
    // Get task description, task name or identify multiple tasks:
    var slideDescription = '';
    var slideElements = this.slides[slideScores[i].slide-1].elements;
    if (slideElements.length > 1) {
      slideDescription = 'Multiple tasks';
    } else if (slideElements[0] !== undefined && slideElements[0]) {
      var action = slideElements[0].action;
      if (action.params.taskDescription !== undefined && action.params.taskDescription) {
        slideDescription = action.params.taskDescription;
      } else if (action.params.text !== undefined && action.params.text) {
        slideDescription = action.params.text;
      } else if (action.params.intro !== undefined && action.params.intro) {
        slideDescription = action.params.intro;
      }
      else if (action.library !== undefined && action.library) {
        slideDescription = action.library;
      }
    }

    slidePercentageScore = Math.round((slideScores[i].score/slideScores[i].maxScore)*100);
    tds += '<tr><td class="h5p-td h5p-summary-task-title"><a href="#" class="h5p-slide-link" data-slide="' + slideScores[i].slide + '">' + this.l10n.slide + ' ' + slideScores[i].slide + ': ' + slideDescription + '</a></td>' +
      '<td class="h5p-td h5p-summary-score-bar"><div class="h5p-summary-score-meter"><span style="width: ' + slidePercentageScore + '%; opacity: ' + (slidePercentageScore/100) +'"></span></div></td></tr>';
    totalScore += slideScores[i].score;
    totalMaxScore += slideScores[i].maxScore;
  }

  //TODO: move this somewhere else ?
/*  if (this.postUserStatistics === true) {
    H5P.setFinished(this.contentId, totalScore, totalMaxScore);
  }*/

  var percentScore = Math.round((totalScore / totalMaxScore) * 100);

  var html = '' +
          '<div class="h5p-score-message">' +
            '<div class="h5p-score-message-percentage">You achieved:</div>' +
            '<div class="h5p-summary-facebook-message"></div>' +
            '<div class="h5p-summary-twitter-message"></div>' +
          '</div>' +
          '<div class="h5p-summary-table-holder">'+
          ' <div class="h5p-summary-table-pages">' +
          '   <table class="h5p-score-table">' +
          '     <tbody>' + tds + '</tbody>' +
          '   </table>'+
          ' </div>' +
          ' <table class="h5p-summary-total-table" style="width: 100%">' +
          '    <tr>' +
          '     <td class="h5p-td h5p-summary-task-title">' + this.l10n.total + '</td>' +
          '     <td class="h5p-td h5p-summary-score-bar"><div class="h5p-summary-score-meter"><span style="width: ' + percentScore + '%; opacity: ' + (percentScore/100) +'"></span></div></td>' +
          '   </tr>' +
          ' </table>' +
          '</div>' +
          '<div class="h5p-summary-footer">' +
          ' <div class="h5p-show-solutions">' + that.l10n.showSolutions + '</div>' +
          ' <div class="h5p-eta-export">' + that.l10n.exportAnswers + '</div>' +
          ' <div class="h5p-cp-retry-button">' + that.l10n.retry + '</div>' +
          '</div>';

  return html;
};

/**
 * Gather copyright information for the current content.
 *
 * @returns {H5P.ContentCopyrights}
 */
H5P.CoursePresentation.prototype.getCopyrights = function () {
  var info = new H5P.ContentCopyrights();

  for (var slide = 0; slide < this.elementInstances.length; slide++) {
    var slideInfo = new H5P.ContentCopyrights();
    slideInfo.setLabel('Slide ' + (slide + 1));

    if (this.elementInstances[slide] !== undefined) {
      for (var element = 0; element < this.elementInstances[slide].length; element++) {
        var instance = this.elementInstances[slide][element];

        if (instance.getCopyrights !== undefined) {
          var elementCopyrights = instance.getCopyrights();
          if (elementCopyrights !== undefined) {
            var params = this.slides[slide].elements[element].action.params;
            elementCopyrights.setLabel((element + 1) + (params.contentName !== undefined ? ': ' + params.contentName : ''));
            slideInfo.addContent(elementCopyrights);
          }
        }
      }
    }

    info.addContent(slideInfo);
  }

  return info;
};
