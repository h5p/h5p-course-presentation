var H5P = H5P || {};

/**
 * Constructor.
 * 
 * @param {object} params Start paramteres.
 * @param {int} id Content identifier
 * @returns {undefined} Nothing.
 */
H5P.CoursePresentation = function (params, id) {
  this.slides = params.slides;
  this.contentPath = H5P.getContentPath(id);
  
  this.ratio = 640 / 400;
};

/**
 * Render the presentation inside the given container.
 * 
 * @param {H5P.jQuery} $container Container for this presentation.
 * @returns {undefined} Nothing.
 */
H5P.CoursePresentation.prototype.attach = function ($container) {
  var that = this;

  var html = '' +
'<div class="h5p-wrapper" tabindex="0">' +
  '<div class="h5p-presentation-wrapper">' +
    '<div class="h5p-slides-wrapper h5p-animate"></div>' +
    '<div class="h5p-keywords-wrapper"></div>' +
  '</div>' +
  '<div class="h5p-slideination">' +
    '<a href="#" class="h5p-previous" title="Previous slide">Prev</a>' +
    '<a href="#" class="h5p-scroll-left" title="Scroll - left">&lt;</a>' +
    '<ol></ol>' +
    '<a href="#" class="h5p-scroll-right" title="Scroll - right">&gt;</a>' +
    '<a href="#" class="h5p-next" title="Next slide">Next</a>'
  '</div>' +
'</div>';
  
  $container.addClass('h5p-course-presentation').html(html);
  
  this.$container = $container;
  this.$wrapper = $container.children('.h5p-wrapper').focus(function () {
    that.initKeyEvents();
  }).blur(function () {
    H5P.jQuery('body').unbind('keydown');
  }).click(function () {
    that.$wrapper.focus();
  });
  
  this.$presentationWrapper = this.$wrapper.children('.h5p-presentation-wrapper');
  this.$slidesWrapper = this.$presentationWrapper.children('.h5p-slides-wrapper');
  var $keywordsWrapper = this.$presentationWrapper.children('.h5p-keywords-wrapper');
  var $slideination = this.$wrapper.children('.h5p-slideination');
  var keywords = '';
  var slideinationSlides = '';
  
  for (var i = 0; i < this.slides.length; i++) {
    var slide = this.slides[i];
    var $slide = H5P.jQuery(H5P.CoursePresentation.createSlide(slide)).appendTo(this.$slidesWrapper);
    var first = i === 0;
    
    if (first) {
      this.$current = $slide.addClass('h5p-current');
    }
    
    this.addElements($slide, slide.elements);
    keywords += this.keywordsHtml(slide.keywords, first);
    
    slideinationSlides += H5P.CoursePresentation.createSlideinationSlide(i + 1, first);
  }
  
  // Initialize keywords
  if (keywords) {
    this.$keywords = $keywordsWrapper.html('<ol>' + keywords + '</ol>').children('ol');
    this.$currentKeyword = this.$keywords.children('.h5p-current');
  }
  
  // Initialize touch events
  this.initTouchEvents();
  
  // Slideination
  this.initSlideination($slideination, slideinationSlides);

  H5P.$window.resize(function() {
    that.resize(false); 
 });
  this.resize(false);
};

H5P.CoursePresentation.prototype.resize = function (fullscreen) {
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
    fontSize: (16 * (width / 640)) + 'px'
  });
  
  if (fullscreen) {
    this.$wrapper.focus();
  }
};

/**
 * Add elements to the given slide.
 * 
 * @param {H5P.jQuery} $slide The slide.
 * @param {Array} elements List of elements to add.
 * @returns {undefined} Nothing.
 */
H5P.CoursePresentation.prototype.addElements = function ($slide, elements) {
  if (elements === undefined || !elements.length) {
    return;
  }
  
  for (var i = 0; i < elements.length; i++) {
    var element = elements[i];
    var elementInstance = new (H5P.classFromName(element.action.library.split(' ')[0]))(element.action.params, this.contentPath);
    elementInstance.appendTo($slide, element.width, element.height, element.x + 32.8125, element.y);
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
  var that = this;
  var wait = false;
  
  H5P.jQuery('body').keydown(function (event) {
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
  });
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
      if (moved > 100) {
        that.nextSlide();
      }
      else if (moved < -100) {
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
H5P.CoursePresentation.createSlideinationSlide = function (index, first) {
  var html =  '<li';
  
  if (first !== undefined && first) {
    html += ' class="h5p-current"';
  }
  html += '><a href="#" title="Jump to slide">';
  
  if (index !== undefined) {
    html += index;
  }
  
  return html + '</a></li>';
};
