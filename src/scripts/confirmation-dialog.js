
/**
 * Confirmation dialog
 *
 */
const ConfirmationDialog = function (options) {
  const confirmationDialog = new H5P.ConfirmationDialog(options)
    .appendTo(document.body);

  let element = confirmationDialog.getElement();
  element.classList.add('h5p-cp-confirmation-dialog');

  if (H5PIntegration?.theme) {
    element.classList.add('h5p-theme', 'h5p-content');

  if (H5PIntegration.theme.density) {
    element.classList.add(`h5p-${H5PIntegration.theme.density}`);
  }
 }

  confirmationDialog.show();
  return confirmationDialog;
};

export default ConfirmationDialog;
