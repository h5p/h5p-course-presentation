FROM node:12.18.1 as builder
RUN apt-get update && apt-get install vim less -y
RUN npm install -g h5p
RUN mkdir -p /dev-h5p/cp

# Fetch Dependencies
WORKDIR /dev-h5p
#RUN mkdir -p ~/.ssh/ && ssh-keyscan -t rsa github.com > ~/.ssh/known_hosts
#RUN h5p get h5p-course-presentation
RUN git clone https://github.com/h5p/blob.git
RUN git clone https://github.com/h5p/downloadify.git
RUN git clone https://github.com/h5p/drop.git
RUN git clone https://github.com/h5p/embeddedjs.git
RUN git clone https://github.com/h5p/filesaver.git
RUN git clone https://github.com/h5p/flowplayer.git
RUN git clone https://github.com/h5p/font-awesome.git
RUN git clone https://github.com/h5p/h5p-advanced-text.git
RUN git clone https://github.com/h5p/h5p-appear-in.git
RUN git clone https://github.com/h5p/h5p-audio.git
RUN git clone https://github.com/h5p/h5p-blanks.git
RUN git clone https://github.com/h5p/h5p-continuous-text.git
RUN git clone https://github.com/h5p/h5p-course-presentation.git
RUN git clone https://github.com/h5p/h5p-dialogcards.git
RUN git clone https://github.com/h5p/h5p-drag-n-bar.git
RUN git clone https://github.com/h5p/h5p-drag-n-drop.git
RUN git clone https://github.com/h5p/h5p-drag-n-resize.git
RUN git clone https://github.com/h5p/h5p-drag-question.git
RUN git clone https://github.com/h5p/h5p-drag-text.git
RUN git clone https://github.com/h5p/h5p-editor-color-selector.git
RUN git clone https://github.com/h5p/h5p-editor-course-presentation.git
RUN git clone https://github.com/h5p/h5p-editor-drag-question.git
RUN git clone https://github.com/h5p/h5p-editor-duration.git
RUN git clone https://github.com/h5p/h5p-editor-interactive-video.git
RUN git clone https://github.com/h5p/h5p-editor-radio-group.git
RUN git clone https://github.com/h5p/h5p-editor-radio-selector.git
RUN git clone https://github.com/h5p/h5p-editor-summary-textual-editor.git
RUN git clone https://github.com/h5p/h5p-editor-timecode.git
RUN git clone https://github.com/h5p/h5p-editor-url-field.git
RUN git clone https://github.com/h5p/h5p-editor-vertical-tabs.git
RUN git clone https://github.com/h5p/h5p-editor-wizard.git
RUN git clone https://github.com/h5p/h5p-exportable-text-area.git
RUN git clone https://github.com/h5p/h5p-font-icons.git
RUN git clone https://github.com/h5p/h5p-go-to-question.git
RUN git clone https://github.com/h5p/h5p-guided-tour.git
RUN git clone https://github.com/h5p/h5p-image.git
RUN git clone https://github.com/h5p/h5p-interactive-video.git
RUN git clone https://github.com/h5p/h5p-joubel-ui.git
RUN git clone https://github.com/h5p/h5p-link.git
RUN git clone https://github.com/h5p/h5p-mark-the-words.git
RUN git clone https://github.com/h5p/h5p-multi-choice.git
RUN git clone https://github.com/h5p/h5p-nil.git
RUN git clone https://github.com/h5p/h5p-open-ended-question.git
RUN git clone https://github.com/h5p/h5p-question.git
RUN git clone https://github.com/h5p/h5p-questionnaire.git
RUN git clone https://github.com/h5p/h5p-simple-multiple-choice.git
RUN git clone https://github.com/h5p/h5p-single-choice-set.git
RUN git clone https://github.com/h5p/h5p-soundjs.git
RUN git clone https://github.com/h5p/h5p-summary.git
RUN git clone https://github.com/h5p/h5p-table.git
RUN git clone https://github.com/h5p/h5p-text.git
RUN git clone https://github.com/h5p/h5p-transition.git
RUN git clone https://github.com/h5p/h5p-true-false.git
RUN git clone https://github.com/h5p/h5p-twitter-user-feed.git
RUN git clone https://github.com/h5p/h5p-video.git
RUN git clone https://github.com/h5p/jquery-ui.git
RUN git clone https://github.com/h5p/shepherd.git
RUN git clone https://github.com/h5p/swfobject.git
RUN git clone https://github.com/h5p/tether.git
RUN git clone https://github.com/h5p/h5p-shape
RUN git clone https://github.com/otacke/h5p-text-utilities.git
RUN git clone https://github.com/h5p/h5p-editor-range-list.git
RUN git clone https://github.com/h5p/h5p-editor-show-when.git
RUN git clone https://github.com/h5p/h5p-editor-single-choice-set-textual-editor.git
RUN git clone https://github.com/h5p/h5p-editor-select-toggle-fields.git
RUN git clone https://github.com/h5p/h5p-iv-hotspot.git
RUN git clone https://github.com/h5p/h5p-free-text-question.git
RUN git clone https://github.com/h5p/h5p-editor-shape.git
RUN git clone https://github.com/h5p/h5p-editor-table-list.git
RUN git clone https://github.com/h5p/h5p-ckeditor.git

RUN cd h5p-editor-color-selector && git checkout b0ae8c941cedcec73df6b186663eae6df8679810

RUN cd h5p-dialogcards && npm install && npm run build
RUN cd h5p-drag-text && npm install && npm run build
#RUN cd h5p-true-false && npm install && npm run build
RUN cd h5p-questionnaire && npm install && npm run build
RUN cd h5p-drag-question && npm install && npm run build
RUN cd h5p-interactive-video && npm install && npm run build
RUN cd h5p-open-ended-question && npm install && npm run build
RUN cd h5p-simple-multiple-choice && npm install && npm run build
RUN cd h5p-course-presentation && npm install && npm run build

#RUN cd blob && npm install && npm run build
#RUN cd downloadify && npm install && npm run build
#RUN cd drop && npm install && npm run build
#RUN cd embeddedjs && npm install && npm run build
#RUN cd filesaver && npm install && npm run build
#RUN cd flowplayer && npm install && npm run build
#RUN cd font-awesome && npm install && npm run build
#RUN cd h5p-advanced-text && npm install && npm run build
#RUN cd h5p-appear-in && npm install && npm run build
# RUN cd h5p-audio && npm install && npm run build
# RUN cd h5p-blanks && npm install && npm run build
# RUN cd h5p-continuous-text && npm install && npm run build
# #RUN cd h5p-course-presentation && npm install && npm run build
# RUN cd h5p-dialogcards && npm install && npm run build
# RUN cd h5p-drag-n-bar && npm install && npm run build
# RUN cd h5p-drag-n-drop && npm install && npm run build
# RUN cd h5p-drag-n-resize && npm install && npm run build
# RUN cd h5p-drag-question && npm install && npm run build
# RUN cd h5p-drag-text && npm install && npm run build
# RUN cd h5p-editor-color-selector && npm install && npm run build
RUN cd h5p-editor-course-presentation && npm install && npm run build
# RUN cd h5p-editor-drag-question && npm install && npm run build
# RUN cd h5p-editor-duration && npm install && npm run build
# RUN cd h5p-editor-interactive-video && npm install && npm run build
# RUN cd h5p-editor-radio-group && npm install && npm run build
# RUN cd h5p-editor-radio-selector && npm install && npm run build
# RUN cd h5p-editor-summary-textual-editor && npm install && npm run build
# RUN cd h5p-editor-timecode && npm install && npm run build
# RUN cd h5p-editor-url-field && npm install && npm run build
# RUN cd h5p-editor-vertical-tabs && npm install && npm run build
# RUN cd h5p-editor-wizard && npm install && npm run build
# RUN cd h5p-exportable-text-area && npm install && npm run build
# RUN cd h5p-font-icons && npm install && npm run build
# RUN cd h5p-go-to-question && npm install && npm run build
# RUN cd h5p-guided-tour && npm install && npm run build
# RUN cd h5p-image && npm install && npm run build
# RUN cd h5p-interactive-video && npm install && npm run build
# RUN cd h5p-joubel-ui && npm install && npm run build
# RUN cd h5p-link && npm install && npm run build
# RUN cd h5p-mark-the-words && npm install && npm run build
# RUN cd h5p-multi-choice && npm install && npm run build
# RUN cd h5p-nil && npm install && npm run build
# RUN cd h5p-open-ended-question && npm install && npm run build
# RUN cd h5p-question && npm install && npm run build
# RUN cd h5p-questionnaire && npm install && npm run build
# RUN cd h5p-simple-multiple-choice && npm install && npm run build
# RUN cd h5p-single-choice-set && npm install && npm run build
# RUN cd h5p-soundjs && npm install && npm run build
# RUN cd h5p-summary && npm install && npm run build
# RUN cd h5p-table && npm install && npm run build
# RUN cd h5p-text && npm install && npm run build
# RUN cd h5p-transition && npm install && npm run build
# RUN cd h5p-true-false && npm install && npm run build
# RUN cd h5p-twitter-user-feed && npm install && npm run build
# RUN cd h5p-video && npm install && npm run build
# RUN cd jquery-ui && npm install && npm run build
# RUN cd shepherd && npm install && npm run build
# RUN cd swfobject && npm install && npm run build
# RUN cd tether && npm install && npm run build


WORKDIR /dev-h5p/cp

#Build
COPY . .
RUN npm install
RUN npm run build

WORKDIR /dev-h5p


FROM kentis123/drupal-h5p:drupal-7

COPY --from=builder /dev-h5p sites/default/files/h5p/development