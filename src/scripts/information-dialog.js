// @ts-check

export class InformationDialog {
  /**
   *
   * @param {Object} param
   * @param {HTMLElement | HTMLElement[]} param.content
   * @param {HTMLElement} param.parent
   * @param {object} param.l10n
   * @param {string} param.horizontalOffset
   * @param {string} param.verticalOffset
   */
  constructor({ content, parent, l10n, horizontalOffset, verticalOffset }) {
    const contents = content instanceof Array ? content : [content];

    this.parent = parent;
    this.l10n = l10n;
    this.modal = this.createDialog(contents, horizontalOffset, verticalOffset);

    this.attach();
  }

  /**
   * Creates an aspect ratio modal.
   * The modal includes button to set the aspect ratio to either 4/3 or 3/4.
   *
   * @param {HTMLElement[]} contents
   * @param {string} horizontalOffset Horizontal offset as a percentage of the container width
   * @param {string} verticalOffset Vertical offset as a percentage of the container height
   *
   * @return {HTMLDivElement}
   */
  createDialog(contents, horizontalOffset, verticalOffset) {
    const container = document.createElement("div");
    container.className = "h5p-information-dialog-container";
    container.setAttribute("hidden", "true");
    container.addEventListener("click", (event) => {
      const backdropWasClicked = event.target === event.currentTarget;
      if (backdropWasClicked) {
        this.hide();
      }

      event.stopPropagation();
    });

    const modal = document.createElement("section");
    modal.className = "h5p-information-dialog";
    modal.style.left = horizontalOffset;
    modal.style.top = verticalOffset;
    container.appendChild(modal);

    const mainContainer = document.createElement("div");
    mainContainer.className = "h5p-information-dialog-main";

    for (const contentElement of contents) {
      if (contentElement) {
        mainContainer.appendChild(contentElement);
      }
    }

    modal.appendChild(mainContainer);

    const modalFooter = document.createElement("footer");
    modalFooter.className = "h5p-information-dialog-footer";
    modal.appendChild(modalFooter);

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "h5p-information-dialog-close-button";
    closeButton.addEventListener("click", () => this.onCloseClick());
    modalFooter.appendChild(closeButton);

    const closeButtonIcon = document.createElement("span");
    closeButtonIcon.setAttribute("aria-hidden", "true");
    closeButtonIcon.innerHTML = "&times;";
    closeButton.appendChild(closeButtonIcon);

    const closeButtonLabel = document.createElement("span");
    closeButtonLabel.textContent = this.l10n.informationDialogClose;
    closeButtonLabel.classList.add("hidden-but-read");
    closeButton.appendChild(closeButtonLabel);

    return container;
  }

  attach() {
    this.parent.appendChild(this.modal);
  }

  /**
   * Adds the modal to the DOM
   */
  show() {
    this.modal.removeAttribute("hidden");
  }

  hide() {
    this.modal.setAttribute("hidden", "true");
  }

  onCloseClick() {
    this.hide();
  }
}
