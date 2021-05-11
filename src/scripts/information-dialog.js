// @ts-check
import { createFocusTrap } from "focus-trap";

/**
 * @typedef VideoParam
 * @property {string} copyright
 * @property {string} mime
 * @property {string} path
 */

export class InformationDialog {
  /**
   * @param {string} videoUrl
   * @return {HTMLIFrameElement}
   */
  static createYouTubeEmbed(videoUrl) {
    const videoId = new URLSearchParams(videoUrl.split("?")[1]).get("v");

    return InformationDialog.createVideoEmbed(
      `https://www.youtube.com/embed/${videoId}`
    );
  }

  /**
   * @param {string} videoUrl
   * @return {HTMLIFrameElement}
   */
  static createVideoEmbed(videoUrl) {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("width", "560");
    iframe.setAttribute("height", "315");
    iframe.setAttribute("src", videoUrl);
    iframe.setAttribute("title", "Video player");
    iframe.setAttribute("frameborder", "0");
    iframe.setAttribute(
      "allow",
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    );
    iframe.setAttribute("allowfullscreen", "allowfullscreen");

    return iframe;
  }

  /**
   * @param {Object} param
   * @param {HTMLElement | HTMLElement[]} param.content
   * @param {VideoParam[]} param.dialogVideo
   * @param {HTMLElement} param.parent
   * @param {object} param.l10n
   * @param {string} param.horizontalOffset
   * @param {string} param.verticalOffset
   */
  constructor({
    content,
    dialogVideo,
    parent,
    l10n,
    horizontalOffset,
    verticalOffset,
  }) {
    const contents = content instanceof Array ? content : [content];
    const video = dialogVideo instanceof Array ? dialogVideo : [dialogVideo];

    this.parent = parent;
    this.l10n = l10n;
    this.modal = this.createDialog(
      contents,
      video.length > 0 ? video[0] : null,
      horizontalOffset,
      verticalOffset
    );

    this.attach();
  }

  /**
   * Creates an aspect ratio modal.
   * The modal includes button to set the aspect ratio to either 4/3 or 3/4.
   *
   * @param {HTMLElement[]} contents
   * @param {VideoParam} dialogVideo
   * @param {string} horizontalOffset Horizontal offset as a percentage of the container width
   * @param {string} verticalOffset Vertical offset as a percentage of the container height
   *
   * @return {HTMLDivElement}
   */
  createDialog(contents, dialogVideo, horizontalOffset, verticalOffset) {
    const container = document.createElement("div");
    container.className = "h5p-information-dialog-container";
    container.setAttribute("hidden", "true");
    container.addEventListener("click", (event) => {
      const backdropWasClicked = event.target === event.currentTarget;
      if (backdropWasClicked) {
        this.hide();
      }
    });

    const modal = document.createElement("section");
    modal.className = "h5p-information-dialog";
    modal.style.left = horizontalOffset;
    modal.style.top = verticalOffset;
    this.focusTrap = createFocusTrap(modal, {
      allowOutsideClick: true,
    });
    container.appendChild(modal);

    const mainContainer = document.createElement("div");
    mainContainer.className = "h5p-information-dialog-main";

    if (dialogVideo) {
      let videoElement;

      const isYouTube = dialogVideo.mime === "video/YouTube";
      if (isYouTube) {
        videoElement = InformationDialog.createYouTubeEmbed(dialogVideo.path);
      } else {
        videoElement = InformationDialog.createVideoEmbed(dialogVideo.path);
        console.log({ dialogVideo });
      }

      mainContainer.appendChild(videoElement);
    }

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
    this.focusTrap.activate();
  }

  hide() {
    this.modal.setAttribute("hidden", "true");
    this.focusTrap.deactivate();
  }

  onCloseClick() {
    this.hide();
  }
}
