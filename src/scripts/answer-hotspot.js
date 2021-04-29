// @ts-check
import { Hotspot } from "./hotspot";

/**
 * @typedef AnswerHotspot
 * @property {boolean} [isChecked]
 * @property {boolean} [isTask]
 * @property {"true" | "false"} [answerHotspotType]
 */

/**
 *
 * @param {Hotspot & AnswerHotspot} element
 * @param {'true' | 'false'} answerType
 */
export function initAnswerHotspot(element, answerType) {
  element.isChecked = false;
  console.log({element})

  element.$element.addClass(
    `h5p-hotspot-answer h5p-hotspot-answer--${answerType}`
  );

  element.$element.on("click", () => {
    console.log("click", element.isChecked)
    const checkedClass = "h5p-hotspot-answer--checked";

    const wasChecked = element.isChecked;
    if (wasChecked) {
      element.$element.removeClass(checkedClass);
    } else {
      element.$element.addClass(checkedClass);
    }

    element.isChecked = !wasChecked;
  });

  element.isTask = true;
  element.answerHotspotType = answerType;
}
