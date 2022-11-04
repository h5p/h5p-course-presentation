import Element from './element.js';
import Parent from 'h5p-parent';

/**
 * @class
 */
function Slide(parameters) {
  const self = this;
  Parent.call(self, Element, parameters.elements);
  
  this.elements = [];
  
  // The slide DOM element when attached
  let $wrapper;

  /**
   * Create HTML
   *
   * @return {jQuery} Element
   */
  self.getElement = function () {
    if (!$wrapper) {
      $wrapper = H5P.jQuery(Slide.createHTML(parameters));
    }
    return $wrapper;
  };

  /**
   * Make current slide
   */
  self.setCurrent = function () {
    this.parent.$current = $wrapper.addClass('h5p-current');
  };

  /**
   * Append all of the elements to the slide.
   */
  self.appendElements = function () {

    for (let i = 0; i < self.children.length; i++) {
      self.parent.attachElement(parameters.elements[i], self.children[i].instance, $wrapper, self.index);
    }

    self.parent.elementsAttached[self.index] = true;
    self.parent.trigger('domChanged', {
      '$target': $wrapper,
      'library': 'NDLAInteractiveBoard',
      'key': 'newSlide'
    }, {'bubbles': true, 'external': true});
  };
}

/**
 * Creates the HTML for a single slide.
 *
 * @param {Object} params Slide parameters.
 * @returns {string} HTML.
 */
Slide.createHTML = function (parameters) {
  const classNames = `h5p-slide ${parameters.aspectRatio ? ` h5p-slide-${parameters.aspectRatio}` : ''}`;
  const style = `${parameters.background ? 
  	`style="background:${parameters.background}"` : ''}`;

  return `<div
  	role="document"
  	class="${classNames}"
  	${style}
  	></div>`;
};

Slide.prototype.showSolutions = function() {  
  const answerButtons = this.getElement().find('.h5p-hotspot-answer');
  const slideHasAnswerButtons = answerButtons.length > 0;
  if (slideHasAnswerButtons) {
    this.isTask = true;
  }
}

export default Slide;
