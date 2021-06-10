// @ts-check
import { createFocusTrap } from "focus-trap";
import { getContentId } from "./utils";

export class InformationDialog {
  /**
   * @param {string} youtubeUrl
   * @return {HTMLIFrameElement}
   */
  static createYouTubeEmbed(youtubeUrl) {
    const videoId = new URLSearchParams(youtubeUrl.split("?")[1]).get("v");
    const embedUrl = `https://www.youtube.com/embed/${videoId}`;

    const iframe = document.createElement("iframe");
    iframe.setAttribute("width", "500");
    iframe.setAttribute("height", "281");
    iframe.setAttribute("src", embedUrl);
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
   * @param {string} videoUrl
   * @return {HTMLVideoElement}
   */
  static createVideoEmbed(videoUrl) {
    const videoElement = document.createElement("video");
    videoElement.src = videoUrl;

    return videoElement;
  }

  /**
   * @param {Image} image
   */
  static createImageEmbed(image) {
    const img = document.createElement("img");
    img.setAttribute(
      "src",
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
   * @param {Media} audio
   */
  static createAudioPlayer(audio) {
    const audioElement = document.createElement("audio");

    audioElement.src = H5P.getPath(audio.path, getContentId());
    audioElement.load();
    audioElement.preload = 'auto';

    return audioElement;
  }

  /**
   * @param {{
   *   content: HTMLElement | HTMLElement[];
   *   dialogHeaderContent: DialogHeaderContent;
   *   dialogAudio: Media;
   *   parent: HTMLElement;
   *   l10n: any;
   *   horizontalOffset: string;
   *   verticalOffset: string;
   * }} param
   */
  constructor({
    content,
    dialogHeaderContent,
    dialogAudio,
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
      dialogAudio,
      horizontalOffset,
      verticalOffset
    );

    /** @type {HTMLElement} */
    this.modalElement = this.modalElement || null;

    /** @type {HTMLIFrameElement | HTMLVideoElement} */
    this.videoEmbedElement = this.videoEmbedElement || null;

    /** @type {HTMLAudioElement} */
    this.audioElement = this.audioElement || null;
    
    this.attach();
  }

  /**
   * Creates an aspect ratio modal.
   * The modal includes button to set the aspect ratio to either 4/3 or 3/4.
   *
   * @param {HTMLElement[]} contents
   * @param {DialogHeaderContent} dialogHeaderContent
   * @param {Media} dialogAudio
   * @param {string} horizontalOffset Horizontal offset as a percentage of the container width
   * @param {string} verticalOffset Vertical offset as a percentage of the container height
   *
   * @return {HTMLDivElement}
   */
  createDialog(
    contents,
    dialogHeaderContent,
    dialogAudio,
    horizontalOffset,
    verticalOffset,
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

    this.modalElement = document.createElement("section");
    this.modalElement.className = "h5p-information-dialog";
    this.modalElement.style.left = horizontalOffset;
    this.modalElement.style.top = verticalOffset;
    this.focusTrap = createFocusTrap(this.modalElement, {
      allowOutsideClick: true,
    });
    container.appendChild(this.modalElement);

    const mainContainer = document.createElement("div");
    mainContainer.className = "h5p-information-dialog-main";

    if (dialogHeaderContent) {
      const { dialogImage, dialogVideo } = dialogHeaderContent;
      const video = dialogVideo instanceof Array ? dialogVideo[0] : dialogVideo;

      if (video) {
        let videoElement;
        let videoUrl;

        const isYouTube = video.mime === "video/YouTube";
        if (isYouTube) {
          videoUrl = video.path;
          videoElement = InformationDialog.createYouTubeEmbed(videoUrl);
        } else {
          // @ts-ignore
          videoUrl = H5P.getPath(video.path, getContentId());
          videoElement = InformationDialog.createVideoEmbed(videoUrl);
        }

        this.videoEmbedElement = videoElement;

        const videoContainer = document.createElement("div");
        videoContainer.className = "h5p-information-dialog-video-container";
        mainContainer.appendChild(videoContainer);

        videoContainer.appendChild(videoElement);
      } else if (dialogImage) {
        const imageElement = InformationDialog.createImageEmbed(dialogImage);
        mainContainer.appendChild(imageElement);
      }

      if (dialogAudio) {
        this.audioElement = InformationDialog.createAudioPlayer(dialogAudio);
        mainContainer.appendChild(this.audioElement);
      }
    }

    for (const contentElement of contents) {
      if (contentElement) {
        mainContainer.appendChild(contentElement);
      }
    }

    this.modalElement.appendChild(mainContainer);

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "h5p-information-dialog-close-button";
    closeButton.addEventListener("click", () => this.onCloseClick());
    this.modalElement.appendChild(closeButton);

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

    const hasVideo = this.videoEmbedElement;
    if (hasVideo) {
      const videoContainer = this.modalElement.querySelector(
        ".h5p-information-dialog-video-container"
      );
      if (videoContainer) {
        videoContainer.appendChild(this.videoEmbedElement);
      }
    }

    const hasAudio = this.audioElement;
    if (hasAudio) {
      this.audioElement.currentTime = 0;
      this.audioElement.play();
    }
  }

  hide() {
    this.modal.setAttribute("hidden", "true");
    this.focusTrap.deactivate();

    const hasVideo = this.videoEmbedElement;
    if (hasVideo) {
      this.videoEmbedElement.remove();
    }

    const hasAudio = this.audioElement;
    if (hasAudio) {
      this.audioElement.pause();
    }
  }

  onCloseClick() {
    this.hide();
  }
}
