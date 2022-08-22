// @ts-check
import { createFocusTrap } from "focus-trap";
import { getContentId } from "./utils";

export class InformationDialog {
  /**
   * Create H5P.Video from video parameters.
   *
   * @param {object} params Video parameters from semantics.json/content.json.
   * @returns {H5P.Video} Content instance (H5P.Video).
   */
  static createVideoInstance(params) {
    return new H5P.Video({
      sources: [params],
      visuals: {
        fit: params.mime !== 'video/YouTube', // Might need adjustment for other handlers like BrightCove
        controls: true
      },
      playback: {
        autoplay: false,
        loop: false
      }
    }, getContentId());
  }

  /**
   * @param {Image} image
   */
  static createImageEmbed(image) {
    const img = document.createElement("img");
    img.setAttribute("src", H5P.getPath(image.path, getContentId()));
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
   * @param {Media[]} audioSources
   * @param {(event: Event) => void} onEndCallback
   */
  static createAudioPlayer(audioSources, onEndCallback) {
    const audioElement = document.createElement("audio");

    if (audioElement.canPlayType !== undefined) {
      for (const audioSource of audioSources) {
        var source = document.createElement("source");
        source.src = H5P.getPath(audioSource.path, getContentId());
        source.type = audioSource.mime;
        audioElement.appendChild(source);
      }
    }

    audioElement.preload = "auto";
    audioElement.load();

    audioElement.addEventListener("ended", onEndCallback);

    return audioElement;
  }

  /**
   * @param {{
   *   content: HTMLElement | HTMLElement[];
   *   dialogHeaderContent: DialogHeaderContent;
   *   dialogAudio: Media[];
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

    /** @type {HTMLButtonElement} */
    this.audioPlayPauseButton = this.audioPlayPauseButton || null;

    this.attach();

    this.isPlayingAudio = false;
  }

  /**
   * Creates an aspect ratio modal.
   * The modal includes button to set the aspect ratio to either 4/3 or 3/4.
   *
   * @param {HTMLElement[]} contents
   * @param {DialogHeaderContent} dialogHeaderContent
   * @param {Media[]} dialogAudio
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
        /*
         * YouTube handler requires wrapping HTMLElement
         * (this.videoEmbedElement) to be attached to DOM when instantiated, so
         * create instance here and attach in show()
         */
        this.videoInstance = InformationDialog.createVideoInstance(video);

        this.videoEmbedElement = document.createElement("div");
        this.videoEmbedElement.classList.add("h5p-information-dialog-video-container");
        mainContainer.appendChild(this.videoEmbedElement);
      } else if (dialogImage) {
        const imageElement = InformationDialog.createImageEmbed(dialogImage);
        mainContainer.appendChild(imageElement);
      }

      if (dialogAudio) {
        this.audioElement = InformationDialog.createAudioPlayer(
          dialogAudio,
          () => this.pauseAudio(),
        );
        mainContainer.appendChild(this.audioElement);

        this.audioPlayPauseButton = this.createPlayPauseButton();
        mainContainer.appendChild(this.audioPlayPauseButton);
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

    if (this.videoEmbedElement && this.videoInstance) {
      this.videoInstance.attach(H5P.jQuery(this.videoEmbedElement));
    }

    this.playAudio({ resetTime: true });
  }

  hide() {
    this.modal.setAttribute("hidden", "true");
    this.focusTrap.deactivate();

    this.pauseAudio();
  }

  /**
   * @param {{resetTime: boolean}} params
   */
  playAudio({ resetTime }) {
    const hasAudio = !!this.audioElement;
    if (hasAudio) {
      if (resetTime) {
        this.audioElement.currentTime = 0;
      }
      this.audioElement.play();
      this.modal.dataset.isPlayingAudio = "true";
      this.isPlayingAudio = true;
      this.setPlayPauseButtonLabel(this.audioPlayPauseButton);
    }
  }

  pauseAudio() {
    const hasAudio = !!this.audioElement;
    if (hasAudio) {
      this.audioElement.pause();
      this.modal.dataset.isPlayingAudio = "false";
      this.isPlayingAudio = false;
      this.setPlayPauseButtonLabel(this.audioPlayPauseButton);
    }
  }

  /**
   * @returns {HTMLButtonElement}
   */
  createPlayPauseButton() {
    const playPauseButton = document.createElement("button");
    playPauseButton.type = "button";
    playPauseButton.className = "h5p-information-dialog-audio-button";

    this.setPlayPauseButtonLabel(playPauseButton);

    playPauseButton.addEventListener("click", () => {
      if (this.isPlayingAudio) {
        this.pauseAudio();
      } else {
        this.playAudio({ resetTime: false });
      }
    });

    return playPauseButton;
  }

  /**
   * @param {HTMLButtonElement} button
   */
  setPlayPauseButtonLabel(button) {
    button.setAttribute(
      "aria-label",
      this.isPlayingAudio
        ? this.l10n.informationDialogPauseAudio
        : this.l10n.informationDialogPlayAudio
    );
  }

  onCloseClick() {
    this.hide();
  }
}
