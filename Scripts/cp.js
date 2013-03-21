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
  var slides = '';
  for (var i = 0; i < this.slides.length +1; i++) {
    slides += '<div class="slide';
    if (i === 0) {
      slides += ' current';
    }
    slides += '">Slide ' + i + ' <a href="#">CLICK</a></div>';
  }
  
  $container.html('<div class="wrapper animate">' + slides + '</div>');
  this.$wrapper = $container.children('.wrapper');
  this.$slides = this.$wrapper.children('.slide');
  this.$current = this.$slides.filter('.current');

  // Initialize key events
  this.initKeyEvents();
  
  // Initialize touch events
  this.initTouchEvents();
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
 
  this.$wrapper.bind('touchstart', function (event) {
    // Disable animations when touching
    that.$wrapper.removeClass('animate');
    
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
    that.$wrapper.addClass('animate');
    
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