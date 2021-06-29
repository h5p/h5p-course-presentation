// @ts-check
import { Hotspot } from "./hotspot";

/**
 *
 * @param {Hotspot & AnswerHotspot} element
 * @param {'true' | 'false'} answerType
 */
export function initAnswerHotspot(element, answerType) {
  element.isChecked = false;

  element.$element.addClass(
    `h5p-hotspot-answer h5p-hotspot-answer--${answerType}`
  );

  const checkedClass = "h5p-hotspot-answer--checked";
  element.$element.on("click", () => {
    const wasChecked = element.isChecked;
    if (wasChecked) {
      element.$element.removeClass(checkedClass);
    } else {
      element.$element.addClass(checkedClass);
    }

    element.isChecked = !wasChecked;
  });

  element.resetTask = () => {
    element.isChecked = false;
    element.$element.removeClass(checkedClass);
  };

  element.isTask = true;
  element.answerHotspotType = answerType;
}
