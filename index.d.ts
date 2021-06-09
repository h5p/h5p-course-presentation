declare var H5P;
declare var jQuery;

declare type Media = {
  copyright: string;
  mime: string;
  path: string;
};

declare type AnswerHotspot = {
  isChecked?: boolean;
  isTask?: boolean;
  answerHotspotType?: "true" | "false"
  resetTask?: () => void;
}

declare type Image = Media & {
  height: number;
  width: number;
}

declare type DialogHeaderContent = {
  dialogImage?: Image;
  dialogVideo?: Media[];
}
