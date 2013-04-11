var H5P = H5P || {};

/**
 * Constructor.
 *
 * @param {object} params Start paramteres.
 * @param {int} id Content identifier
 * @returns {undefined} Nothing.
 */
H5P.CoursePresentation = function (params, id) {
  this.swipeThreshold = 100; // px
  
  this.slides = params.slides;
  this.slidesWithSolutions = [];
  
  this.l10n = params.l10n !== undefined ? params.l10n : {
    // Defaults
    prev: "Prev",
    prevSlide: "Previous slide",
    scrollLeft: "Scroll - left",
    jumpToSlide: "Jump to slide",
    scrollRight: "Scroll - right",
    next: "Next",
    nextSlide: "Next slide"
  };
  this.contentPath = H5P.getContentPath(id);
};

/**
 * Render the presentation inside the given container.
 *
 * @param {H5P.jQuery} $container Container for this presentation.
 * @returns {undefined} Nothing.
 */
H5P.CoursePresentation.prototype.attach = function ($container) {
  var that = this;

  var html = '<div class="h5p-wrapper" tabindex="0">'
           + '<div class="h5p-presentation-wrapper">'
           + '<div class="h5p-slides-wrapper h5p-animate"></div>'
           + '<div class="h5p-keywords-wrapper"></div>'
           + '</div>'
           + '<div class="h5p-slideination">'
           + '<a href="#" class="h5p-previous" title="' + this.l10n.prevSlide + '">' + this.l10n.prev + '</a>'
           + '<a href="#" class="h5p-scroll-left" title="' + this.l10n.scrollLeft + '">&lt;</a>'
           + '<ol></ol>'
           + '<a href="#" class="h5p-scroll-right" title="' + this.l10n.scrollRight + '">&gt;</a>'
           + '<a href="#" class="h5p-next" title="' + this.l10n.nextSlide + '">' + this.l10n.next + '</a>'
           + '</div>'
           + '<a href="#" class="h5p-show-solutions" style="display: none;" title="">Show solutions</a>'
           + '</div>';

  $container.addClass('h5p-course-presentation').html(html);

  this.$container = $container;
  this.$wrapper = $container.children('.h5p-wrapper').focus(function () {
    that.initKeyEvents();
  }).blur(function () {
    H5P.jQuery('body').unbind('keydown', that.keydown);
    delete that.keydown;
  }).click(function (event) {
    var $target = $(event.target);  // TODO: Use H5P.jQuery? Also jQuery selector are very slow and should be avoided if possible.
    if (!$target.is("input, textarea")) {
      // Add focus to the wrapper so that it may capture keyboard events
      that.$wrapper.focus();
    }
  });

  this.width = parseInt(this.$wrapper.css('width'));
  this.height = parseInt(this.$wrapper.css('height'));
  this.ratio = this.width / this.height;
  this.fontSize = parseInt(this.$wrapper.css('fontSize'));

  this.$presentationWrapper = this.$wrapper.children('.h5p-presentation-wrapper');
  this.$slidesWrapper = this.$presentationWrapper.children('.h5p-slides-wrapper');
  var $keywordsWrapper = this.$presentationWrapper.children('.h5p-keywords-wrapper');
  this.$slideination = this.$wrapper.children('.h5p-slideination');
  var $solutionsButton = this.$wrapper.children('.h5p-show-solutions');

  var keywords = '';
  var slideinationSlides = '';

  for (var i = 0; i < this.slides.length; i++) {
    var slide = this.slides[i];
    var $slide = H5P.jQuery(H5P.CoursePresentation.createSlide(slide)).appendTo(this.$slidesWrapper);
    var first = i === 0;

    if (first) {
      this.$current = $slide.addClass('h5p-current');
    }

    this.addElements(i, $slide, slide.elements);
    keywords += this.keywordsHtml(slide.keywords, first);

    slideinationSlides += H5P.CoursePresentation.createSlideinationSlide(i + 1, this.l10n.jumpToSlide, first);
  }

  // Initialize keywords
  if (keywords) {
    this.$keywords = $keywordsWrapper.html('<ol>' + keywords + '</ol>').children('ol');
    this.$currentKeyword = this.$keywords.children('.h5p-current');
    this.keywordsWidth = $keywordsWrapper.width() / (this.width / 100); // %
  }
  else {
    this.keywordsWidth = 0;
  }

  // Initialize touch events
  this.initTouchEvents();

  // Slideination
  this.initSlideination(this.$slideination, slideinationSlides);

  $solutionsButton.click(function(event) {
    that.showSolutions();
    event.preventDefault();
  });

  H5P.$window.resize(function() {
    that.resize(false);
 });
  this.resize(false);
};

H5P.CoursePresentation.prototype.resize = function (fullscreen) {
  var fullscreenOn = H5P.$body.hasClass('h5p-fullscreen') || H5P.$body.hasClass('h5p-semi-fullscreen');
  if (!fullscreenOn) {
    this.$container.css('height', '99999px');
  }
  
  var width = this.$container.width();
  var height = this.$container.height();

  if (width / height >= this.ratio) {
    // Wider
    width = height * this.ratio;

  }
  else {
    // Narrower
    height = width / this.ratio;
  }

  this.$wrapper.css({
    width: width + 'px',
    height: height + 'px',
    fontSize: (this.fontSize * (width / this.width)) + 'px'
  });

  if (fullscreen) {
    this.$wrapper.focus();
  }
  if (!fullscreenOn) {
    this.$container.css('height', '');
  }
};

/**
 * Add elements to the given slide and stores elements with solutions
 *
 * @param {H5P.jQuery} $slide The slide.
 * @param {Array} elements List of elements to add.
 * @returns {undefined} Nothing.
 */
H5P.CoursePresentation.prototype.addElements = function (slideIndex, $slide, elements) {
  if (elements === undefined || !elements.length) {
    return;
  }

  for (var i = 0; i < elements.length; i++) {
    var element = elements[i];
    var elementInstance = new (H5P.classFromName(element.action.library.split(' ')[0]))(element.action.params, this.contentPath);
    var $h5pElementContainer = $('<div class="h5p-element" style="left: ' + parseInt(element.x) + '%; top: ' + element.y + '%; width: ' + element.width + '%; height: ' + element.height + '%;"></div>').appendTo($slide);
    elementInstance.attach($h5pElementContainer);
    if (this.hasSolutions(elementInstance)) {
      if (typeof this.slidesWithSolutions[slideIndex] === 'undefined') { // TODO: this.slidesWithSolutions[slideIndex] === undefined  MUCH FASTER!
        this.slidesWithSolutions[slideIndex] = [];
      }
      this.slidesWithSolutions[slideIndex].push(elementInstance) // TODO: Use semicolon on line endings.
    }
  }
};

/**
 * Does the element have a solution?
 *
 * @param {H5P library instance} elementInstance
 * @returns {Boolean}
 *  true if the element has a solution
 *  false otherwise
 */
H5P.CoursePresentation.prototype.hasSolutions = function (elementInstance) {
  // TODO: Checking again undefined is MUCH faster and consumes less memory since you don't have to do a type lookup and declare a string.
  if (typeof elementInstance.showSolutions === 'function') {
    return true;
  }
  else {
    // TODO: Add check for solutionText when the solution text issue is closed
    return false;
  }
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

  if (keywords !== undefined && keywords.length) {
    for (var i = 0; i < keywords.length; i++) {
      var keyword = keywords[i];

      html += '<li><span>' + keyword.main + '</span>';

      if (keyword.subs !== undefined && keyword.subs.length) {
        html += '<ol>';
        for (var j = 0; j < keyword.subs.length; j++) {
          html += '<li><span>' + keyword.subs[j] + '</span></li>';
        }
        html += '</ol>';
      }
      html += '</li>';
    }
    if (html) {
      html = '<ol>' + html + '</ol>';
    }
  }

  return '<li' + (first ? ' class="h5p-current"' : '') + '>' + html + '</li>';
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

  this.$slidesWrapper.bind('touchstart', function (event) {
    // Disable animations when touching
    that.$slidesWrapper.removeClass('h5p-animate');

    // Set start positions
    startX = event.originalEvent.touches[0].pageX;
    startY = event.originalEvent.touches[0].pageY;
    prevX = parseInt(that.$current.prev().css('left'));
    nextX = parseInt(that.$current.next().css('left'));

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
      that.$current.next().css('left', '');
      that.$current.prev().css('left', prevX - movedX);
    }
    else {
      // Move next slide
      that.$current.prev().css('left', '');
      that.$current.next().css('left', nextX - movedX);
    }

    // Move current slide
    that.$current.css('left', -movedX);

  }).bind('touchend', function () {
    // Enable animations again
    that.$slidesWrapper.addClass('h5p-animate');

    if (!scroll) {
      // If we're not scrolling detemine if we're changing slide
      var moved = startX - lastX;
      if (moved > that.swipeThreshold) {
        that.nextSlide();
      }
      else if (moved < -that.swipeThreshold) {
        that.previousSlide();
      }
    }

    // Remove touch moving.
    that.$slidesWrapper.children().css('left', '');
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
  var timer;

  // Slide selector
  this.$slideinationSlides = $ol.html(slideinationSlides).children('li').children('a').click(function () {
    that.jumpToSlide(H5P.jQuery(this).text() - 1);

    return false;
  }).end().end();
  this.$currentSlideinationSlide = this.$slideinationSlides.children('.h5p-current');

  var disableClick = function () {
    return false;
  };
  var scrollLeft = function (event) {
    event.preventDefault();
    timer = setInterval(function () {
      $ol.scrollLeft($ol.scrollLeft() - 1);
    }, 1);
  };
  var scrollRight = function (event) {
    event.preventDefault();
    timer = setInterval(function () {
      $ol.scrollLeft($ol.scrollLeft() + 1);
    }, 1);
  };
  var stopScroll = function () {
    clearInterval(timer);
  };

  // Scroll slide selector to the left
  $slideination.children('.h5p-scroll-left').click(disableClick).mousedown(scrollLeft).mouseup(stopScroll).bind('touchstart', scrollLeft).bind('touchend', stopScroll);

  // Scroll slide selector to the right
  $slideination.children('.h5p-scroll-right').click(disableClick).mousedown(scrollRight).mouseup(stopScroll).bind('touchstart', scrollRight).bind('touchend', stopScroll);

  // Previous slide button
  $slideination.children('.h5p-previous').click(function () {
    that.previousSlide();
    return false;
  });

  // Next slide button
  $slideination.children('.h5p-next').click(function () {
    that.nextSlide();
    return false;
  });
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
  // Jump to slide
  this.$current.removeClass('h5p-current');
  this.$current = this.$slidesWrapper.children().removeClass('h5p-previous').filter(':lt(' + slideNumber + ')').addClass('h5p-previous').end().eq(slideNumber).addClass('h5p-current');

  // Jump keywords
  if (this.$keywords !== undefined) {
    this.$currentKeyword.removeClass('h5p-current');
    this.$currentKeyword = this.$keywords.children(':eq(' + slideNumber + ')').addClass('h5p-current');

    if (!noScroll) {
      this.scrollToKeywords();
    }
  }

  this.jumpSlideination(slideNumber, noScroll);

  // Show show solutions button on last slide
  if (slideNumber === this.slides.length - 1) {
    $('.h5p-show-solutions', this.$container).show();
  }
  else {
    $('.h5p-show-solutions', this.$container).hide();
  }

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
 * @param {int} first Optional
 * @returns {String}
 */
H5P.CoursePresentation.createSlideinationSlide = function (index, title, first) {
  var html =  '<li class="h5p-slide-button'; // TODO: Adding unnecessary classes weighs the DOM down.

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
 * Show solutions for all slides that have solutions
 *
 * @param {jQuery event} event
 *  event object (From the click event)
 */
H5P.CoursePresentation.prototype.showSolutions = function () {
  var jumpedToFirst = false;
  for (var i = 0; i < this.slidesWithSolutions.length; i++) {
    if (typeof this.slidesWithSolutions[i] === 'object') { // TODO: even instanceof is faster!
      $('.h5p-slideination .h5p-slide-button', this.$container).eq(i).addClass('h5p-has-solutions'); // TODO: Use this.$slideinationSlides.children(':eq(' + i + ')'); Much faster!
      if (!jumpedToFirst) {
        this.jumpToSlide(i, false);
        jumpedToFirst = true;
      }
      for (var j = 0; j < this.slidesWithSolutions[i].length; j++) {
        var elementInstance = this.slidesWithSolutions[i][j];
        elementInstance.showSolutions();
      }
    }
  }
};
