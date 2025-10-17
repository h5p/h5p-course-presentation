
/**
 * Confirmation dialog
 * @param {object} options Options for ConfirmationDialog.
 * @param {HTMLElement} [container] Container to append dialog to.
 */
const ConfirmationDialog = function (options, container = document.body) {
  const confirmationDialog = new H5P.ConfirmationDialog(options)
    .appendTo(container);

  let element = confirmationDialog.getElement();
  element.classList.add('h5p-cp-confirmation-dialog');

  confirmationDialog.show();
  return confirmationDialog;
};

export default ConfirmationDialog;
