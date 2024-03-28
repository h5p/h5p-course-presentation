
/**
 * Confirmation dialog
 *
 */
const ConfirmationDialog = function (options) {
  const confirmationDialog = new H5P.ConfirmationDialog(options)
    .appendTo(document.body);

  let element = confirmationDialog.getElement();
  element.classList.add('h5p-cp-confirmation-dialog');

  confirmationDialog.show();
  return confirmationDialog;
};

export default ConfirmationDialog;
