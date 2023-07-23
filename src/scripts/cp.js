import Parent from 'h5p-parent';
import SummarySlide from './summary-slide';
import NavigationLine from './navigation-line';
import SlideBackground from './slide-backgrounds';
import KeywordsMenu from './keyword-menu';
import { jQuery as $ } from './globals';
import { flattenArray, addClickAndKeyboardListeners, isFunction, kebabCase, stripHTML, keyCode } from './utils';
import Slide from './slide.js';
import ConfirmationDialog from './confirmation-dialog';

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
  var that = this;
  this.presentation = params.presentation;
  this.slides = this.presentation.slides;
  this.contentId = id;
  this.elementInstances = []; // elementInstances holds the instances for elements in an array.
  this.elementsAttached = []; // Map to keep track of which slide has attached elements
  this.slidesWithSolutions = [];
  this.showCommentsAfterSolution = [];
  this.hasAnswerElements = false;
  this.ignoreResize = false;
  this.isTask = false;
  this.standalone = true;
  this.isReportingEnabled = false;
  this.popups = {};

  if (extras.cpEditor) {
    this.editor = extras.cpEditor;
  }

  if (extras) {
    this.previousState = extras.previousState;
    this.standalone = extras.standalone;
    this.isReportingEnabled = extras.isReportingEnabled || extras.isScoringEnabled;
  }

  this.currentSlideIndex = (this.previousState && this.previousState.progress) ? this.previousState.progress : 0;

  this.presentation.keywordListEnabled = (params.presentation.keywordListEnabled === undefined ? true : params.presentation.keywordListEnabled);

  this.l10n = $.extend({
    slide: 'Slide',
    score: 'Score',
    yourScore: 'Your score',
    maxScore: 'Max score',
    total: 'Total',
    totalScore: 'Total Score',
    showSolutions: 'Show solutions',
    summary: 'summary',
    retry: 'Retry',
    exportAnswers: 'Export text',
    close: 'Close',
    hideKeywords: 'Hide sidebar navigation menu',
    showKeywords: 'Show sidebar navigation menu',
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
    accessibilityProgressBarLabel: 'Choose slide to display',
    containsNotCompleted: '@slideName contains not completed interaction',
    containsCompleted: '@slideName contains completed interaction',
    slideCount: 'Slide @index of @total',
    accessibilityCanvasLabel: 'Presentation canvas. Use left and right arrow to move between slides.',
    containsOnlyCorrect: "@slideName only has correct answers",
    containsIncorrectAnswers: '@slideName has incorrect answers',
    shareResult: 'Share Result',
    accessibilityTotalScore: 'You got @score of @maxScore points in total',
    accessibilityEnteredFullscreen: 'Entered fullscreen',
    accessibilityExitedFullscreen: 'Exited fullscreen',
    confirmDialogHeader: 'Submit your answers',
    confirmDialogText: 'This will submit your results, do you want to continue?',
    confirmDialogConfirmText: 'Submit and see results',
    slideshowNavigationLabel: 'Slideshow navigation',
  }, params.l10n !== undefined ? params.l10n : {});

  if (!!params.override) {
    this.activeSurface = !!params.override.activeSurface;
    this.hideSummarySlide = !!params.override.hideSummarySlide;
    this.enablePrintButton = !!params.override.enablePrintButton;
    this.showSummarySlideSolutionButton = params.override.summarySlideSolutionButton !== undefined
      ? params.override.summarySlideSolutionButton : true;
    this.showSummarySlideRetryButton = params.override.summarySlideRetryButton !== undefined
      ? params.override.summarySlideRetryButton : true;

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
    l10n : this.l10n,
    currentIndex: this.previousState !== undefined ? this.previousState.progress : 0
  });

  // Set override for all actions
  this.setElementsOverride(params.override);

  // Inheritance
  Parent.call(this, Slide, params.presentation.slides);

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

CoursePresentation.prototype = Object.create(Parent.prototype);
CoursePresentation.prototype.constructor = CoursePresentation;

/**
 * @public
 * @return {object}
 */
CoursePresentation.prototype.getCurrentState = function () {
  var state = this.previousState ? this.previousState : {};
  state.progress = this.getCurrentSlideIndex();
  if (!state.answers) {
    state.answers = [];
  }

  state.answered = this.elementInstances
    .map((interaction, index) => this.slideHasAnsweredTask(index));

  // Get answers and answered
  for (var slide = 0; slide < this.elementInstances.length; slide++) {
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
 * Returns true if a slide has answered interactions
 *
 * @param {number} index
 * @return {boolean}
 */
CoursePresentation.prototype.slideHasAnsweredTask = function (index) {
  const tasks = this.slidesWithSolutions[index] || [];

  return tasks
    .filter(task => isFunction(task.getAnswerGiven))
    .some(task => task.getAnswerGiven());
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
          '<div class="h5p-fullscreen-announcer hidden-but-read" aria-live="polite"></div>' +
          '<div class="h5p-wrapper" tabindex="0" role="region" aria-roledescription="carousel" aria-label="' + this.l10n.accessibilityCanvasLabel + '">' +
          '  <div class="h5p-current-slide-announcer hidden-but-read" aria-live="polite"></div>' +
          '  <div tabindex="-1"></div>' +
          '  <div class="h5p-box-wrapper">' +
          '    <div class="h5p-presentation-wrapper">' +
          '      <div class="h5p-keywords-wrapper"></div>' +
          '     <div class="h5p-slides-wrapper"></div>' +
          '    </div>' +
          '  </div>' +
          '  <nav class="h5p-cp-navigation" aria-label="' + this.l10n.slideshowNavigationLabel + '">' +
          '    <div class="h5p-progressbar" role="tablist" aria-label="' + this.l10n.accessibilityProgressBarLabel + '"></div>' +
          '  </nav>' +
          '  <div class="h5p-footer"></div>' +
          '</div>';

  $container
    .attr('role', 'application')
    .addClass('h5p-course-presentation')
    .html(html);

  this.$container = $container;
  this.$slideAnnouncer = $container.find('.h5p-current-slide-announcer');
  this.$fullscreenAnnouncer = $container.find('.h5p-fullscreen-announcer');
  this.$slideTop = this.$slideAnnouncer.next();
  this.$wrapper = $container.children('.h5p-wrapper');

  if (this.activeSurface) {
    this.$wrapper.addClass('h5p-course-presentation-active-surface');
  }

  this.$wrapper.focus(function () {
    that.initKeyEvents();
  }).blur(function () {
    if (that.keydown !== undefined) {
      H5P.jQuery('body').unbind('keydown', that.keydown);
      delete that.keydown;
    }
  }).click(function (event) {
    var $target = H5P.jQuery(event.target);

    /*
     * Add focus to the wrapper so that it may capture keyboard events unless
     * the target or one of its parents should handle focus themselves.
     */
    const isFocusableElement = that.belongsToTagName(
      event.target, ['input', 'textarea', 'a', 'button'], event.currentTarget);
    // Does the target element (or one of its parents) have a tabIndex set?
    const hasTabIndex = that.hasTabIndex(event.target, event.currentTarget);
    // The dialog container (if within a dialog)
    const $dialogParent = $target.closest('.h5p-popup-container');
    // Is target within a dialog
    const isWithinDialog = $dialogParent.length !== 0;

    if (!isFocusableElement && !hasTabIndex && !that.editor) {
      if (!isWithinDialog) {
        // We're not within a dialog, so we can seafely put focus on wrapper
        that.$wrapper.focus();
      }
      else {
        // Find the closest tabbable parent element
        const $tabbable = $target.closest('[tabindex]');
        // Is the parent tabbable element inside the popup?
        if ($tabbable.closest('.h5p-popup-container').length === 1) {
          // We'll set focus here
          $tabbable.focus();
        }
        else {
          // Fallback: set focus on close button
          $dialogParent.find('.h5p-close-popup').focus();
        }
      }
    }

    if (that.presentation.keywordListEnabled &&
        !that.presentation.keywordListAlwaysShow &&
        that.presentation.keywordListAutoHide &&
        !$target.is('textarea, .h5p-icon-pencil, span')) {
      that.hideKeywords(); // Auto-hide keywords
    }
  });

  this.on('exitFullScreen', () => {
    this.$footer.removeClass('footer-full-screen');
    this.$fullScreenButton.attr('aria-label', this.l10n.fullscreen);
    this.$fullscreenAnnouncer.html(this.l10n.accessibilityExitedFullscreen);
  });

  this.on('enterFullScreen', () => {
    this.$fullscreenAnnouncer.html(this.l10n.accessibilityEnteredFullscreen);
  });

  // Get intended base width from CSS.
  var wrapperWidth = parseInt(this.$wrapper.css('width'));
  this.width = wrapperWidth !== 0 ? wrapperWidth : 640;

  var wrapperHeight = parseInt(this.$wrapper.css('height'));
  this.height = wrapperHeight !== 0 ? wrapperHeight : 400;

  this.ratio = 16 / 9;
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
  this.createSlides();

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

    $summarySlide = H5P.jQuery(Slide.createHTML(summarySlideParams)).appendTo(this.$slidesWrapper);
    $summarySlide.addClass('h5p-summary-slide');

    if (this.isCurrentSlide(this.slides.length - 1)) {
      this.$current = $summarySlide;
    }
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

    if (this.presentation.keywordListOpacity !== undefined) {
      this.setKeywordsOpacity(this.presentation.keywordListOpacity);
    }

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
      this.setSlideNumberAnnouncer(0, false);
    }

    this.summarySlideObject = new SummarySlide(this, $summarySlide);
  }
  else {
    this.$progressbar.add(this.$footer).remove();

    if (H5P.fullscreenSupported) {
      // Create full screen button
      this.$fullScreenButton = H5P.jQuery('<div/>', {
        'class': 'h5p-toggle-full-screen',
        'aria-label': this.l10n.fullscreen,
        role: 'button',
        tabindex: 0,
        appendTo: this.$wrapper
      });

      H5P.Tooltip(this.$fullScreenButton.get(0), {position: 'left'});

      addClickAndKeyboardListeners(this.$fullScreenButton, () => that.toggleFullScreen());
    }
  }

  new SlideBackground(this);

  if (this.previousState && this.previousState.progress) {
    this.jumpToSlide(this.previousState.progress, false, null, false, true);
  }
};

/**
 * Check if a node or one of its parents has a particular tag name.
 *
 * @param {HTMLElement} node Node to check.
 * @param {string|string[]} tagNames Tag name(s).
 * @param {HTMLElement} [stop] Optional node to stop. Defaults to body node.
 * @return {boolean} True, if node belongs to a node with one of the tag names.
 */
CoursePresentation.prototype.belongsToTagName = function (node, tagNames, stop) {
  if (!node) {
    return false;
  }

  // Stop check at DOM tree root
  stop = stop || document.body;

  if (typeof tagNames === 'string') {
    tagNames = [tagNames];
  }
  tagNames = tagNames.map(tagName => tagName.toLowerCase());

  const tagName = node.tagName.toLowerCase();
  if (tagNames.indexOf(tagName) !== -1) {
    return true;
  }

  // Having stop can prevent always parsing DOM tree to root
  if (stop === node) {
    return false;
  }

  return this.belongsToTagName(node.parentNode, tagNames, stop);
};

/**
 * Check if element or one of its parents has tabIndex !== -1.
 *
 * @param {HTMLElement} element Element to check.
 * @param {HTMLElement} [stopElement] Optional element to stop search and return false if none found.
 * @return {boolean} True, if one of the element parents has tabIndex !== -1.
 */
CoursePresentation.prototype.hasTabIndex = (element, stopElement) => {
  if (element.tabIndex !== -1) {
    return true;
  }
  const parents = $(element).parents();
  for (let key in parents) {
    if (parents[key].tabIndex !== -1) {
      return true;
    }
    if (stopElement && parents[key] === stopElement) {
      return false;
    }
  }
  return false;
}

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
    }))
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
CoursePresentation.prototype.createSlides = function () {
  var self = this;
  for (let i = 0; i < self.children.length; i++) {
    const isCurrentSlide = (i === self.currentSlideIndex);

    // Create and append DOM Elements
    self.children[i].getElement().appendTo(self.$slidesWrapper);

    if (isCurrentSlide) {
      self.children[i].setCurrent();
    }

    if (self.isEditor() || i === 0 || i === 1 || isCurrentSlide) {
      self.children[i].appendElements();
    }
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
CoursePresentation.prototype.getScore = function () {
  var self = this;

  return flattenArray(self.slidesWithSolutions).reduce(function (sum, slide) {
    return sum + (self.hasScoreData(slide) ? slide.getScore() : 0);
  }, 0);
};

/**
 * Return the combined maxScore of all children
 *
 * @public
 * @returns {Number}
 */
CoursePresentation.prototype.getMaxScore = function () {
  var self = this;

  return flattenArray(self.slidesWithSolutions).reduce(function (sum, slide) {
    return sum + (self.hasScoreData(slide) ? slide.getMaxScore() : 0);
  }, 0);
};

/**
 * Updates the feedback icons for the progres bar.
 *
 * @param {array} [slideScores]
 */
CoursePresentation.prototype.setProgressBarFeedback = function (slideScores) {
  if (slideScores !== undefined && slideScores) {
    // Set feedback icons for progress bar.
    slideScores.forEach(singleSlide => {
      const $indicator = this.progressbarParts[singleSlide.slide - 1]
        .find('.h5p-progressbar-part-has-task');

      if ($indicator.hasClass('h5p-answered')) {
        const isCorrect = singleSlide.score >= singleSlide.maxScore;
        $indicator.addClass(isCorrect ? 'h5p-is-correct' : 'h5p-is-wrong');

        this.navigationLine.updateSlideTitle(singleSlide.slide - 1);
      }
    });
  }
  else {
    // Remove all feedback icons.
    this.progressbarParts.forEach(pbPart => {
      pbPart.find('.h5p-progressbar-part-has-task')
        .removeClass('h5p-is-correct')
        .removeClass('h5p-is-wrong');
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
      this.$keywordsButton.attr('aria-label', this.l10n.showKeywords);
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
  if (this.$keywordsWrapper.hasClass('h5p-open')) {
    // Already showing
    return;
  }

  if (this.$keywordsButton !== undefined) {
    this.$keywordsButton.attr('aria-label', this.l10n.hideKeywords);
    this.$keywordsButton.attr('aria-expanded', 'true');
  }
  this.$keywordsWrapper.addClass('h5p-open');

  // Do not focus if always showing
  if (!this.presentation.keywordListAlwaysShow) {
    this.$keywordsWrapper.find('li[tabindex="0"]').focus();
  }
};

/**
 * Change the background opacity of the keywords list.
 *
 * @param {number} value 0 - 100
 */
CoursePresentation.prototype.setKeywordsOpacity = function (value) {
  if (this.$keywordsWrapper.css('background-color') !== '') {
    const [red, green, blue] = this.$keywordsWrapper.css('background-color').match(/\d+/g);
    this.$keywordsWrapper.css('background-color', `rgba(${red}, ${green}, ${blue}, ${value / 100})`);
  }
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
  var fullscreenOn = this.$container.hasClass('h5p-fullscreen') || this.$container.hasClass('h5p-semi-fullscreen');

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
    // Cancel fullscreen
    if (H5P.exitFullScreen !== undefined && H5P.fullScreenBrowserPrefix !== undefined) {
      H5P.exitFullScreen();
    }
    else {
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

    this.$fullScreenButton.attr('aria-label', this.l10n.exitFullscreen);
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
  }).appendTo($slide.children('[role="document"]').first());

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

    // H5P.Shape sets it's own size when line in selected
    instance.on('set-size', function (event) {
      for (let property in event.data) {
        $elementContainer.get(0).style[property] = event.data[property];
      }
    });

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

    // For first slide
    this.setOverflowTabIndex();
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
 * Disables tab indexes behind a popup container
 */
CoursePresentation.prototype.disableTabIndexes = function () {
  var $popupContainer = this.$container.find('.h5p-popup-container');

  this.$tabbables = this.$container.find('a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, *[tabindex], *[contenteditable]').filter(function () {
    var $tabbable = $(this);
    var insideContainer = $.contains($popupContainer.get(0), $tabbable.get(0));

    // tabIndex has already been modified, keep it in the set.
    if ($tabbable.data('tabindex')) {
      return true;
    }

    if (!insideContainer) {
      // Store current tabindex, so we can set it back when dialog closes
      var tabIndex = $tabbable.attr('tabindex');
      $tabbable.data('tabindex', tabIndex);

      // Make it non tabbable
      $tabbable.attr('tabindex', '-1');
      return true;
    }

    // If element is part of dialog wrapper, just ignore it
    return false;
  });
};


/**
 * Re-enables tab indexes after a popup container is closed
 */
CoursePresentation.prototype.restoreTabIndexes = function () {
  if (this.$tabbables) {
    this.$tabbables.each(function () {
      var $element = $(this);
      var tabindex = $element.data('tabindex');

      // Specifically handle jquery ui slider, since it overwrites data in an inconsistent way
      if ($element.hasClass('ui-slider-handle')) {
        $element.attr('tabindex', 0);
        $element.removeData('tabindex');
      }
      else if (tabindex !== undefined) {
        $element.attr('tabindex', tabindex);
        $element.removeData('tabindex');
      }
      else {
        $element.removeAttr('tabindex');
      }
    });
  }
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
  let label = element.action.metadata ? element.action.metadata.title : '';
  if (label === '') {
    label = (element.action.params && element.action.params.contentName) || element.action.library.split(' ')[0].split('.')[1];
  }
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

  const $buttonElement = $('<div class="h5p-button-element"></div>');
  instance.attach($buttonElement);

  const parentPosition = libTypePmz === 'h5p-advancedtext' ? {
    x: element.x,
    y: element.y
  } : null;
  addClickAndKeyboardListeners($button, () => {
    $button.attr('aria-expanded', 'true');
    this.showInteractionPopup(instance, $button, $buttonElement, libTypePmz, setAriaExpandedFalse($button), parentPosition);
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
 * @param {function} closeCallback
 * @param {Object} [popupPosition] X and Y position of popup
 */
CoursePresentation.prototype.showInteractionPopup = function (instance, $button, $buttonElement, libTypePmz, closeCallback, popupPosition = null) {

  // Handle exit fullscreen
  const exitFullScreen = () => {
    instance.trigger('resize');
  };

  if (!this.isEditor()) {
    // Listen for exit fullscreens not triggered by button, for instance using 'esc'
    this.on('exitFullScreen', exitFullScreen);

    this.showPopup({
      popupContent: $buttonElement, 
      $focusOnClose: $button, 
      parentPosition: popupPosition, 
      remove: (keepInDOM = false) => {
        if (!keepInDOM) {
          $buttonElement.detach();
        }

        // Remove listener, we only need it for active popups
        this.off('exitFullScreen', exitFullScreen);
        closeCallback();
      }, 
      classes: libTypePmz, 
      instance: instance, 
      keepInDOM: libTypePmz === 'h5p-interactivevideo'
    });

    H5P.trigger(instance, 'resize');

    // Resize images to fit popup dialog
    if (libTypePmz === 'h5p-image') {
      this.resizePopupImage($buttonElement);
    }

    // Focus directly on content when popup is opened
    setTimeout(() => {
      var $tabbables = $buttonElement.find(':input').add($buttonElement.find('[tabindex]'));
      if ($tabbables.length) {
        $tabbables[0].focus();
      }
      else {
        $buttonElement.attr('tabindex', 0);
        $buttonElement.focus();
      }
    }, 200);

    // start activity
    if (isFunction(instance.setActivityStarted) && isFunction(instance.getScore)) {
      instance.setActivityStarted();
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
        'aria-haspopup': 'dialog',
        'aria-expanded': false,
        'class': 'h5p-element-solution'
      }).append('<span class="joubel-icon-comment-normal"><span class="h5p-icon-shadow"></span><span class="h5p-icon-speech-bubble"></span><span class="h5p-icon-question"></span></span>')
        .appendTo($elementContainer);

      const parentPosition = {
        x: element.x,
        y: element.y
      };
      if (!element.displayAsButton) {
        parentPosition.x += element.width - 4;
        parentPosition.y += element.height - 12;
      }

      addClickAndKeyboardListeners($commentButton, (event) => {
        this.showPopup({ 
          popupContent: element.solution, 
          $focusOnClose: $commentButton, 
          parentPosition: parentPosition,
          updateAriaExpanded: true,
        });
        $commentButton.attr('aria-expanded', true);
        
        // Prevents the wrapper from stealing the focus of screen readers
        event.stopPropagation();
      });
    }
  };

  if (element.alwaysDisplayComments !== undefined && element.alwaysDisplayComments) {
    elementInstance.showCPComments();
  }
};

/**
 * Displays a popup.
 *
 * @param {string|jQuery} popupContent
 * @param {jQuery} $focusOnClose Prevents losing focus when dialog closes
 * @param {object} [parentPosition] x and y coordinates of parent
 * @param {Function} [remove] Gets called before the popup is removed.
 * @param {string} [classes]
 * @param {object} [instance] H5P library instance
 * @param {boolean} [keepInDOM] Hide the popup instead of removing it when it gets closed
 * @param {boolean} [updateAriaExpanded] Set aria-expanded=false on the $focusOnClose element when closing
 */
CoursePresentation.prototype.showPopup = function ({
  popupContent, 
  $focusOnClose, 
  parentPosition = null, 
  remove, 
  classes = 'h5p-popup-comment-field', 
  instance, 
  keepInDOM = false,
  updateAriaExpanded,
}) {

  var self = this;
  var doNotClose;
  // Give the popup elements unique ids
  this.popupId = this.popupId === undefined ? 0 : this.popupId + 1;

  /** @private */
  var close = function (event) {
    if (doNotClose) {
      // Prevent closing the popup
      doNotClose = false;
      return;
    }

    // Enable focus to rest of page
    self.restoreTabIndexes();

    $focusOnClose.focus();
    if (updateAriaExpanded) {
      $focusOnClose.attr('aria-expanded', false);
    }

    // Remove popup
    if (remove !== undefined) {
      setTimeout(function () {
        remove(keepInDOM);
      }, 100);
    }
    event.preventDefault();
    $popup.addClass('h5p-animate');
    $popup.find('.h5p-popup-container').addClass('h5p-animate');

    setTimeout(function () {
      if (keepInDOM) {
        $popup.hide();
      }
      else {
        $popup.remove();
      }
    }, 100);
  };

  let $popup;

  if (keepInDOM && instance && self.popups[instance.subContentId]) {
    // The popup already exists in the DOM, but is hidden
    $popup = self.popups[instance.subContentId];
  }

  if ($popup === undefined) {
    // The popup must be created and added to the DOM
    $popup = $(
      '<div class="h5p-popup-overlay ' + classes + '">' +
        '<div ' + 
          'class="h5p-popup-container" ' + 
          'role="dialog"' + 
          'aria-modal="true" ' + 
          'aria-live="true" ' + 
          'aria-labelledby="popup-title-' + this.popupId + '"> ' +   
          '<div role="button" tabindex="0" class="h5p-close-popup" title="' + this.l10n.close + '"></div>' +
          '<div class="h5p-popup-wrapper" role="document"></div>' +
        '</div>' +
      '</div>'
    );

    const $popupWrapper = $popup.find('.h5p-popup-wrapper');
    if (popupContent instanceof H5P.jQuery) {
      $popupWrapper.append(popupContent);
    }
    else {
      $popupWrapper.html(popupContent);
    }

    // Make sure the content is read by screen readers
    let idList = '';
    $popupWrapper
      .children()
      .each((index, child) => {
        child.setAttribute('id', 'popup-content-' + this.popupId + '-' + index);
        idList += 'popup-content-' + this.popupId + '-' + index + ' ';
      });
    $popup
      .find('.h5p-popup-container')
      .attr('aria-describedby', idList);

    if (instance && instance.subContentId) {
      // Keep a reference to this popup
      self.popups[instance.subContentId] = $popup;
    }
  }

  const $popupContainer = $popup.find('.h5p-popup-container');

  const resizePopup = ($popup, $popupContainer, parentPosition) => {
    if (!parentPosition) {
      return;
    }

    // Do not show until we have finished calculating position
    $popupContainer.css({ visibility: 'hidden' });
    $popup.prependTo(this.$wrapper);

    let popupHeight = $popupContainer.height();
    let popupWidth = $popupContainer.width();
    const overlayHeight = $popup.height();
    const overlayWidth = $popup.width();
    let widthPercentage = popupWidth * (100 / overlayWidth);
    let heightPercentage = popupHeight * (100 / overlayHeight);

    // Skip sufficiently big popups
    const skipThreshold = 50;
    if (widthPercentage > skipThreshold && heightPercentage > skipThreshold) {
      $popup.detach();
      return;
    }

    // Only resize boxes that are disproportionally wide
    const heightThreshold = 45;
    if (widthPercentage > heightPercentage && heightPercentage < heightThreshold) {
      // Make the popup quadratic
      widthPercentage = Math.sqrt(widthPercentage * heightPercentage);
      $popupContainer.css({
        width: widthPercentage + '%',
      });
    }

    // Account for overflowing edges, use consistent percentage padding as css
    const widthPaddingPercentage = 5;

    // Width percentage is capped at min 22 and max 90% in css
    if (widthPercentage > 90) {
      widthPercentage = 90;
    }
    else if (widthPercentage < 22) {
      widthPercentage = 22;
    }

    const overflowRightSideThreshold = 100 - widthPercentage - widthPaddingPercentage;
    let leftPos = parentPosition.x;
    if (parentPosition.x > overflowRightSideThreshold) {
      leftPos = overflowRightSideThreshold;
    }
    else if (parentPosition.x < widthPaddingPercentage) {
      leftPos = widthPaddingPercentage;
    }

    heightPercentage = $popupContainer.height() * (100 / overlayHeight);
    const heightPadding = 20 / 2;
    const topPosThreshold = 100 - heightPercentage - heightPadding;
    let topPos = parentPosition.y;
    if (parentPosition.y > topPosThreshold) {
      topPos = topPosThreshold;
    }
    else if (parentPosition.y < heightPadding) {
      topPos = heightPadding;
    }

    // Reset and prepare to animate in
    $popup.detach();
    $popupContainer.css({
      left: leftPos + '%',
      top: topPos + '%',
    });
  };

  resizePopup($popup, $popupContainer, parentPosition);
  $popup.addClass('h5p-animate');
  $popupContainer.css({
    'visibility': '',
  }).addClass('h5p-animate');

  if ($popup.parent().length === 0) {
    // Having no parent means the popup has not yet been added to the DOM
    $popup.prependTo(this.$wrapper);
  }
  else {
    $popup.show();
  }

  // Insert popup ready for use
  $popup
    .removeClass('h5p-animate')
    .click(close)
    .find('.h5p-popup-container')
      .removeClass('h5p-animate')
      .click(function () {
        doNotClose = true;
      })
      .keydown(function (event) {
        if (event.which === keyCode.ESC) {
          close(event);
        }
      })
      .find('.h5p-close-popup')
        .focus();

  // Hide other elements from the tab order
  this.disableTabIndexes();

  addClickAndKeyboardListeners($popup.find('.h5p-close-popup'), event => close(event));

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
    if ((event.keyCode === 37 || event.keyCode === 33) && that.previousSlide(undefined, false)) {
      event.preventDefault();
      wait = true;
    }

    // Right
    else if ((event.keyCode === 39 || event.keyCode === 34) && that.nextSlide(undefined, false)) {
      event.preventDefault();
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
  var touchStarted = false;
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

  this.$slidesWrapper.bind('touchstart', function (event) {
    isTouchJump = false;
    // Set start positions
    lastX = startX = event.originalEvent.touches[0].pageX;
    startY = event.originalEvent.touches[0].pageY;
    const slideWidth = that.$slidesWrapper.width();

    // Set classes for slide movement and remember how much they move
    prevX = (that.currentSlideIndex === 0 ? 0 : - slideWidth);
    nextX = (that.currentSlideIndex + 1 >= that.slides.length ? 0 : slideWidth);

    // containerWidth = H5P.jQuery(this).width();
    // startTime = new Date().getTime();

    scroll = null;
    touchStarted = true;

  }).bind('touchmove', function (event) {
    var touches = event.originalEvent.touches;

    if (touchStarted) {
      that.$current.prev().addClass('h5p-touch-move');
      that.$current.next().addClass('h5p-touch-move');
      touchStarted = false;
    }

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
      /*currentTime = new Date().getTime();
      var timeLapsed = currentTime - startTime;
      if (timeLapsed > navigateTimer) {
        isTouchJump = true;
      }*/

      // Fast swipe to next slide
      if (movedX < 0) {
        // Move previous slide
        that.$current.prev().css(transform('translateX(' + (prevX - movedX) + 'px'));
      }
      else {
        // Move next slide
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
      /*if (isTouchJump) {
        that.jumpToSlide(nextSlide);
        that.updateTouchPopup();
        return;
      }*/

      // If we're not scrolling detemine if we're changing slide
      var moved = startX - lastX;
      if (moved > that.swipeThreshold && that.nextSlide(undefined, false) || moved < -that.swipeThreshold && that.previousSlide(undefined, false)) {
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
    if (this.touchPopup !== undefined) {
      this.touchPopup.remove();
    }
    return;
  }

  var keyword = '';
  var yPosAdjustment = 0.15; // Adjust y-position 15% higher for visibility

  if ((this.$keywords !== undefined) && (this.$keywords.children(':eq(' + slideNumber + ')').find('span').html() !== undefined)) {
    keyword += this.$keywords.children(':eq(' + slideNumber + ')').find('span').html();
  }
  else {
    var slideIndexToNumber = slideNumber + 1;
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
  }
  else {
    this.touchPopup.insertAfter($container);
  }

  // Adjust yPos above finger.
  if ((yPos - ($container.parent().height() * yPosAdjustment)) < 0) {
    yPos = 0;
  }
  else {
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
CoursePresentation.prototype.previousSlide = function (noScroll, old = true) {
  var $prev = this.$current.prev();
  if (!$prev.length) {
    return false;
  }

  if (old) {
    return this.processJumpToSlide($prev.index(), noScroll, false);
  }
  else {
    return this.jumpToSlide($prev.index(), noScroll, null, false);
  }
};

/**
 * Switch to next slide.
 *
 * @param {Boolean} noScroll Skip UI scrolling.
 * @returns {Boolean} Indicates if the move was made.
 */
CoursePresentation.prototype.nextSlide = function (noScroll, old = true) {
  var $next = this.$current.next();
  if (!$next.length) {
    return false;
  }

  if (old) {
    return this.processJumpToSlide($next.index(), noScroll, false);
  }
  else {
    return this.jumpToSlide($next.index(), noScroll, null, false);
  }
};

/**
 * Returns true when the element is the current slide
 *
 * @param {number} index
 * @return {boolean}
 */
CoursePresentation.prototype.isCurrentSlide = function (index) {
  return this.currentSlideIndex === index;
};

/**
 * Returns the current slide index
 *
 * @return {number}
 */
CoursePresentation.prototype.getCurrentSlideIndex = function () {
  return this.currentSlideIndex;
};

/**
 * Loads all slides (Needed by print)
 * @method attachAllElements
 */
CoursePresentation.prototype.attachAllElements = function () {
  var $slides = this.$slidesWrapper.children();

  for (var i = 0; i < this.slides.length; i++) {
    this.attachElements($slides.eq(i), i);
  }

  // Need to force updating summary slide! This is normally done
  // only when summary slide is about to be viewed
  if (this.summarySlideObject !== undefined) {
    this.summarySlideObject.updateSummarySlide(this.slides.length - 1, true);
  }
};

/**
 * Process the jump to slide.
 *
 * @param {number} slideNumber The slide number to jump to.
 * @param {Boolean} [noScroll] Skip UI scrolling.
 * @returns {Boolean} Always true.
 */
CoursePresentation.prototype.processJumpToSlide = function (slideNumber, noScroll, handleFocus) {
  var that = this;
  if (this.editor === undefined && this.contentId) { // Content ID avoids crash when previewing in editor before saving
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

  // For new slide
  this.setOverflowTabIndex();

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

    // Set activity started
    var instances = that.elementInstances[that.currentSlideIndex];
    var instanceParams = that.slides[that.currentSlideIndex].elements;
    if (instances !== undefined) {
      for (var i = 0; i < instances.length; i++) {
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
    this.setSlideNumberAnnouncer(slideNumber, handleFocus);
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
 * Jump to the given slide.
 *
 * @param {number} slideNumber The slide number to jump to.
 * @param {Boolean} [noScroll] Skip UI scrolling.
 * @param {Function|null} [callback] Callback to execute on successfull navigation
 * @param {Boolean} [ignoreConfirmationDialog] Will not show confirmation dialog for summary slide
 * @returns {Boolean}
 */
CoursePresentation.prototype.jumpToSlide = function (slideNumber, noScroll = false, callback = null, handleFocus = false, ignoreConfirmationDialog = false) {
  if (this.standalone
    && this.showSummarySlide
    && slideNumber === this.slides.length - 1
    && !this.isSolutionMode
    && this.isReportingEnabled
    && !ignoreConfirmationDialog
  ) {

    // Currently in the summary slide
    if (this.currentSlideIndex === this.slides.length - 1) {
      return false;
    }

    const confirmationDialog = ConfirmationDialog({
      headerText: this.l10n.confirmDialogHeader,
      dialogText: this.l10n.confirmDialogText,
      confirmText: this.l10n.confirmDialogConfirmationText,
    });

    confirmationDialog.on('canceled', () => {
      return false;
    });
    confirmationDialog.on('confirmed', () => {
      this.processJumpToSlide(slideNumber, noScroll, handleFocus);
      if (callback) {
        callback();
      }
    });
  }
  else {
    this.processJumpToSlide(slideNumber, noScroll, handleFocus);
    if (callback) {
      callback();
    }
  }
};

/**
 * Set tab index for text containers that overflow with a scrollbar
 */
CoursePresentation.prototype.setOverflowTabIndex = function () {
  // On resume, this is not set yet, but it will be iovoked later
  if (this.$current === undefined) {
    return;
  }

  this.$current.find('.h5p-element-inner').each( function () {
    const $inner = $(this);

    // Currently, this rule is for tables only
    let innerHeight;
    if (this.classList.contains('h5p-table')) {
      innerHeight = $inner.find('.h5p-table').outerHeight();
    }

    // Add tabindex if there's an overflow (scrollbar depending on CSS)
    const outerHeight = $inner.closest('.h5p-element-outer').innerHeight();
    if (innerHeight !== undefined && outerHeight !== null && innerHeight > outerHeight) {
      $inner.attr('tabindex', 0);
    }
  });
};

/**
 * Set slide number so it can be announced to assistive technologies
 * @param {number} slideNumber Index of slide that should have its' title announced
 * @param {boolean} [handleFocus=false] Moves focus to the top of the slide
 */
CoursePresentation.prototype.setSlideNumberAnnouncer = function (slideNumber, handleFocus = false) {
  let slideTitle = '';

  if (!this.navigationLine) {
    return slideTitle;
  }

  // Add slide number
  const slide = this.slides[slideNumber];
  const hasKeywords = slide.keywords && slide.keywords.length > 0;
  if (hasKeywords && !this.navigationLine.isSummarySlide(slideNumber)) {
    slideTitle += this.l10n.slide + ' ' + (slideNumber + 1) + ': ';
  }

  slideTitle += this.navigationLine.createSlideTitle(slideNumber);
  this.$slideAnnouncer.html(slideTitle);
  if (handleFocus) {
    this.$slideTop.focus();
  }
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
    // Show comments of non graded contents
    if (this.showCommentsAfterSolution[i]) {
      for (let j = 0; j < this.showCommentsAfterSolution[i].length; j++) {
        if (typeof this.showCommentsAfterSolution[i][j].showCPComments === 'function') {
          this.showCommentsAfterSolution[i][j].showCPComments();
        }
      }
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

  // Check for a common background image shared by all slides
  if (this.presentation && this.presentation.globalBackgroundSelector &&
      this.presentation.globalBackgroundSelector.imageGlobalBackground) {

    // Add image copyrights to the presentation scope
    var globalBackgroundImageParams = this.presentation.globalBackgroundSelector.imageGlobalBackground;
    var globalBackgroundImageCopyright = new H5P.MediaCopyright(globalBackgroundImageParams.copyright);
    globalBackgroundImageCopyright.setThumbnail(new H5P.Thumbnail(H5P.getPath(globalBackgroundImageParams.path, this.contentId), globalBackgroundImageParams.width, globalBackgroundImageParams.height));
    info.addMedia(globalBackgroundImageCopyright);
  }

  for (var slide = 0; slide < this.slides.length; slide++) {
    var slideInfo = new H5P.ContentCopyrights();
    slideInfo.setLabel(this.l10n.slide + ' ' + (slide + 1));

    // Check for a slide specific background image
    if (this.slides[slide] && this.slides[slide].slideBackgroundSelector &&
        this.slides[slide].slideBackgroundSelector.imageSlideBackground) {

      // Add image copyrights to the slide scope
      var slideBackgroundImageParams = this.slides[slide].slideBackgroundSelector.imageSlideBackground;
      var slideBackgroundImageCopyright = new H5P.MediaCopyright(slideBackgroundImageParams.copyright);
      slideBackgroundImageCopyright.setThumbnail(new H5P.Thumbnail(H5P.getPath(slideBackgroundImageParams.path, this.contentId), slideBackgroundImageParams.width, slideBackgroundImageParams.height));
      slideInfo.addMedia(slideBackgroundImageCopyright);
    }

    // If the slide has elements, add the ones with copyright info to this slides copyright
    if (this.elementInstances[slide] !== undefined) {
      for (var element = 0; element < this.elementInstances[slide].length; element++) {
        var instance = this.elementInstances[slide][element];

        if (!this.slides[slide].elements[element].action) {
          continue;
        }

        var params = this.slides[slide].elements[element].action.params;
        var metadata = this.slides[slide].elements[element].action.metadata;

        elementCopyrights = undefined;
        if (instance.getCopyrights !== undefined) {
          // Use the instance's own copyright generator
          elementCopyrights = instance.getCopyrights();
        }
        if (elementCopyrights === undefined) {
          // Create a generic flat copyright list
          elementCopyrights = new H5P.ContentCopyrights();
          // In metadata alone there's no way of knowing what the machineName is.
          H5P.findCopyrights(elementCopyrights, params, this.contentId, {metadata: metadata, machineName: instance.libraryInfo.machineName});
        }
        var label = (element + 1);
        if (params.contentName !== undefined) {
          label += ': ' + params.contentName;
        }
        else if (instance.getTitle !== undefined) {
          label += ': ' + instance.getTitle();
        }
        else if (params.l10n && params.l10n.name) {
          label += ': ' + params.l10n.name;
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
    if (child && child.getXAPIData) {
      return child.getXAPIData();
    }
  }).filter(data => !!data);

  return {
    statement: xAPIEvent.data.statement,
    children: childrenXAPIData
  };
};

/**
 * Get context data.
 * Contract used for confusion report.
 */
CoursePresentation.prototype.getContext = function () {
  var self = this;

  // Get current slide number here it starts with zero
  const slide = (self.currentSlideIndex + 1);
  return {
    type: 'slide',
    value: slide
  };
};

export default CoursePresentation;
