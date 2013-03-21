var H5P = H5P || {};

/**
 * 
 * @param {type} params
 * @param {type} id
 * @returns {undefined}
 */
H5P.CoursePresentation = function (params, id) {
  console.log(params, id);
  
  this.slides = params.slides;
  this.contentPath = H5P.getContentPath(10);
};

/**
 * 
 * @param {type} $container
 * @returns {undefined}
 */
H5P.CoursePresentation.prototype.attach = function ($container) {
  $container.html('<div class="wrapper"><div class="slides-wrapper animate"></div><div class="keywords"></div></div>');
  var $wrapper = $container.children('.wrapper');
  this.$slidesWrapper = $wrapper.children('.slides-wrapper');
  this.$keywords = $wrapper.children('.keywords');
  var keywords = '';
  
  for (var i = 0; i < this.slides.length; i++) {
    var slide = this.slides[i];
    var $slide = H5P.jQuery('<div class="slide"></div>').appendTo(this.$slidesWrapper);
    
    if (i === 0) {
      this.$current = $slide.addClass('current');
    }
    
    if (slide.elements !== undefined && slide.elements.length) {
      for (var j = 0; j < slide.elements.length; j++) {
        var element = slide.elements[j];
        var elementInstance = new (H5P.classFromName(element.action.library.split(' ')[0]))(element.action.params);
        elementInstance.appendTo($slide, element.width, element.height, element.x, element.y);
      }
    }
    
    keywords += this.keywordsHtml(slide.keywords);
  }
  
  this.$slides = this.$slidesWrapper.children();
  if (keywords) {
    this.$keywords.html('<ol>' + keywords + '</ol>');
  }

  // Initialize key events
  this.initKeyEvents();
  
  // Initialize touch events
  this.initTouchEvents();
};

/**
 * Generate html for keywords.
 * 
 * @param {type} keywords
 * @returns {String}
 */
H5P.CoursePresentation.prototype.keywordsHtml = function (keywords) {
  var html = '';
  
  if (keywords !== undefined && keywords.length) {
    for (var i = 0; i < keywords.length; i++) {
      var keyword = keywords[i];
      html += '<li><span>' + keyword.main + '</span>';
      if (keyword.subs !== undefined && keyword.subs.length) {
        html += '<ol>';
        for (var k = 0; k < keyword.subs.length; k++) {
          html += '<li>' + keyword.subs[k] + '</li>';
        }
        html += '</ol>';
      }
      html += '</li>';
    }
    if (html) {
      html = '<ol>' + html + '</ol>';
    }
  }
  
  return '<li>' + html + '</li>';
};

/**
 * Initialize key press events.
 * 
 * @returns {undefined}
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
 * @returns {undefined}
 */
H5P.CoursePresentation.prototype.initTouchEvents = function () {
  var that = this;
  var startX, startY, lastX, prevX, nextX, scroll;
 
  this.$slidesWrapper.bind('touchstart', function (event) {
    // Disable animations when touching
    that.$slidesWrapper.removeClass('animate');
    
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
    that.$slidesWrapper.addClass('animate');
    
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
 * Switch to previous slide
 *
 * @returns {Boolean} 
 */
H5P.CoursePresentation.prototype.previousSlide = function () {
  var $prev = this.$current.prev();
  if (!$prev.length) {
    return false;
  }
  
  this.$current.removeClass('current');
  this.$current = $prev.addClass('current').removeClass('previous');
  return true;
};

/**
 * Switch to next slide.
 * 
 * @returns {Boolean}
 */
H5P.CoursePresentation.prototype.nextSlide = function () {
  var $next = this.$current.next();
  if (!$next.length) {
    return false;
  }
  
  this.$current.removeClass('current').addClass('previous');
  this.$current = $next.addClass('current');
  return true;
};