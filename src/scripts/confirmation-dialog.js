
/**
 * Confirmation dialog
 * 
 */
const ConfirmationDialog = function (options) {
  const confirmationDialog = new H5P.ConfirmationDialog(options)
    .appendTo(document.body);
  
  confirmationDialog.show();
  return confirmationDialog;
}

export default ConfirmationDialog;