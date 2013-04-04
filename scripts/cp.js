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
};

/**
 * Render the presentation inside the given container.
 * 
 * @param {H5P.jQuery} $container Container for this presentation.
 * @returns {undefined} Nothing.
 */
H5P.CoursePresentation.prototype.attach = function ($container) {
  $container.addClass('h5p-course-presentation').html('<div class="h5p-wrapper"><div class="h5p-presentation-wrapper"><div class="h5p-slides-wrapper h5p-animate"></div><div class="h5p-keywords-wrapper"></div></div><div class="h5p-slideination"><a href="#" class="h5p-previous">Prev</a><a href="#" class="h5p-scroll-left">&lt;</a><ol></ol><a href="#" class="h5p-scroll-right">&gt;</a><a href="#" class="h5p-next">Next</a></div></div>');
  this.$wrapper = $container.children('.h5p-wrapper');
  this.$presentationWrapper = this.$wrapper.children('.h5p-presentation-wrapper');
  this.$slidesWrapper = this.$presentationWrapper.children('.h5p-slides-wrapper');
  var $keywordsWrapper = this.$presentationWrapper.children('.h5p-keywords-wrapper');
  var $slideination = this.$wrapper.children('.h5p-slideination');
  var keywords = '';
  var slideinationSlides = '';
  
  for (var i = 0; i < this.slides.length; i++) {
    var slide = this.slides[i];
    var $slide = H5P.jQuery('<div class="h5p-slide"></div>').appendTo(this.$slidesWrapper);
    var first = i === 0;
    
    if (first) {
      this.$current = $slide.addClass('h5p-current');
    }
    
    this.addElements($slide, slide.elements);
    keywords += this.keywordsHtml(slide.keywords, first);
    
    slideinationSlides += '<li' + (first ? ' class="h5p-current"' : '') + '><a href="#">' + (i + 1) + '</a></li>';
  }
  
  this.$slides = this.$slidesWrapper.children();
  
  // Initialize keywords
  if (keywords) {
    this.$keywords = $keywordsWrapper.html('<ol>' + keywords + '</ol>').children('ol').children('li');
    this.$currentKeyword = this.$keywords.filter('.h5p-current');
  }

  // Initialize key events
  this.initKeyEvents();
  
  // Initialize touch events
  this.initTouchEvents();
  
  // Slideination
  this.initSlideination($slideination, slideinationSlides);
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
    elementInstance.appendTo($slide, element.width, element.height, element.x + 210, element.y);
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
          html += '<li>' + keyword.subs[j] + '</li>';
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
      that.$current.next().removeAttr('style');
      that.$current.prev().css('left', prevX - movedX);
    }
    else {
      // Move next slide
      that.$current.prev().removeAttr('style');
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
    that.$slides.removeAttr('style');
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
  }).end();
  this.$currentSlideinationSlide = this.$slideinationSlides.filter('.h5p-current');
  
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
 * @returns {Boolean} Indicates if the move was made.
 */
H5P.CoursePresentation.prototype.previousSlide = function () {
  var $prev = this.$current.prev();
  if (!$prev.length) {
    return false;
  }
  
  return this.jumpToSlide($prev.index());
};

/**
 * Switch to next slide.
 * 
 * @returns {Boolean} Indicates if the move was made.
 */
H5P.CoursePresentation.prototype.nextSlide = function () {
  var $next = this.$current.next();
  if (!$next.length) {
    return false;
  }

  return this.jumpToSlide($next.index());
};

/**
 * Jump to the given slide.
 * 
 * @param {type} slideNumber The slide number to jump to.
 * @returns {Boolean} Always true.
 */
H5P.CoursePresentation.prototype.jumpToSlide = function (slideNumber) {
  var $parent;
  var isiPad = navigator.userAgent.match(/iPad/i) !== null;
  
  // Jump to slide
  this.$current.removeClass('h5p-current');
  this.$current = this.$slides.removeClass('h5p-previous').filter(':lt(' + slideNumber + ')').addClass('h5p-previous').end().eq(slideNumber).addClass('h5p-current');
  
  // Jump keywords
  if (this.$keywords !== undefined) {
    this.$currentKeyword.removeClass('h5p-current');
    this.$currentKeyword = this.$keywords.eq(slideNumber).addClass('h5p-current');
    
    if (isiPad) {
    // scrollTop animations does not work well on ipad.
    // TODO: Check on iPhone.
      $parent = this.$currentKeyword.parent();
      $parent.scrollTop($parent.scrollTop() + this.$currentKeyword.position().top - 8);
    }
    else {
      this.$currentKeyword.parent().stop().animate({scrollTop: '+=' + (this.$currentKeyword.position().top - 8)}, 250);
    }
  }
  
  // Jump slideination
  this.$currentSlideinationSlide.removeClass('h5p-current');
  this.$currentSlideinationSlide = this.$slideinationSlides.eq(slideNumber).addClass('h5p-current');
  
  $parent = this.$currentSlideinationSlide.parent();
  if (isiPad) {
    $parent.scrollLeft(this.$currentSlideinationSlide.position().left - ($parent.width() / 2) + 17 + $parent.scrollLeft());
  }
  else {
    $parent.animate({scrollLeft: '+=' + (this.$currentSlideinationSlide.position().left - ($parent.width() / 2) + 17)}, 250);
  }
  
  return true;
};