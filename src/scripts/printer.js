import ConfirmationDialog from './confirmation-dialog';

const Printer = (function ($) {
  /**
   * Printer class
   * @class Printer
   */
  function Printer() {}

  /**
   * Check if printing is supported
   *
   * @method supported
   * @static
   * @return {boolean} True if supported, else false.
   */
  Printer.supported = function () {
    // Need window.print to be available
    return (typeof window.print === 'function');
  };

  /**
   * Do the actual printing
   *
   * @method print
   * @static
   * @param  {H5P.CoursePresentation} cp Reference to cp instance
   * @param  {H5P.jQuery} $wrapper  The CP dom wrapper
   * @param  {boolean} allSlides If true, all slides are printed. If false or
   *                             undefined, the currentSlide is printed.
   */
  Printer.print = function (cp, $wrapper, allSlides) {
    // Let CP know we are about to print
    cp.trigger('printing', { finished: false, allSlides: allSlides });

    // Find height of a slide:
    var $currentSlide = $('.h5p-slide.h5p-current');
    var slideHeight = $currentSlide.height();
    var slideWidth = $currentSlide.width();

    // Use 670px as width when printing. We can't use 100% percent, since user can
    // change between landscape and portrait without us ever knowing about it.
    // More info: http://stackoverflow.com/a/11084797/2797106
    var ratio = slideWidth / 670;
    var $slides = $('.h5p-slide');

    $slides.css({
      height: slideHeight / ratio + 'px',
      width: '670px',
      fontSize: Math.floor(100 / ratio) + '%'
    });

    $('.h5p-summary-slide').css('height', '');
    const starDisplay = $('.h5p-joubelui-score-bar-star').css('display');
    $('.h5p-joubelui-score-bar-star').css('display', 'none');

    var wrapperHeight = $wrapper.height();
    $wrapper.css('height', 'auto');

    // Let printer css know which slides to print:
    $slides.toggleClass('doprint', allSlides === true);
    $currentSlide.addClass('doprint');

    const resetCSS = function () {
      $slides.css({
        height: '',
        width: '',
        fontSize: ''
      });
      $wrapper.css('height', wrapperHeight + 'px');
      $('.h5p-joubelui-score-bar-star').css('display', starDisplay);

      // Let CP know we are finished printing
      cp.trigger('printing', { finished: true });
    };

    // Need timeout for some browsers.
    setTimeout(function () {
      // Do the actual printing of the iframe content
      window.focus();
      window.print();

      // Need additional timeout for ios and MacOS
      if (/iPad|iPhone|Macintosh|MacIntel|MacPPC|Mac68K/.test(navigator.userAgent)) {
        setTimeout(function () {
          resetCSS();
        }, 1500);
      }
      else {
        resetCSS();
      }
    }, 500);
  };

  /**
   * Show the print dialog.
   * @method showDialog
   * @param {object} texts Translated texts
   * @param {function} callback Function invoked when printing is done.
   * @param {number|string} contentId Content id.
   */
  Printer.showDialog = function (texts, callback, contentId) {
    const confirmationDialog = ConfirmationDialog(
      {
        headerText: texts.printTitle,
        dialogText: texts.printIngress,
        cancelText: texts.printCurrentSlide,
        confirmText: texts.printAllSlides,
        theme: true,
        classes: ['h5p-print-dialog']
      },
      contentId
    );

    confirmationDialog.on('canceled', (event) => {
      if (event.data.wasExplicitChoice) {
        callback(false); // The "cancel" button was clicked, here working as "print current slide"
      }
      return false;
    });

    confirmationDialog.on('confirmed', () => {
      callback(true);
      return false;
    });
  };

  return Printer;

})(H5P.jQuery);

export default Printer;
