// @ts-check
import { createFocusTrap } from "focus-trap";
import { getContentId } from "./utils";

/**
 * @typedef Media
 * @property {string} copyright
 * @property {string} mime
 * @property {string} path
 */

/**
 * @typedef {Media & {height: number, width: number}} Image
 */

/**
 * @typedef {{
 *   dialogImage?: Image;
 *   dialogVideo?: Media[];
 * }} DialogHeaderContent
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
   * @param {Image} image
   */
  static createImageEmbed(image) {
    const img = document.createElement("img");
    img.setAttribute(
      "src",
      // @ts-ignore
      H5P.getPath(image.path, getContentId())
    );
    img.setAttribute("alt", "");

    if (image.height) {
      img.setAttribute("height", image.height.toString());
    }

    if (image.width) {
      img.setAttribute("width", image.width.toString());
    }

    return img;
  }

  /**
   * @param {Object} param
   * @param {HTMLElement | HTMLElement[]} param.content
   * @param {DialogHeaderContent} param.dialogHeaderContent
   * @param {HTMLElement} param.parent
   * @param {object} param.l10n
   * @param {string} param.horizontalOffset
   * @param {string} param.verticalOffset
   */
  constructor({
    content,
    dialogHeaderContent,
    parent,
    l10n,
    horizontalOffset,
    verticalOffset,
  }) {
    const contents = content instanceof Array ? content : [content];

    this.parent = parent;
    this.l10n = l10n;
    this.modal = this.createDialog(
      contents,
      dialogHeaderContent,
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
   * @param {DialogHeaderContent} dialogHeaderContent
   * @param {string} horizontalOffset Horizontal offset as a percentage of the container width
   * @param {string} verticalOffset Vertical offset as a percentage of the container height
   *
   * @return {HTMLDivElement}
   */
  createDialog(
    contents,
    dialogHeaderContent,
    horizontalOffset,
    verticalOffset
  ) {
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

    if (dialogHeaderContent) {
      const { dialogImage, dialogVideo } = dialogHeaderContent;
      const video = dialogVideo instanceof Array ? dialogVideo[0] : dialogVideo;

      if (video) {
        let videoElement;

        const isYouTube = video.mime === "video/YouTube";
        if (isYouTube) {
          videoElement = InformationDialog.createYouTubeEmbed(video.path);
        } else {
          videoElement = InformationDialog.createVideoEmbed(
            // @ts-ignore
            H5P.getPath(video.path, getContentId())
          );
        }

        mainContainer.appendChild(videoElement);
      } else if (dialogImage) {
        const imageElement = InformationDialog.createImageEmbed(dialogImage);
        mainContainer.appendChild(imageElement);
      }
    }

    for (const contentElement of contents) {
      if (contentElement) {
        mainContainer.appendChild(contentElement);
      }
    }

    modal.appendChild(mainContainer);

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "h5p-information-dialog-close-button";
    closeButton.addEventListener("click", () => this.onCloseClick());
    modal.appendChild(closeButton);

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
