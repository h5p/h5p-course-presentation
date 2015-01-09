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
    exportAnswers: 'Export text',
    close: 'Close',
    solutionsButtonTitle: 'View solution',
    hideKeywords: 'Hide keywords list',
    showKeywords: 'Show keywords list',
    goToSlide: 'Go to slide :num'
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
          '    <div class="h5p-progressbar"><div class="h5p-completed"></div></div>' +
          '  </div>' +
          '  <div class="h5p-action-bar">' +
          ((typeof that.editor === 'undefined' && typeof H5P.ExportableTextArea !== 'undefined') ? H5P.ExportableTextArea.Exporter.createExportButton(this.l10n.exportAnswers) : '') +
          '    <a href="#" class="h5p-show-solutions">' + this.l10n.showSolutions + '</a>' +
          '  </div>' +
          '  <div class="h5p-slideination">' +
          '    <a href="#" class="h5p-go-home" title="' + this.l10n.goHome + '"></a>' +
          '    <a href="#" class="h5p-scroll-left" title="' + this.l10n.scrollLeft + '"></a>' +
          '    <ol></ol>' +
          '    <a href="#" class="h5p-scroll-right" title="' + this.l10n.scrollRight + '"></a>' +
          '  </div>' +
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
  this.$slideination = this.$wrapper.children('.h5p-slideination');
  var $solutionsButton = H5P.jQuery('.h5p-show-solutions', this.$wrapper);
  var $exportAnswerButton = H5P.jQuery('.h5p-eta-export', this.$wrapper);

  var initKeywords = (this.presentation.keywordListEnabled === undefined || this.presentation.keywordListEnabled === true || this.editor !== undefined);

  // Create keywords html
  var keywords = '';
  var foundKeywords = false;
  var slideinationSlides = '';
  for (var i = 0; i < this.slides.length; i++) {
    var slide = this.slides[i];
    var $slide = H5P.jQuery(H5P.CoursePresentation.createSlide(slide)).appendTo(this.$slidesWrapper);
    var first = i === 0;

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

    slideinationSlides += H5P.CoursePresentation.createSlideinationSlide(i + 1, this.l10n.jumpToSlide, first);
  }

  if (!foundKeywords && this.editor === undefined) {
    initKeywords = false; // Do not show keywords pane if it's empty!
  }

  this.$progressbar = this.$boxWrapper.children('.h5p-progressbar').children().css('width', ((1 / i) * 100) + '%');

  // Initialize keywords
  if (initKeywords) {
    this.$keywordsButton = H5P.jQuery('<div/>', {
      'class': 'h5p-keywords-button',
      role: 'button',
      tabindex: 1,
      title: this.l10n.showKeywords,
      on: {
        click: function () {
          if (that.$keywordsButton.hasClass('h5p-open')) {
            that.hideKeywords();
          }
          else {
            that.showKeywords();
          }

          // Log the click to make sure the keywords list isn't closed.
          that.keywordsClicked = true;
        }
      }
    }).insertBefore(this.$keywordsWrapper);
    if (this.presentation.keywordListAlwaysShow) {
      this.$keywordsButton.hide();
    }

    this.$keywords = this.$keywordsWrapper.html('<ol class="h5p-keywords-ol">' + keywords + '</ol>').children('ol');
    this.$currentKeyword = this.$keywords.children('.h5p-current');

    this.$keywords.children('li').click(function () {
      that.keywordClick(H5P.jQuery(this));
    });

    this.setKeywordsOpacity(this.presentation.keywordListOpacity === undefined ? 90 : this.presentation.keywordListOpacity);
    if (this.presentation.keywordListEnabled === false) {
      // Hide in editor when disabled.
      this.$keywordsWrapper.add(this.$keywordsButton).hide();
    }

    this.$keywordsWrapper.click(function () {
      // Log the click to make sure the keywords list isn't closed.
      that.keywordsClicked = true;
    });
  }
  else {
    this.$keywordsWrapper.remove();
  }

  // Initialize touch events
  this.initTouchEvents();

  // Slideination
  this.initSlideination(this.$slideination, slideinationSlides);

  $solutionsButton.click(function (event) {
    that.showSolutions();
    event.preventDefault();
  });
  $exportAnswerButton.click(function (event) {
    H5P.ExportableTextArea.Exporter.run(that.slides, that.elementInstances);
    event.preventDefault();
  });
  if (this.slides.length === 1 && this.editor === undefined) {
    if(this.slidesWithSolutions.length) {
      $solutionsButton.show();
    }
    if(this.hasAnswerElements) {
      $exportAnswerButton.show();
    }
  }
};

/**
 * Show keywords list
 */
H5P.CoursePresentation.prototype.showKeywords = function () {
  if (this.$keywordsWrapper.hasClass('h5p-open')) {
    return; // Already open
  }

  this.$keywordsButton.attr('title', this.l10n.hideKeywords);
  this.$keywordsWrapper.add(this.$keywordsButton).addClass('h5p-open');
};

/**
 * Hide keywords list
 */
H5P.CoursePresentation.prototype.hideKeywords = function () {
  if (!this.$keywordsWrapper.hasClass('h5p-open')) {
    return; // Already closed
  }

  this.$keywordsButton.attr('title', this.l10n.showKeywords);
  this.$keywordsWrapper.add(this.$keywordsButton).removeClass('h5p-open');
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
 * Initialize the slide selector.
 *
 * @param {H5P.jQuery} $slideination Wrapper.
 * @param {String} slideinationSlides HTML.
 * @returns {undefined} Nothing.
 */
H5P.CoursePresentation.prototype.initSlideination = function ($slideination, slideinationSlides) {
  var that = this;
  var $ol = $slideination.children('ol');
  var $home = $slideination.children('.h5p-go-home');
  var $left = $slideination.children('.h5p-scroll-left');
  var $right = $slideination.children('.h5p-scroll-right');
  var timer;

  // Slide selector
  this.$slideinationSlides = $ol.html(slideinationSlides).children('li').children('a').click(function () {
    that.jumpToSlide(H5P.jQuery(this).text() - 1);

    return false;
  }).end().end();
  this.$currentSlideinationSlide = this.$slideinationSlides.children('.h5p-current');

  var toggleScroll = function () {
    if ($ol.scrollLeft() === 0)  {
      // Disable left scroll
      $left.removeClass('h5p-scroll-enabled');
    }
    else {
      // Enable left scroll
      $left.addClass('h5p-scroll-enabled');
    }

    if ($ol.scrollLeft() + $ol.width() === $ol[0].scrollWidth)  {
      // Disable right scroll
      $right.removeClass('h5p-scroll-enabled');
    }
    else {
      // Enable right scroll
      $right.addClass('h5p-scroll-enabled');
    }
  };

  var disableClick = function () {
    return false;
  };

  var scrollLeft = function (event) {
    event.preventDefault();
    H5P.$body.mouseup(stopScroll).mouseleave(stopScroll).bind('touchend', stopScroll);

    var currentScrollLeft = $ol.scrollLeft();
    timer = setInterval(function () {
      currentScrollLeft -= 2;
      $ol.scrollLeft(currentScrollLeft);
    }, 1);
  };

  var scrollRight = function (event) {
    event.preventDefault();
    H5P.$body.mouseup(stopScroll).mouseleave(stopScroll).bind('touchend', stopScroll);

    var currentScrollLeft = $ol.scrollLeft();
    timer = setInterval(function () {
      currentScrollLeft += 2;
      $ol.scrollLeft(currentScrollLeft);
    }, 1);
  };

  var goHome = function (event) {
    event.preventDefault();
    that.jumpToSlide(0);
  };

  var stopScroll = function () {
    clearInterval(timer);
    H5P.$body.unbind('mouseup', stopScroll).unbind('mouseleave', stopScroll).unbind('touchend', stopScroll);
    toggleScroll();
  };

  // Scroll slide selector to the left
  $left.click(disableClick).mousedown(scrollLeft).bind('touchstart', scrollLeft);

  // Scroll slide selector to the right
  $right.click(disableClick).mousedown(scrollRight).bind('touchstart', scrollRight);

  // Goto first slide
  $home.click(disableClick).mousedown(goHome).bind('touchstart', goHome);

  toggleScroll();
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

  // Update progress.
  this.$progressbar.css('width', (((slideNumber + 1) / $slides.length) * 100) + '%');

  this.jumpSlideination(slideNumber, noScroll);

  // Show show solutions button and export answers on last slide
  if (slideNumber === this.slides.length - 1 && this.editor === undefined) {
    if (this.slidesWithSolutions.length) {
      H5P.jQuery('.h5p-show-solutions', this.$container).show();
    }
    else if (this.postUserStatistics === true) {
      H5P.setFinished(this.contentId, 0, 0);
    }
    if (this.hasAnswerElements) {
      H5P.jQuery('.h5p-eta-export', this.$container).show();
    }
  }

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
 * Jump slideination.
 *
 * @param {type} slideNumber
 * @param {type} noScroll
 * @returns {undefined}
 */
H5P.CoursePresentation.prototype.jumpSlideination = function (slideNumber, noScroll) {
  this.$currentSlideinationSlide.removeClass('h5p-current');
  this.$currentSlideinationSlide = this.$slideinationSlides.children(':eq(' + slideNumber + ')').addClass('h5p-current');

  if (!noScroll) {
    var $parent = this.$currentSlideinationSlide.parent();
    var move = this.$currentSlideinationSlide.position().left - ($parent.width() / 2) + (this.$currentSlideinationSlide.width() / 2) + 10 + $parent.scrollLeft();

    if (H5P.CoursePresentation.isiPad) {
      // scrollLeft animations does not work well on ipad.
      // TODO: Check on iPhone.
      $parent.scrollLeft(move);
    }
    else {
      $parent.stop().animate({scrollLeft: move}, 250);
    }
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
 * Create html for a slideination slide.
 *
 * @param {int} index Optional
 * @param {String} title
 * @param {int} first Optional
 * @returns {String}
 */
H5P.CoursePresentation.createSlideinationSlide = function (index, title, first) {
  var html =  '<li class="h5p-slide-button';

  if (first !== undefined && first) {
    html += ' h5p-current';
  }
  html += '"><a href="#" title="' + title + '">';

  if (index !== undefined) {
    html += index;
  }

  return html + '</a></li>';
};

/**
 * Reset the content for all slides.
 * @public
 */
H5P.CoursePresentation.prototype.resetTask = function () {
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
      this.$slideinationSlides.children(':eq(' + i + ')').addClass('h5p-has-solutions');
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
    this.outputScoreStats(slideScores);
  }
};

H5P.CoursePresentation.prototype.outputScoreStats = function (slideScores) {
  var totalScore = 0;
  var totalMaxScore = 0;
  var tds = ''; // For saving the main table rows...
  for (var i = 0; i < slideScores.length; i++) {
    tds += '<tr><td class="h5p-td"><a href="#" class="h5p-slide-link" data-slide="' + slideScores[i].slide + '">' + this.l10n.slide + ' ' + slideScores[i].slide + '</a></td>' +
           '<td class="h5p-td">' + slideScores[i].score + '</td><td class="h5p-td">' + slideScores[i].maxScore + '</td></tr>';
    totalScore += slideScores[i].score;
    totalMaxScore += slideScores[i].maxScore;
  }

  if (this.postUserStatistics === true) {
    H5P.setFinished(this.contentId, totalScore, totalMaxScore);
  }

  var percentScore = Math.round(totalScore / totalMaxScore * 100);
  var scoreMessage = this.l10n.goodScore;
  if (percentScore < 80) {
    scoreMessage = this.l10n.okScore;
  }
  if (percentScore < 40) {
    scoreMessage = this.l10n.badScore;
  }
  var html = '' +
          '<div class="h5p-score-message-header">' + this.l10n.showSolutions + '</div>' +
          '<div class="h5p-score-message">' + scoreMessage.replace('@percent', '<em>' + percentScore + ' %</em>') + '</div>' +
          '<table>' +
          '  <thead>' +
          '    <tr>' +
          '      <th class="h5p-th">' + this.l10n.slide + '</th>' +
          '      <th class="h5p-th">' + this.l10n.yourScore + '</th>' +
          '      <th class="h5p-th">' + this.l10n.maxScore + '</th>' +
          '    </tr>' +
          '  </thead>' +
          '  <tbody>' + tds + '</tbody>' +
          '  <tfoot>' +
          '    <tr>' +
          '      <td class="h5p-td">' + this.l10n.total + '</td>' +
          '      <td class="h5p-td">' + totalScore + '</td>' +
          '      <td class="h5p-td">' + totalMaxScore + '</td>' +
          '    </tr>' +
          '  </tfoot>' +
          '</table>';

  var $solutionPopUp = this.showPopup(html);
  var that = this;

  //Add a retry button.
  H5P.jQuery('<div/>', {
    'text': 'Retry',
    'class': 'h5p-cp-retry-button'
  }).appendTo($solutionPopUp.children())
    .show()
    .click(function () {
      that.resetTask();
    });

  this.$container.find('.h5p-slide-link').click(function(event) {
    event.preventDefault();
    that.jumpToSlide(H5P.jQuery(this).data('slide') - 1);
    that.$container.find('.h5p-popup-overlay').remove();
  });
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
