import ConfirmationDialog from './confirmation-dialog';

const Printer = (function () {
  /**
   * Printer class
   * @class Printer
   */
  function Printer() {}

  /** @constant {number} BACKGROUND_LOADING_TIMEOUT_MS Timeout in milliseconds to wait for background images to load. */
  const BACKGROUND_LOADING_TIMEOUT_MS = 2000;

  /**
    * @constant {number} SLIDE_PRINT_WIDTH_PX Width in px to use when printing slides. Value derived from experience.
    * @see http://stackoverflow.com/a/11084797/2797106
    */
  const SLIDE_PRINT_WIDTH_PX = 670;

  /** @constant {number} INITIAL_PRINT_DELAY_MS Initial delay before starting the print process. */
  const INITIAL_PRINT_DELAY_MS = 500;

  /** @constant {number} RENDER_DELAY_MS Additional delay to ensure rendering before printing. */
  const RENDER_DELAY_MS = 100;

  /** @constant {number} IOS_MACOS_PRINT_DELAY_MS Extra delay needed for iOS and macOS after printing. */
  const IOS_MACOS_PRINT_DELAY_MS = 1500;

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
   * @param  {HTMLElement} wrapper  The CP dom wrapper
   * @param  {boolean} allSlides If true, all slides are printed. If false or
   *                             undefined, the currentSlide is printed.
   */
  Printer.print = function (cp, wrapper, allSlides) {
    // Let CP know we are about to print
    cp.trigger('printing', { finished: false, allSlides: allSlides });

    // Find height of a slide:
    const currentSlide = document.querySelector('.h5p-slide.h5p-current');
    const slideHeight = currentSlide.offsetHeight;
    const slideWidth = currentSlide.offsetWidth;

    const ratio = slideWidth / SLIDE_PRINT_WIDTH_PX;
    const slides = document.querySelectorAll('.h5p-slide');
    slides.forEach(slide => {
      slide.style.height = `${slideHeight / ratio}px`;
      slide.style.width = `${SLIDE_PRINT_WIDTH_PX}px`;
      slide.style.fontSize = `${Math.floor(100 / ratio)}%`;
    });

    const style = window.getComputedStyle(wrapper);
    const wrapperHeight = parseFloat(style.getPropertyValue('height'));
    wrapper.style.height = 'max-content';

    // Let printer css know which slides to print:
    slides.forEach(slide => {
      if (allSlides === true) {
        slide.classList.add('doprint');
      } else {
        slide.classList.remove('doprint');
      }
    });
    currentSlide.classList.add('doprint');

    /**
     * Prepare DOM for printing by hiding non-print elements.
     * @param {HTMLElement} sourceElement The source element to clone and print.
     * @returns {function} Cleanup function to restore original state.
     */
    const prepareDOMForPrinting = (sourceElement) => {
      const printElement = cloneDOMNode(sourceElement);

      const bodyChildren = Array.from(document.body.children);
      const originalState = bodyChildren.map(child => ({
        element: child,
        display: child.style.display,
      }));

      bodyChildren.forEach(child => {
        if (!printElement.contains(child)) {
          child.style.display = 'none';
        }
      });

      document.body.appendChild(printElement);

      // Return cleanup function to restore original state
      return () => {
        originalState.forEach(({ element, display }) => {
          element.style.display = display;
        });

        printElement.remove();
      };
    };

    /**
     * Clone a DOM node with all custom CSS properties copied recursively.
     * @param {HTMLElement} sourceElement The element to clone.
     * @returns {HTMLElement} The cloned element with custom properties.
     */
    const cloneDOMNode = (sourceElement) => {
      const clone = sourceElement.cloneNode(true);

      // Copy custom css properties recursively, not handled by cloneNode
      const sourceStyle = window.getComputedStyle(sourceElement);
      const targetStyle = clone.style;

      for (let i = 0; i < sourceStyle.length; i++) {
        const propertyName = sourceStyle[i];
        if (propertyName.startsWith('--')) {
          targetStyle.setProperty(propertyName, sourceStyle.getPropertyValue(propertyName));
        }
      }

      const sourceChildren = sourceElement.children;
      const targetChildren = clone.children;

      for (let j = 0; j < sourceChildren.length; j++) {
        const childClone = cloneDOMNode(sourceChildren[j]);
        targetChildren[j].replaceWith(childClone);
      }

      return clone;
    };

    // Course Presentation may be subcontent, but we only want to print the Course Presentation
    const cpDOM = wrapper.closest('.h5p-course-presentation');
    const cleanupDOM = prepareDOMForPrinting(cpDOM);

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

    const resetCSS = () => {
      cleanupDOM();

      slides.forEach(slide => {
        slide.style.height = '';
        slide.style.width = '';
        slide.style.fontSize = '';
      });
      wrapper.style.height = `${wrapperHeight}px`;

      // Let CP know we are finished printing
      cp.trigger('printing', { finished: true });
    };

    // Wait for backgrounds, then print
    setTimeout(async () => {
      // Wait for all background images to load
      await waitForBackgroundsToLoad();

      // Additional delay to ensure rendering
      setTimeout(() => {
        // Do the actual printing
        window.focus();
        window.print();

        // Need additional timeout for ios and MacOS - these platforms require extra time to process the print dialog
        if (/iPad|iPhone|Macintosh|MacIntel|MacPPC|Mac68K/.test(navigator.userAgent)) {
          setTimeout(() => {
            resetCSS();
          }, IOS_MACOS_PRINT_DELAY_MS);
        }
        else {
          resetCSS();
        }
      }, RENDER_DELAY_MS); // Allow browser time to render DOM changes before printing

    }, INITIAL_PRINT_DELAY_MS); // Initial delay to ensure all DOM manipulations are complete
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

})();

export default Printer;
