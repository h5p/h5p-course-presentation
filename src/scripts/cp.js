import GoToSlide from './go-to-slide';
import SummarySlide from './summary-slide';
import NavigationLine from './navigation-line';
import SlideBackground from './slide-backgrounds';
import KeywordsMenu from './keyword-menu';
import { jQuery as $, EventDispatcher } from './globals';
import {flattenArray, addClickAndKeyboardListeners, isFunction, kebabCase, stripHTML} from './utils';

/**
 * @const {string}
 */
const KEYWORD_TITLE_SKIP = null;

/**
 * Constructor.
 *
 * @param {object} params Start paramteres.
 * @param {int} id Content identifier
 * @param {function} editor
 *  Set if an editor is initiating this library
 * @returns {undefined} Nothing.
 */
let CoursePresentation = function (params, id, extras) {
  EventDispatcher.call(this);
  var that = this;
  this.presentation = params.presentation;
  this.slides = this.presentation.slides;
  this.contentId = id;
  this.currentSlideIndex = 0;
  this.elementInstances = []; // elementInstances holds the instances for elements in an array.
  this.elementsAttached = []; // Map to keep track of which slide has attached elements
  this.slidesWithSolutions = [];
  this.hasAnswerElements = false;
  this.ignoreResize = false;

  if (extras.cpEditor) {
    this.editor = extras.cpEditor;
  }

  if (extras) {
    this.previousState = extras.previousState;
  }

  this.presentation.keywordListEnabled = (params.presentation.keywordListEnabled === undefined ? true : params.presentation.keywordListEnabled);

  this.l10n = H5P.jQuery.extend({
    slide: 'Slide',
    yourScore: 'Your score',
    maxScore: 'Max score',
    goodScore: 'Congratulations! You got @percent correct!',
    okScore: 'Nice effort! You got @percent correct!',
    badScore: 'You need to work more on this. You only got @percent correct...',
    total: 'TOTAL',
    showSolutions: 'Show solutions',
    summary: 'summary',
    retry: 'Retry',
    exportAnswers: 'Export text',
    close: 'Close',
    hideKeywords: 'Hide keywords list',
    showKeywords: 'Show keywords list',
    fullscreen: 'Fullscreen',
    exitFullscreen: 'Exit fullscreen',
    prevSlide: 'Previous slide',
    nextSlide: 'Next slide',
    currentSlide: 'Current slide',
    lastSlide: 'Last slide',
    solutionModeTitle: 'Exit solution mode',
    solutionModeText: 'Solution Mode',
    summaryMultipleTaskText: 'Multiple tasks',
    scoreMessage: 'You achieved:',
    shareFacebook: 'Share on Facebook',
    shareTwitter: 'Share on Twitter',
    shareGoogle: 'Share on Google+',
    goToSlide: 'Go to slide :num',
    solutionsButtonTitle: 'Show comments',
    printTitle: 'Print',
    printIngress: 'How would you like to print this presentation?',
    printAllSlides: 'Print all slides',
    printCurrentSlide: 'Print current slide',
    noTitle: 'No title',
    accessibilitySlideNavigationExplanation: 'Use left and right arrow to change slide in that direction whenever canvas is selected.',
    containsNotCompleted: '@slideName contains not completed interaction',
    containsCompleted: '@slideName contains completed interaction',
    slideCount: 'Slide @index of @total',
    accessibilityCanvasLabel: 'Presentation canvas. Use left and right arrow to move between slides.'
  }, params.l10n !== undefined ? params.l10n : {});

  if (!!params.override) {
    this.activeSurface = !!params.override.activeSurface;
    this.hideSummarySlide = !!params.override.hideSummarySlide;
    this.enablePrintButton = !!params.override.enablePrintButton;

    if (!!params.override.social) {
      this.enableTwitterShare = !!params.override.social.showTwitterShare;
      this.enableFacebookShare = !!params.override.social.showFacebookShare;
      this.enableGoogleShare = !!params.override.social.showGoogleShare;

      this.twitterShareStatement = params.override.social.twitterShare.statement;
      this.twitterShareHashtags = params.override.social.twitterShare.hashtags;
      this.twitterShareUrl = params.override.social.twitterShare.url;

      this.facebookShareUrl = params.override.social.facebookShare.url;
      this.facebookShareQuote = params.override.social.facebookShare.quote;

      this.googleShareUrl = params.override.social.googleShareUrl;
    }
  }

  this.keywordMenu = new KeywordsMenu({
    l10n : this.l10n
  });

  // Set override for all actions
  this.setElementsOverride(params.override);

  this.on('resize', this.resize, this);

  this.on('printing', function (event) {
    that.ignoreResize = !event.data.finished;

    if (event.data.finished) {
      that.resize();
    }
    else if (event.data.allSlides) {
      that.attachAllElements();
    }
  });
};

CoursePresentation.prototype = Object.create(EventDispatcher.prototype);
CoursePresentation.prototype.constructor = CoursePresentation;

/**
 * @public
 */
CoursePresentation.prototype.getCurrentState = function () {
  var state = this.previousState ? this.previousState : {};
  state.progress = this.$current.index();
  if (!state.answers) {
    state.answers = [];
  }
  if (!state.answered) {
    state.answered = [];
  }

  // Get answers and answered
  for (var slide = 0; slide < this.elementInstances.length; slide++) {
    if (this.progressbarParts) {
      state.answered[slide] = this.progressbarParts[slide].children('.h5p-progressbar-part-has-task').hasClass('h5p-answered');
    }
    if (this.elementInstances[slide]) {
      for (var element = 0; element < this.elementInstances[slide].length; element++) {
        var instance = this.elementInstances[slide][element];
        if (instance.getCurrentState instanceof Function ||
            typeof instance.getCurrentState === 'function') {
          if (!state.answers[slide]) {
            state.answers[slide] = [];
          }
          state.answers[slide][element] = instance.getCurrentState();
        }
      }
    }
  }

  return state;
};

/**
 * Render the presentation inside the given container.
 *
 * @param {H5P.jQuery} $container Container for this presentation.
 * @returns {undefined} Nothing.
 */
CoursePresentation.prototype.attach = function ($container) {
  var that = this;

  // isRoot is undefined in the editor
  if (this.isRoot !== undefined && this.isRoot()) {
    this.setActivityStarted();
  }

  var html =
          '<div class="h5p-keymap-explanation hidden-but-read">' + this.l10n.accessibilitySlideNavigationExplanation + '</div>' +
          '<div class="h5p-current-slide-announcer hidden-but-read" aria-live="assertive"></div>' +
          '<div class="h5p-wrapper" tabindex="0" role="application" aria-label="' + this.l10n.accessibilityCanvasLabel + '">' +
          '  <div class="h5p-box-wrapper">' +
          '    <div class="h5p-presentation-wrapper">' +
          '      <div class="h5p-keywords-wrapper"></div>' +
          '     <div class="h5p-slides-wrapper"></div>' +
          '    </div>' +
          '  </div>' +
          '  <nav class="h5p-cp-navigation">' +
          '    <ol class="h5p-progressbar list-unstyled"></ol>' +
          '  </nav>' +
          '  <div class="h5p-footer"></div>' +
          '</div>';

  $container.addClass('h5p-course-presentation').html(html);

  this.$container = $container;
  this.$slideAnnouncer = $container.find('.h5p-current-slide-announcer');
  this.$wrapper = $container.children('.h5p-wrapper').focus(function () {
    that.initKeyEvents();
  }).blur(function () {
    if (that.keydown !== undefined) {
      H5P.jQuery('body').unbind('keydown', that.keydown);
      delete that.keydown;
    }
  }).click(function (event) {
    var $target = H5P.jQuery(event.target);
    if (!$target.is('input, textarea, a') && !that.editor) {
      // Add focus to the wrapper so that it may capture keyboard events
      that.$wrapper.focus();
    }

    if (that.presentation.keywordListEnabled &&
        !that.presentation.keywordListAlwaysShow &&
        that.presentation.keywordListAutoHide &&
        !$target.is('textarea, .h5p-icon-pencil, span')) {
      that.hideKeywords(); // Auto-hide keywords
    }
  });

  // Get intended base width from CSS.
  var wrapperWidth = parseInt(this.$wrapper.css('width'));
  this.width = wrapperWidth !== 0 ? wrapperWidth : 640;

  var wrapperHeight = parseInt(this.$wrapper.css('height'));
  this.height = wrapperHeight !== 0 ? wrapperHeight : 400;

  this.ratio = 16/9;
  // Intended base font size cannot be read from CSS, as it might be modified
  // by mobile browsers already. (The Android native browser does this.)
  this.fontSize = 16;

  this.$boxWrapper = this.$wrapper.children('.h5p-box-wrapper');
  var $presentationWrapper = this.$boxWrapper.children('.h5p-presentation-wrapper');
  this.$slidesWrapper = $presentationWrapper.children('.h5p-slides-wrapper');
  this.$keywordsWrapper = $presentationWrapper.children('.h5p-keywords-wrapper');
  this.$progressbar = this.$wrapper.find('.h5p-progressbar');
  this.$footer = this.$wrapper.children('.h5p-footer');

  // Determine if keywords pane should be initialized
  this.initKeywords = (this.presentation.keywordListEnabled === undefined || this.presentation.keywordListEnabled === true || this.editor !== undefined);
  if (this.activeSurface && this.editor === undefined) {
    this.initKeywords = false;
    this.$boxWrapper.css('height', '100%');
  }
  this.isSolutionMode = false;

  // Create slides and retrieve keyword title details
  this.createSlides(this.slides);

  // We have always attached all elements on current slide
  this.elementsAttached[this.currentSlideIndex] = true;

  // Determine if summary slide should be added
  var $summarySlide;
  this.showSummarySlide = false;
  if (this.hideSummarySlide) {
    // Always hide
    this.showSummarySlide = !this.hideSummarySlide;
  }
  else {
    // Determine by checking for slides with tasks
    this.slidesWithSolutions.forEach(function (slide) {
      that.showSummarySlide = slide.length;
    });
  }

  if ((this.editor === undefined) && (this.showSummarySlide || this.hasAnswerElements)) {
    // Create the summary slide
    var summarySlideParams = {
      elements: [],
      keywords: []
    };
    this.slides.push(summarySlideParams);

    $summarySlide = H5P.jQuery(CoursePresentation.createSlide(summarySlideParams)).appendTo(this.$slidesWrapper);
    $summarySlide.addClass('h5p-summary-slide');
  }

  const keywordMenuConfig = this.getKeywordMenuConfig();

  // Do not show keywords pane if it's empty and there's no editor!
  if (keywordMenuConfig.length > 0 || this.isEditor()) {
    // Initialize keyword titles
    this.keywordMenu.init(keywordMenuConfig);
    this.keywordMenu.on('select', event => this.keywordClick(event.data.index));
    this.keywordMenu.on('close', () => this.hideKeywords());
    this.keywordMenu.on('select', () => {
      this.$currentKeyword = this.$keywords.children('.h5p-current');
    });

    this.$keywords = $(this.keywordMenu.getElement()).appendTo(this.$keywordsWrapper);
    this.$currentKeyword = this.$keywords.children('.h5p-current');

    this.setKeywordsOpacity(this.presentation.keywordListOpacity === undefined ? 90 : this.presentation.keywordListOpacity);

    if (this.presentation.keywordListAlwaysShow) {
      this.showKeywords();
    }
  }
  else {
    // Remove keyword titles completely
    this.$keywordsWrapper.remove();

    // Do not show keywords pane if it's empty and there's no editor!
    this.initKeywords = false;
  }

  if (this.editor !== undefined || !this.activeSurface) {
    // Initialize touch events
    this.initTouchEvents();

    // init navigation line
    this.navigationLine = new NavigationLine(this);

    // Set slide title if initing on slide 0
    if (!this.previousState || !this.previousState.progress) {
      this.$slideAnnouncer.html(this.navigationLine.createSlideTitle(0));
    }

    this.summarySlideObject = new SummarySlide(this, $summarySlide);
  }
  else {
    this.$progressbar.add(this.$footer).remove();

    if (H5P.fullscreenSupported) {
      // Create full screen button
      this.$fullScreenButton = H5P.jQuery('<div/>', {
        'class': 'h5p-toggle-full-screen',
        title: this.l10n.fullscreen,
        role: 'button',
        tabindex: 0,
        appendTo: this.$wrapper
      });

      addClickAndKeyboardListeners(this.$fullScreenButton, () => that.toggleFullScreen());
    }
  }

  new SlideBackground(this);

  if (this.previousState && this.previousState.progress) {
    this.jumpToSlide(this.previousState.progress);
  }
};

/**
 * Removes old menu items, and create new ones from slides.
 * Returns menu items as jQuery
 *
 * @return {jQuery}
 */
CoursePresentation.prototype.updateKeywordMenuFromSlides = function () {
  this.keywordMenu.removeAllMenuItemElements();
  const config = this.getKeywordMenuConfig();
  return $(this.keywordMenu.init(config));
};


/**
 * Creates a keyword menu config based on the slides parameters
 *
 * @return {KeywordMenuItemConfig[]}
 */
CoursePresentation.prototype.getKeywordMenuConfig = function () {
  return this.slides
    .map((slide, index) => ({
        title: this.createSlideTitle(slide),
        subtitle: `${this.l10n.slide} ${index + 1}`,
        index
      })
    )
    .filter(config => config.title !== KEYWORD_TITLE_SKIP);
};

/**
 * Returns the slide title, or "No title" if inside editor without title
 *
 * @return {string|null}
 */
CoursePresentation.prototype.createSlideTitle = function (slide) {
  const fallbackTitleForEditor = this.isEditor() ? this.l10n.noTitle : KEYWORD_TITLE_SKIP;
  return this.hasKeywords(slide) ? slide.keywords[0].main : fallbackTitleForEditor;
};

/**
 * Returns true if inside the editor
 *
 * @return {boolean}
 */
CoursePresentation.prototype.isEditor = function () {
  return this.editor !== undefined;
};

/**
 * Returns true if a slide has keywords
 *
 * @param {object} slide
 * @return {boolean}
 */
CoursePresentation.prototype.hasKeywords = function (slide) {
  return slide.keywords !== undefined && slide.keywords.length > 0;
};


/**
 * Create slides
 * Slides are directly attached to the slides wrapper.
 *
 * @param {Array} slidesParams
 */
CoursePresentation.prototype.createSlides = function (slidesParams) {
  for (var i = 0; i < slidesParams.length; i++) {
    var slideParams = slidesParams[i];

    // Create slide element
    var $slide = H5P.jQuery(CoursePresentation.createSlide(slideParams)).appendTo(this.$slidesWrapper);

    // Set as current if this is the first slide
    var isFirst = (i === 0);
    if (isFirst) {
      this.$current = $slide.addClass('h5p-current');
    }

    // Add elements to slide
    this.addElements(slideParams, $slide, i);
  }
};

/**
 * Does an object have functions to determine the score
 *
 * @public
 * @param obj The object to investigate
 * @returns {boolean}
 */
CoursePresentation.prototype.hasScoreData = function (obj) {
  return (
    (typeof obj !== typeof undefined) &&
    (typeof obj.getScore === 'function') &&
    (typeof obj.getMaxScore === 'function')
  );
};

/**
 * Return the combined score of all children
 *
 * @public
 * @returns {Number}
 */
CoursePresentation.prototype.getScore = function (){
  var self = this;

  return flattenArray(self.slidesWithSolutions).reduce(function (sum, slide){
    return sum + (self.hasScoreData(slide) ? slide.getScore() : 0);
  }, 0);
};

/**
 * Return the combined maxScore of all children
 *
 * @public
 * @returns {Number}
 */
CoursePresentation.prototype.getMaxScore = function (){
  var self = this;

  return flattenArray(self.slidesWithSolutions).reduce(function (sum, slide){
    return sum + (self.hasScoreData(slide) ? slide.getMaxScore() : 0);
  }, 0);
};

/**
 * Updates the feedback icons for the progres bar.
 *
 * @param slideScores
 */
CoursePresentation.prototype.setProgressBarFeedback = function (slideScores) {
  var that = this;

  if (slideScores !== undefined && slideScores) {
    // Set feedback icons for progress bar.
    slideScores.forEach(function (singleSlide) {
      if (that.progressbarParts[singleSlide.slide-1].children('.h5p-progressbar-part-has-task').hasClass('h5p-answered')) {
        if (singleSlide.score >= singleSlide.maxScore) {
          that.progressbarParts[singleSlide.slide-1]
            .children('.h5p-progressbar-part-has-task')
            .addClass('h5p-is-correct');
        } else {
          that.progressbarParts[singleSlide.slide-1]
            .children('.h5p-progressbar-part-has-task')
            .addClass('h5p-is-wrong');
        }
      }
    });
  } else {
    // Remove all feedback icons.
    that.progressbarParts.forEach(function (pbPart) {
      pbPart.children('.h5p-progressbar-part-has-task').removeClass('h5p-is-correct');
      pbPart.children('.h5p-progressbar-part-has-task').removeClass('h5p-is-wrong');
    });
  }
};

/**
 * Toggle keywords list on/off depending on current state
 */
CoursePresentation.prototype.toggleKeywords = function () {
  const keywordsAreShowing = this.$keywordsWrapper.hasClass('h5p-open');
  this[keywordsAreShowing ? 'hideKeywords' : 'showKeywords']();
};

/**
 * Hide keywords
 */
CoursePresentation.prototype.hideKeywords = function () {
  if (this.$keywordsWrapper.hasClass('h5p-open')) {
    if (this.$keywordsButton !== undefined) {
      this.$keywordsButton.attr('title', this.l10n.showKeywords);
      this.$keywordsButton.attr('aria-expanded', 'false');
      this.$keywordsButton.focus();
    }
    this.$keywordsWrapper.removeClass('h5p-open');
  }
};

/**
 * Show keywords
 */
CoursePresentation.prototype.showKeywords = function () {
  if (this.$keywordsButton !== undefined) {
    this.$keywordsButton.attr('title', this.l10n.hideKeywords);
    this.$keywordsButton.attr('aria-expanded', 'true');
  }
  this.$keywordsWrapper.addClass('h5p-open');
  this.$keywordsWrapper.find('li[tabindex="0"]').focus();
};

/**
 * Change the background opacity of the keywords list.
 *
 * @param {number} value 0 - 100
 */
CoursePresentation.prototype.setKeywordsOpacity = function (value) {
  const [red, green, blue] = this.$keywordsWrapper.css('background-color').split(/\(|\)|,/g);
  this.$keywordsWrapper.css('background-color', `rgba(${red}, ${green}, ${blue}, ${value / 100})`);
};

/**
 * Makes continuous text smaller if it does not fit inside its container.
 * Only works in view mode.
 *
 * @returns {undefined}
 */
CoursePresentation.prototype.fitCT = function () {
  if (this.editor !== undefined) {
    return;
  }

  this.$current.find('.h5p-ct').each(function () {
    var percent = 100;
    var $ct = H5P.jQuery(this);
    var parentHeight = $ct.parent().height();
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
CoursePresentation.prototype.resize = function () {
  var fullscreenOn = H5P.$body.hasClass('h5p-fullscreen') || H5P.$body.hasClass('h5p-semi-fullscreen');

  if (this.ignoreResize) {
    return; // When printing.
  }

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

  if (this.editor !== undefined) {
    this.editor.setContainerEm(this.fontSize * widthRatio * 0.75);
  }

  this.$wrapper.css(style);

  this.swipeThreshold = widthRatio * 100; // Default swipe threshold is 50px.

  // Resize elements
  var instances = this.elementInstances[this.$current.index()];
  if (instances !== undefined) {
    var slideElements = this.slides[this.$current.index()].elements;
    for (var i = 0; i < instances.length; i++) {
      var instance = instances[i];
      if ((instance.preventResize === undefined || instance.preventResize === false) && instance.$ !== undefined && !slideElements[i].displayAsButton) {
        H5P.trigger(instance, 'resize');
      }
    }
  }

  this.fitCT();
};

/**
 * Enter/exit full screen mode.
 */
CoursePresentation.prototype.toggleFullScreen = function () {
  if (H5P.isFullscreen || this.$container.hasClass('h5p-fullscreen') || this.$container.hasClass('h5p-semi-fullscreen')) {
    // Downscale fullscreen font size
    this.$footer.removeClass('footer-full-screen');
    this.$fullScreenButton.attr('title', this.l10n.fullscreen);

    // Cancel fullscreen
    if (H5P.exitFullScreen !== undefined && H5P.fullScreenBrowserPrefix !== undefined) {
      H5P.exitFullScreen();
    } else {
      // Use old system
      if (H5P.fullScreenBrowserPrefix === undefined) {
        // Click button to disable fullscreen
        H5P.jQuery('.h5p-disable-fullscreen').click();
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
  }
  else {
    // Rescale footer buttons
    this.$footer.addClass('footer-full-screen');

    this.$fullScreenButton.attr('title', this.l10n.exitFullscreen);
    H5P.fullScreen(this.$container, this);
    if (H5P.fullScreenBrowserPrefix === undefined) {
      // Hide disable full screen button. We have our own!
      H5P.jQuery('.h5p-disable-fullscreen').hide();
    }
  }
};

/**
 * Set focus.
 */
CoursePresentation.prototype.focus = function () {
  this.$wrapper.focus();
};

/**
 * Handles click on keyword
 *
 * @param {number} index
 */
CoursePresentation.prototype.keywordClick = function (index) {
  if (this.shouldHideKeywordsAfterSelect()) {
    // Auto-hide keywords list
    this.hideKeywords();
  }

  this.jumpToSlide(index, true);
};

CoursePresentation.prototype.shouldHideKeywordsAfterSelect = function () {
  return this.presentation.keywordListEnabled &&
    !this.presentation.keywordListAlwaysShow &&
    this.presentation.keywordListAutoHide &&
    this.editor === undefined;
};

/**
 * Add all element to the given slide.
 *
 * @param {Object} slide
 * @param {jQuery} $slide
 * @param {Number} index
 */
CoursePresentation.prototype.addElements = function (slide, $slide, index) {
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
    this.trigger('domChanged', {
      '$target': $slide,
      'library': 'CoursePresentation',
      'key': 'newSlide'
    }, {'bubbles': true, 'external': true});
  }
};

/**
 * Set the default behaviour override for all actions.
 *
 * @param {Object} override
 */
CoursePresentation.prototype.setElementsOverride = function (override) {
  // Create default object
  this.elementsOverride = {
    params: {}
  };

  if (override) {
    // Create behaviour object for overriding
    this.elementsOverride.params.behaviour = {};

    if (override.showSolutionButton) {
      // Override show solutions button
      this.elementsOverride.params.behaviour.enableSolutionsButton =
          (override.showSolutionButton === 'on' ? true : false);
    }

    if (override.retryButton) {
      // Override retry button
      this.elementsOverride.params.behaviour.enableRetry =
          (override.retryButton === 'on' ? true : false);
    }
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
CoursePresentation.prototype.addElement = function (element, $slide, index) {
  var instance;
  if (element.action === undefined) {
    // goToSlide, internal element
    instance = new GoToSlide(element, {
      l10n: this.l10n,
      currentIndex: index
    });

    if (!this.isEditor()) {
      instance.on('navigate', event => {
        const index = event.data;
        this.jumpToSlide(index);
      });
    }
  }
  else {
    // H5P library
    var library;
    if (this.editor !== undefined) {
      // Clone the whole tree to avoid libraries accidentally changing params while running.
      library = H5P.jQuery.extend(true, {}, element.action, this.elementsOverride);
    }
    else {
      // Add defaults
      library = H5P.jQuery.extend(true, element.action, this.elementsOverride);
    }

    /* If library allows autoplay, control this from CP */
    if (library.params.autoplay) {
      library.params.autoplay = false;
      library.params.cpAutoplay = true;
    }
    else if (library.params.playback && library.params.playback.autoplay) {
      library.params.playback.autoplay = false;
      library.params.cpAutoplay = true;
    }
    else if (library.params.media &&
      library.params.media.params &&
      library.params.media.params.playback &&
      library.params.media.params.playback.autoplay) {
      // Control libraries that has content with autoplay through CP
      library.params.media.params.playback.autoplay = false;
      library.params.cpAutoplay = true;
    }
    else if (library.params.media &&
      library.params.media.params &&
      library.params.media.params.autoplay) {
      // Control libraries that has content with autoplay through CP
      library.params.media.params.autoplay = false;
      library.params.cpAutoplay = true;
    }

    var internalSlideId = this.elementInstances[index] ? this.elementInstances[index].length : 0;
    if (this.previousState && this.previousState.answers && this.previousState.answers[index] && this.previousState.answers[index][internalSlideId]) {
      // Restore previous state
      library.userDatas = {
        state: this.previousState.answers[index][internalSlideId]
      };
    }

    // Override child settings
    library.params = library.params || {};
    instance = H5P.newRunnable(library, this.contentId, undefined, undefined, {parent: this});
    if (instance.preventResize !== undefined) {
      instance.preventResize = true;
    }
  }

  if (this.elementInstances[index] === undefined) {
    this.elementInstances[index] = [instance];
  }
  else {
    this.elementInstances[index].push(instance);
  }

  if (this.checkForSolutions(instance)) {
    instance.coursePresentationIndexOnSlide = this.elementInstances[index].length - 1;
    if (this.slidesWithSolutions[index] === undefined) {
      this.slidesWithSolutions[index] = [];
    }
    this.slidesWithSolutions[index].push(instance);
  }

  //Check if it is a exportable text area
  if (instance.exportAnswers !== undefined && instance.exportAnswers) {
    this.hasAnswerElements = true;
  }

  return instance;
};

/**
 * Attach all element instances to slide.
 *
 * @param {jQuery} $slide
 * @param {Number} index
 */
CoursePresentation.prototype.attachElements = function ($slide, index) {
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
  this.trigger('domChanged', {
      '$target': $slide,
      'library': 'CoursePresentation',
      'key': 'newSlide'
    }, {'bubbles': true, 'external': true});

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
CoursePresentation.prototype.attachElement = function (element, instance, $slide, index) {
  const displayAsButton = (element.displayAsButton !== undefined && element.displayAsButton);
  var buttonSizeClass = (element.buttonSize !== undefined ? "h5p-element-button-" + element.buttonSize : "");
  var classes = 'h5p-element' +
    (displayAsButton ? ' h5p-element-button-wrapper' : '') +
    (buttonSizeClass.length ? ' ' + buttonSizeClass : '');
  var $elementContainer = H5P.jQuery('<div>', {
    'class': classes,
  }).css({
    left: element.x + '%',
    top: element.y + '%',
    width: element.width + '%',
    height: element.height + '%'
  }).appendTo($slide);

  const isTransparent = element.backgroundOpacity === undefined || element.backgroundOpacity === 0;
  $elementContainer.toggleClass('h5p-transparent', isTransparent);

  if (displayAsButton) {
    const $button = this.createInteractionButton(element, instance);
    $button.appendTo($elementContainer);
  }
  else {
    const hasLibrary = element.action && element.action.library;
    const libTypePmz = hasLibrary ? this.getLibraryTypePmz(element.action.library) : 'other';

    var $outerElementContainer = H5P.jQuery('<div>', {
      'class': `h5p-element-outer ${libTypePmz}-outer-element`
    }).css({
      background: 'rgba(255,255,255,' + (element.backgroundOpacity === undefined ? 0 : element.backgroundOpacity / 100) + ')'
    }).appendTo($elementContainer);

    var $innerElementContainer = H5P.jQuery('<div>', {
      'class': 'h5p-element-inner'
    }).appendTo($outerElementContainer);

    if (libTypePmz === 'h5p-advancedtext' ||
        libTypePmz === 'h5p-table') {
      $innerElementContainer.attr('tabindex', 0);
    }

    instance.attach($innerElementContainer);
    if (element.action !== undefined && element.action.library.substr(0, 20) === 'H5P.InteractiveVideo') {
      var handleIV = function () {
        instance.$container.addClass('h5p-fullscreen');
        if (instance.controls.$fullscreen) {
          instance.controls.$fullscreen.remove();
        }
        instance.hasFullScreen = true;
        if (instance.controls.$play.hasClass('h5p-pause')) {
          instance.$controls.addClass('h5p-autohide');
        }
        else {
          instance.enableAutoHide();
        }
      };
      if (instance.controls !== undefined) {
        handleIV();
      }
      else {
        instance.on('controls', handleIV);
      }
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
 * Creates the interaction button
 *
 * @param {Object} element
 * @param {Object} instance
 *
 * @return {jQuery}
 */
CoursePresentation.prototype.createInteractionButton = function (element, instance) {
  const autoPlay = element.action.params && element.action.params.cpAutoplay;
  const label = (element.action.params && element.action.params.contentName) || '';
  const libTypePmz = this.getLibraryTypePmz(element.action.library);

  /**
   * Returns a function that will set [aria-expanded="false"] on the $btn element
   *
   * @param {jQuery} $btn
   * @return {Function}
   */
  const setAriaExpandedFalse = $btn => () => $btn.attr('aria-expanded', 'false');

  const $button = $('<div>', {
    role: 'button',
    tabindex: 0,
    'aria-label': label,
    'aria-popup': true,
    'aria-expanded': false,
    'class': `h5p-element-button h5p-element-button-${element.buttonSize} ${libTypePmz}-button`
  });

  addClickAndKeyboardListeners($button, () => {
    $button.attr('aria-expanded', 'true');
    this.showInteractionPopup(instance, libTypePmz, autoPlay, setAriaExpandedFalse($button));
  });

  if (element.action !== undefined && element.action.library.substr(0, 20) === 'H5P.InteractiveVideo') {
    instance.on('controls', function () {
      if (instance.controls.$fullscreen) {
        instance.controls.$fullscreen.remove();
      }
    });
  }

  return $button;
};

/**
 * Shows the interaction popup on button press
 *
 * @param {object} instance
 * @param {string} libTypePmz
 * @param {boolean} autoPlay
 * @param {function} closeCallback
 */
CoursePresentation.prototype.showInteractionPopup = function (instance, libTypePmz, autoPlay, closeCallback) {
  const $buttonElement = $('<div class="h5p-button-element"></div>');

  instance.attach($buttonElement);

  // Handle exit fullscreen
  const exitFullScreen = () => {
    this.$footer.removeClass('footer-full-screen');
    this.$fullScreenButton.attr('title', this.l10n.fullscreen);
    instance.trigger('resize');
  };

  if (!this.isEditor()) {
    // Listen for exit fullscreens not triggered by button, for instance using 'esc'
    this.on('exitFullScreen', exitFullScreen);

    $buttonElement.appendTo(this.showPopup('', () => {
      this.pauseMedia(instance);
      $buttonElement.detach();

      // Remove listener, we only need it for active popups
      this.off('exitFullScreen', exitFullScreen);
      closeCallback();
    }, libTypePmz).find('.h5p-popup-wrapper'));

    H5P.trigger(instance, 'resize');

    // Resize images to fit popup dialog
    if (libTypePmz === 'h5p-image') {
      this.resizePopupImage($buttonElement);
    }

    var $container = $buttonElement.closest('.h5p-popup-container');

    // Focus directly on content when popup is opened
    $container.on('transitionend', function() {
      var $tabbables = $buttonElement.find(':input').add($buttonElement.find('[tabindex]'));
      if ($tabbables.length) {
        $tabbables[0].focus();
      }
      else {
        $buttonElement.attr('tabindex', 0);
        $buttonElement.focus();
      }
    });

    // start activity
    if (isFunction(instance.setActivityStarted) && isFunction(instance.getScore)) {
      instance.setActivityStarted();
    }

    // Autoplay media
    if (autoPlay && isFunction(instance.play)) {
      instance.play();
    }
  }
};

/**
 * Returns the name part of a library string
 *
 * @param {string} library
 * @return {string}
 */
CoursePresentation.prototype.getLibraryTypePmz = library => kebabCase(library.split(' ')[0]).toLowerCase();

/**
 * Resize image inside popup dialog.
 *
 * @public
 * @param {H5P.jQuery} $wrapper
 */
CoursePresentation.prototype.resizePopupImage = function ($wrapper) {
  // Get fontsize, needed for scale
  var fontSize = Number($wrapper.css('fontSize').replace('px', ''));
  var $img = $wrapper.find('img');

  /**
   * Resize image to fit inside popup.
   *
   * @private
   * @param {Number} width
   * @param {Number} height
   */
  var resize = function (width, height) {
    if ((height / fontSize) < 18.5) {
      return;
    }

    var ratio = (width / height);
    height = 18.5 * fontSize;
    $wrapper.css({
      width: height * ratio,
      height: height
    });
  };

  if (!$img.height()) {
    // Wait for image to load
    $img.one('load', function () {
      resize(this.width, this.height);
    });
  }
  else {
    // Image already loaded, resize!
    resize($img.width(), $img.height());
  }
};

/**
 * Adds a info button
 *
 * @param {Object} element Properties from params.
 * @param {Object} elementInstance Instance of the element.
 * @param {jQuery} $elementContainer Wrapper for the element.
 */
CoursePresentation.prototype.addElementSolutionButton = function (element, elementInstance, $elementContainer) {
  elementInstance.showCPComments = () => {
    if ($elementContainer.children('.h5p-element-solution').length === 0 && stripHTML(element.solution).length > 0) {
      const $commentButton = $('<div/>', {
        role: 'button',
        tabindex: 0,
        title: this.l10n.solutionsButtonTitle,
        'aria-popup': true,
        'aria-expanded': false,
        'class': 'h5p-element-solution'
      }).append('<span class="joubel-icon-comment-normal"><span class="h5p-icon-shadow"></span><span class="h5p-icon-speech-bubble"></span><span class="h5p-icon-question"></span></span>')
        .appendTo($elementContainer);

      addClickAndKeyboardListeners($commentButton, () => this.showPopup(element.solution));
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
 */
CoursePresentation.prototype.showPopup = function (popupContent, remove, classes) {
  var doNotClose;

  /** @private */
  var close = function (event) {
    if (doNotClose) {
      // Prevent closing the popup
      doNotClose = false;
      return;
    }

    // Remove popup
    if (remove !== undefined) {
      setTimeout(function() {
        remove();
      }, 100);
    }
    event.preventDefault();
    $popup.addClass('h5p-animate');
    $popup.find('.h5p-popup-container').addClass('h5p-animate');

    setTimeout(function() {
      $popup.remove();
    }, 100);
  };

  var $popup = H5P.jQuery(
    '<div class="h5p-popup-overlay h5p-animate ' + (classes || 'h5p-popup-comment-field') + '">' +
      '<div class="h5p-popup-container h5p-animate">' +
        '<div class="h5p-cp-dialog-titlebar">' +
          '<div class="h5p-dialog-title"></div>' +
          '<div role="button" tabindex="0" class="h5p-close-popup" title="' + this.l10n.close + '"></div>' +
        '</div>' +
        '<div class="h5p-popup-wrapper">' + popupContent + '</div>' +
      '</div>' +
    '</div>')
    .prependTo(this.$wrapper)
    .focus()
    .removeClass('h5p-animate')
    .click(close)
    .find('.h5p-popup-container')
      .removeClass('h5p-animate')
      .click(function () {
        doNotClose = true;
      })
      .end()
    .find('.h5p-close-popup')
      .click(close)
      .on('keydown', function(e){
        if(e.keyCode == 32 || e.keyCode == 13){
          this.click(); // Close with spacebar or enter
        }
      })
      .end();

  return $popup;
};

/**
 * Checks if an element has a solution
 *
 * @param {H5P library instance} elementInstance
 * @returns {Boolean}
 *  true if the element has a solution
 *  false otherwise
 */
CoursePresentation.prototype.checkForSolutions = function (elementInstance) {
  return (elementInstance.showSolutions !== undefined ||
          elementInstance.showCPComments !== undefined);
};


/**
 * Initialize key press events.
 *
 * @returns {undefined} Nothing.
 */
CoursePresentation.prototype.initKeyEvents = function () {
  if (this.keydown !== undefined || this.activeSurface) {
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
CoursePresentation.prototype.initTouchEvents = function () {
  var that = this;
  var startX, startY, lastX, prevX, nextX, scroll;
  // var containerWidth = this.$slidesWrapper.width();
  // var containerPercentageForScrolling = 0.6; // 60% of container width used to reach endpoints with touch
  // var slidesNumbers = this.slides.length;
  // var pixelsPerSlide = (containerWidth * containerPercentageForScrolling) / slidesNumbers;
  // var startTime;
  // var currentTime;
  // var navigateTimer = 500; // 500ms before navigation popup starts.
  var isTouchJump = false;
  // var nextSlide;
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
    isTouchJump = false;
    // Set start positions
    lastX = startX = event.originalEvent.touches[0].pageX;
    startY = event.originalEvent.touches[0].pageY;

    // Set classes for slide movement and remember how much they move
    prevX = -getTranslateX(that.$current.prev().addClass('h5p-touch-move'));
    nextX = getTranslateX(that.$current.next().addClass('h5p-touch-move'));

    // containerWidth = H5P.jQuery(this).width();
    // startTime = new Date().getTime();

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

    // Create popup longer time than navigateTimer has passed
    if (!isTouchJump) {
/*      currentTime = new Date().getTime();
      var timeLapsed = currentTime - startTime;
      if (timeLapsed > navigateTimer) {
        isTouchJump = true;
      }*/

      // Fast swipe to next slide
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
    }
    // TODO: Jumping over multiple slides disabled until redesigned.

    /* else {
      that.$current.css(reset);
      // Update slider popup.
      nextSlide = parseInt(that.currentSlideIndex + (movedX / pixelsPerSlide), 10);
      if (nextSlide >= that.slides.length -1) {
        nextSlide = that.slides.length -1;
      } else if (nextSlide < 0) {
        nextSlide = 0;
      }
      // Create popup at initial touch point
      that.updateTouchPopup(that.$slidesWrapper, nextSlide, startX, startY);
    }*/

  }).bind('touchend', function () {
    if (!scroll) {
/*      if (isTouchJump) {
        that.jumpToSlide(nextSlide);
        that.updateTouchPopup();
        return;
      }*/
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
 *
 * @param $container
 * @param slideNumber
 * @param xPos
 * @param yPos
 */
CoursePresentation.prototype.updateTouchPopup = function ($container, slideNumber, xPos, yPos) {
  // Remove popup on no arguments
  if (arguments.length <= 0) {
    if(this.touchPopup !== undefined) {
      this.touchPopup.remove();
    }
    return;
  }

  var keyword = '';
  var yPosAdjustment = 0.15; // Adjust y-position 15% higher for visibility

  if ((this.$keywords !== undefined) && (this.$keywords.children(':eq(' + slideNumber + ')').find('span').html() !== undefined)) {
    keyword += this.$keywords.children(':eq(' + slideNumber + ')').find('span').html();
  } else {
    var slideIndexToNumber = slideNumber+1;
    keyword += this.l10n.slide + ' ' + slideIndexToNumber;
  }

  // Summary slide keyword
  if (this.editor === undefined) {
    if (slideNumber >= this.slides.length - 1) {
      keyword = this.l10n.showSolutions;
    }
  }

  if (this.touchPopup === undefined) {
    this.touchPopup = H5P.jQuery('<div/>', {
      'class': 'h5p-touch-popup'
    }).insertAfter($container);
  } else {
    this.touchPopup.insertAfter($container);
  }

  // Adjust yPos above finger.
  if ((yPos - ($container.parent().height() * yPosAdjustment)) < 0) {
    yPos = 0;
  } else {
    yPos -= ($container.parent().height() * yPosAdjustment);
  }

  this.touchPopup.css({
    'max-width': $container.width() - xPos,
    'left': xPos,
    'top': yPos
  });
  this.touchPopup.html(keyword);
};

/**
 * Switch to previous slide
 *
 * @param {Boolean} [noScroll] Skip UI scrolling.
 * @returns {Boolean} Indicates if the move was made.
 */
CoursePresentation.prototype.previousSlide = function (noScroll) {
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
CoursePresentation.prototype.nextSlide = function (noScroll) {
  var $next = this.$current.next();
  if (!$next.length) {
    return false;
  }

  return this.jumpToSlide($next.index(), noScroll);
};

/**
 * Returns true when the element is the current slide
 *
 * @param {number} index
 * @return {boolean}
 */
CoursePresentation.prototype.isCurrentSlide = function (index) {
  return this.$current.index() === index;
};

/**
 * Returns the current slide index
 *
 * @return {number}
 */
CoursePresentation.prototype.getCurrentSlideIndex = function () {
  return this.$current.index();
};

/**
 * Loads all slides (Needed by print)
 * @method attachAllElements
 */
CoursePresentation.prototype.attachAllElements = function () {
  var $slides = this.$slidesWrapper.children();

  for (var i=0; i<this.slides.length; i++) {
    this.attachElements($slides.eq(i), i);
  }

  // Need to force updating summary slide! This is normally done
  // only when summary slide is about to be viewed
  if (this.summarySlideObject !== undefined) {
    this.summarySlideObject.updateSummarySlide(this.slides.length-1, true);
  }
};

/**
 * Jump to the given slide.
 *
 * @param {type} slideNumber The slide number to jump to.
 * @param {Boolean} [noScroll] Skip UI scrolling.
 * @returns {Boolean} Always true.
 */
CoursePresentation.prototype.jumpToSlide = function (slideNumber, noScroll = false) {
  var that = this;
  if (this.editor === undefined) {
    var progressedEvent = this.createXAPIEventTemplate('progressed');
    progressedEvent.data.statement.object.definition.extensions['http://id.tincanapi.com/extension/ending-point'] = slideNumber + 1;
    this.trigger(progressedEvent);
  }

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
      if (!this.slides[previousSlideIndex].elements[i].displayAsButton) {
        // Only pause media elements displayed as posters.
        that.pauseMedia(instances[i]);
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
    that.trigger('changedSlide', that.$current.index());
  }, 1);

  setTimeout(function () {
    // Done animating
    that.$slidesWrapper.children().removeClass('h5p-animate');

    if (that.editor !== undefined) {
      return;
    }

    // Start media on new slide for elements beeing setup with autoplay!
    var instances = that.elementInstances[that.currentSlideIndex];
    var instanceParams = that.slides[that.currentSlideIndex].elements;
    if (instances !== undefined) {
      for (var i = 0; i < instances.length; i++) {
        // TODO: Check instance type instead to avoid accidents?
        if (instanceParams[i] &&
            instanceParams[i].action &&
            instanceParams[i].action.params &&
            instanceParams[i].action.params.cpAutoplay &&
            !instanceParams[i].displayAsButton &&
            typeof instances[i].play === 'function') {

          // Autoplay media if not button
          instances[i].play();
        }

        if (!instanceParams[i].displayAsButton && typeof instances[i].setActivityStarted === 'function' && typeof instances[i].getScore === 'function') {
          instances[i].setActivityStarted();
        }
      }
    }
  }, 250);

  // Jump keywords
  if (this.$keywords !== undefined) {
    this.keywordMenu.setCurrentSlideIndex(slideNumber);
    this.$currentKeyword = this.$keywords.find('.h5p-current');

    if (!noScroll) {
      this.keywordMenu.scrollToKeywords(slideNumber);
    }
  }

  // Show keywords if they should always show
  if (that.presentation.keywordListEnabled && that.presentation.keywordListAlwaysShow) {
    that.showKeywords();
  }

  if (that.navigationLine) {
    // Update progress bar
    that.navigationLine.updateProgressBar(slideNumber, previousSlideIndex, this.isSolutionMode);

    // Update footer
    that.navigationLine.updateFooter(slideNumber);

    // Announce slide change
    this.setSlideNumberAnnouncer(slideNumber);
  }

  if (that.summarySlideObject) {
    // Update summary slide if on last slide, do not jump
    that.summarySlideObject.updateSummarySlide(slideNumber, true);
  }

  // Editor specific settings
  if (this.editor !== undefined && this.editor.dnb !== undefined) {
    // Update drag and drop menu bar container
    this.editor.dnb.setContainer(this.$current);
    this.editor.dnb.blurAll();
  }

  this.trigger('resize'); // Triggered to resize elements.
  this.fitCT();
  return true;
};

/**
 * Set slide number so it can be announced to assistive technologies
 * @param {number} slideNumber Index of slide that should have its' title announced
 */
CoursePresentation.prototype.setSlideNumberAnnouncer = function (slideNumber) {
  let slideTitle = '';
  if (this.navigationLine) {
    slideTitle = this.navigationLine.createSlideTitle(slideNumber);
  }
  this.$slideAnnouncer.html(slideTitle);
};

/**
 * Create HTML for a slide.
 *
 * @param {object} slide Params.
 * @returns {String} HTML.
 */
CoursePresentation.createSlide = function (slide) {
  return '<div class="h5p-slide"' + (slide.background !== undefined ? ' style="background:' + slide.background + '"' : '') + '></div>';
};

/**
 * Reset the content for all slides.
 * @public
 */
CoursePresentation.prototype.resetTask = function () {
  this.summarySlideObject.toggleSolutionMode(false);
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
  this.navigationLine.updateProgressBar(0);
  this.jumpToSlide(0, false);
  this.$container.find('.h5p-popup-overlay').remove();
};

/**
 * Show solutions for all slides that have solutions
 *
 * @returns {undefined}
 */
CoursePresentation.prototype.showSolutions = function () {
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
      var indexes = [];
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
          indexes.push(elementInstance.coursePresentationIndexOnSlide);
        }
      }
      slideScores.push({
        indexes: indexes,
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

/**
 * Gets slides scores for whole cp
 * @returns {Array} slideScores Array containing scores for all slides.
 */
CoursePresentation.prototype.getSlideScores = function (noJump) {
  var jumpedToFirst = (noJump === true);
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
      var indexes = [];
      for (var j = 0; j < this.slidesWithSolutions[i].length; j++) {
        var elementInstance = this.slidesWithSolutions[i][j];
        if (elementInstance.getMaxScore !== undefined) {
          slideMaxScore += elementInstance.getMaxScore();
          slideScore += elementInstance.getScore();
          hasScores = true;
          indexes.push(elementInstance.coursePresentationIndexOnSlide);
        }
      }
      slideScores.push({
        indexes: indexes,
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

/**
 * Gather copyright information for the current content.
 *
 * @returns {H5P.ContentCopyrights}
 */
CoursePresentation.prototype.getCopyrights = function () {
  var info = new H5P.ContentCopyrights();

  var elementCopyrights;
  for (var slide = 0; slide < this.elementInstances.length; slide++) {
    var slideInfo = new H5P.ContentCopyrights();
    slideInfo.setLabel(this.l10n.slide + ' ' + (slide + 1));

    if (this.elementInstances[slide] !== undefined) {
      for (var element = 0; element < this.elementInstances[slide].length; element++) {
        var instance = this.elementInstances[slide][element];
        var params = this.slides[slide].elements[element].action.params;

        elementCopyrights = undefined;
        if (instance.getCopyrights !== undefined) {
          // Use the instance's own copyright generator
          elementCopyrights = instance.getCopyrights();
        }
        if (elementCopyrights === undefined) {
          // Create a generic flat copyright list
          elementCopyrights = new H5P.ContentCopyrights();
          H5P.findCopyrights(elementCopyrights, params, this.contentId);
        }

        var label = (element + 1);
        if (params.contentName !== undefined) {
          label += ': ' + params.contentName;
        }
        else if (instance.getTitle !== undefined) {
          label += ': ' + instance.getTitle();
        }
        elementCopyrights.setLabel(label);

        slideInfo.addContent(elementCopyrights);
      }
    }

    info.addContent(slideInfo);
  }

  return info;
};

/**
 * Stop the given element's playback if any.
 *
 * @param {object} instance
 */
CoursePresentation.prototype.pauseMedia = function (instance) {
  try {
    if (instance.pause !== undefined &&
        (instance.pause instanceof Function ||
          typeof instance.pause === 'function')) {
      instance.pause();
    }
    else if (instance.video !== undefined &&
             instance.video.pause !== undefined &&
             (instance.video.pause instanceof Function ||
               typeof instance.video.pause === 'function')) {
      instance.video.pause();
    }
    else if (instance.stop !== undefined &&
             (instance.stop instanceof Function ||
               typeof instance.stop === 'function')) {
      instance.stop();
    }
  }
  catch (err) {
    // Prevent crashing, but tell developers there's something wrong.
    H5P.error(err);
  }
};

/**
 * Get xAPI data.
 * Contract used by report rendering engine.
 *
 * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-6}
 */
CoursePresentation.prototype.getXAPIData = function () {
  var xAPIEvent = this.createXAPIEventTemplate('answered');

  // Extend definition
  var definition = xAPIEvent.getVerifiedStatementValue(['object', 'definition']);
  H5P.jQuery.extend(definition, {
    interactionType: 'compound',
    type: 'http://adlnet.gov/expapi/activities/cmi.interaction'
  });

  var score = this.getScore();
  var maxScore = this.getMaxScore();
  xAPIEvent.setScoredResult(score, maxScore, this, true, score === maxScore);

  var childrenXAPIData = flattenArray(this.slidesWithSolutions).map((child) => {
    if (child.getXAPIData) {
      return child.getXAPIData();
    }
  });

  return {
    statement: xAPIEvent.data.statement,
    children: childrenXAPIData
  };
};

export default CoursePresentation;
