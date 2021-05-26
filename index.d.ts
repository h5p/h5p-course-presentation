declare var H5P;
declare var jQuery;

declare type VideoParam = {
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
