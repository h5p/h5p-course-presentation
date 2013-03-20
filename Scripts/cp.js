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
  var that = this;
  
  var slides = '';
  for (var i = 0; i < this.slides.length; i++) {
    slides += '<div class="slide';
    if (i === 0) {
      slides += ' current';
    }
    slides += '">Slide ' + i + '</div>';
  }
  
  $container.html('<div class="wrapper">' + slides + '</div>');
  this.$current = $container.find('.current');
  
  var wait = false;
  H5P.jQuery('body').keydown(function (event) {
    if (wait) {
      return;
    }
    
    if (event.keyCode === 37 && that.previousSlide()) {
      wait = true;
    }
    else if (event.keyCode === 39 && that.nextSlide()) {
      wait = true;
    }
    
    if (wait) {
      setTimeout(function () {
        wait = false;
      }, 1200);
    }
  });
};

H5P.CoursePresentation.prototype.previousSlide = function () {
  var $prev = this.$current.prev();
  if (!$prev.length) {
    return false;
  }
  
  this.$current.removeClass('current');
  this.$current = $prev.addClass('current').removeClass('previous');
  return true;
};

H5P.CoursePresentation.prototype.nextSlide = function () {
  var $next = this.$current.next();
  if (!$next.length) {
    return false;
  }
  
  this.$current.removeClass('current').addClass('previous');
  this.$current = $next.addClass('current');
  return true;
};