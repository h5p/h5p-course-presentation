import ConfirmationDialog from './confirmation-dialog';

const Printer = (function ($) {
  /**
   * Printer class
   * @class Printer
   */
  function Printer() {}

  /** @constant {number} BACKGROUND_LOADING_TIMEOUT_MS Timeout in milliseconds to wait for background images to load. */
  const BACKGROUND_LOADING_TIMEOUT_MS = 2000;

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

    // Use 670px as width when printing
    var ratio = slideWidth / 670;
    var $slides = $('.h5p-slide');

    $slides.css({
      height: slideHeight / ratio + 'px',
      width: '670px',
      fontSize: Math.floor(100 / ratio) + '%'
    });

    $('.h5p-summary-slide').css('height', '');
    $('.h5p-summary-slide').css('margin-top', '1rem');

    const style = window.getComputedStyle($wrapper[0]);
    const wrapperHeight = parseFloat(style.getPropertyValue('height'));
    $wrapper.css('height', 'max-content');

    // Let printer css know which slides to print:
    $slides.toggleClass('doprint', allSlides === true);
    $currentSlide.addClass('doprint');

    /**
     * Creates an image loading promise.
     * @param {string} src Image source URL.
     * @returns {Promise} Promise that resolves when image loads or errors.
     */
    const loadImage = (src) => {
      return new Promise((resolve) => {
        const image = new Image();
        const handleLoad = () => resolve();
        image.addEventListener('load', handleLoad, { once: true });
        image.addEventListener('error', handleLoad, { once: true });
        image.src = src;
      });
    };

    /**
     * Gets background image URLs from a slide.
     * @param {HTMLElement} slide The slide element.
     * @returns {string[]} Array of background image URLs.
     */
    const getBackgroundImageUrls = (slide) => {
      const computedStyle = window.getComputedStyle(slide);
      const backgroundImage = computedStyle.backgroundImage;

      if (!backgroundImage || backgroundImage === 'none') {
        return [];
      }

      const urls = backgroundImage.match(/url\(['"]?([^'")]+)['"]?\)/g);
      return urls ? urls.map(url => url.match(/url\(['"]?([^'")]+)['"]?\)/)[1]) : [];
    };

    /**
     * Gets incomplete images from a slide.
     * @param {HTMLElement} slide The slide element.
     * @returns {HTMLImageElement[]} Array of incomplete images.
     */
    const getIncompleteImages = (slide) => {
      const images = slide.querySelectorAll('img');
      return Array.from(images).filter(image => !image.complete);
    };

    /* Ensures all backgrounds to be loaded (workaround for Chromium) */
    const waitForBackgroundsToLoad = () => {
      return new Promise((resolve) => {
        const slides = document.querySelectorAll('.h5p-slide.doprint');
        const imagePromises = [];

        slides.forEach(slide => {
          const backgroundUrls = getBackgroundImageUrls(slide);
          backgroundUrls.forEach(src => {
            imagePromises.push(loadImage(src));
          });

          const incompleteImages = getIncompleteImages(slide);
          incompleteImages.forEach(image => {
            imagePromises.push(loadImage(image.src));
          });
        });

        // Set up timeout fallback
        const timeoutPromise = new Promise((resolve) => {
          setTimeout(() => {
            console.warn('Background loading timeout, proceeding with print');
            resolve();
          }, BACKGROUND_LOADING_TIMEOUT_MS);
        });

        Promise.race([
          Promise.all(imagePromises),
          timeoutPromise
        ]).then(resolve);
      });
    };

    const resetCSS = function () {
      $slides.css({
        height: '',
        width: '',
        fontSize: ''
      });
      $wrapper.css('height', wrapperHeight + 'px');
      // Let CP know we are finished printing
      cp.trigger('printing', { finished: true });
    };

    // Wait for backgrounds, then print
    setTimeout(async function () {
      // Wait for all background images to load
      await waitForBackgroundsToLoad();

      // Additional delay to ensure rendering
      setTimeout(() => {
        // Do the actual printing
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
      }, 100);

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
