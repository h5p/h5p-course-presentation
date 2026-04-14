
/**
 * Confirmation dialog
 * @param {object} dialogOptions Options for ConfirmationDialog.
 * @param {number|string} contentId Content identifier.
 * @returns {H5P.ConfirmationDialog} Confirmation dialog instance.
 */
const ConfirmationDialog = function (dialogOptions = {}, contentId) {

  /**
   * Determine the container element for the confirmation dialog.
   * @param {number|string} contentId
   * @returns {HTMLElement} The container element.
   */
  const determineContainer = (contentId) => {
    const fallback = document.body;

    if (typeof contentId !== 'string' && typeof contentId !== 'number') {
      return fallback;
    }

    const content = document.querySelector(`.h5p-content[data-content-id="${contentId}"]`);
    if (!content) {
      return fallback;
    }

    return content.querySelector('.h5p-container') || content;
  };

  const confirmationDialog = new H5P.ConfirmationDialog(dialogOptions)
    .appendTo(determineContainer(contentId));

  const element = confirmationDialog.getElement();
  element?.classList.add('h5p-cp-confirmation-dialog');

  confirmationDialog.show();
  return confirmationDialog;
};

export default ConfirmationDialog;
