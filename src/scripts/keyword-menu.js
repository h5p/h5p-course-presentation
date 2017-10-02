import Controls from 'h5p-lib-controls/src/scripts/controls';
import UIKeyboard from 'h5p-lib-controls/src/scripts/ui/keyboard';
import { isIPad, defaultValue } from './utils';
import { jQuery as $, EventDispatcher } from './globals';

/**
 * Select event.
 * @event KeywordMenu#select
 * @type {object}
 * @property {number} index The index of the selected menuitem
 */
/**
 * @typedef {object} KeywordMenuItemConfig
 * @property {string} title
 * @property {string} subtitle
 * @property {number} index
 */
/**
 * @typedef {object} KeywordMenuState
 * @property {number} currentIndex
 */
/**
 * Returns the index stored in a elements dataset
 *
 * @param {Element|EventTarget} element
 * @return {number}
 */
const getElementsDatasetIndex = element => parseInt(element.dataset.index);

/**
 * @class
 */
export default class KeywordMenu {
  /**
   * @constructor
   * @param {object} l10n
   * @param {number} currentIndex
   */
  constructor ({ l10n, currentIndex }) {
    this.l10n = l10n;
    /**
     * @type {KeywordMenuState}
     */
    this.state = {
      currentIndex: defaultValue(currentIndex, 0)
    };
    this.eventDispatcher = new EventDispatcher();
    this.controls = new Controls([new UIKeyboard()]);

    // on keyboard select
    this.controls.on('select', event => {
      this.onMenuItemSelect(getElementsDatasetIndex(event.element))
    });

    // propagate ESC event
    this.controls.on('close', () => this.eventDispatcher.trigger('close'));

    this.menuElement = this.createMenuElement();
    this.currentSlideMarkerElement = this.createCurrentSlideMarkerElement();
  }

  /**
   * Initializes the config
   *
   * @param {KeywordMenuItemConfig[]} keywordConfigs
   * @returns {Element[]}
   */
  init (keywordConfigs) {
    this.menuItemElements = keywordConfigs.map(config => this.createMenuItemElement(config));
    this.menuItemElements.forEach(element => this.menuElement.appendChild(element));
    this.menuItemElements.forEach(element => this.controls.addElement(element));

    this.setCurrentSlideIndex(this.state.currentIndex);

    return this.menuItemElements;
  };

  /**
   * Register an event listener
   *
   * @param {string} name
   * @param {function} callback
   */
  on(name, callback) {
    this.eventDispatcher.on(name, callback);
  }

  /**
   * Returns the menu element
   *
   * @return {Element}
   */
  getElement() {
    return this.menuElement;
  }

  /**
   * Removes all menu items
   */
  removeAllMenuItemElements() {
    this.menuItemElements
      .forEach(element => {
        this.controls.removeElement(element);
        this.menuElement.removeChild(element);
      });

    this.menuItemElements = [];
  }

  /**
   * Creates a menu element
   * @return {Element}
   */
  createMenuElement() {
    const element = this.menuElement = document.createElement('ol');
    element.setAttribute('role', 'menu');
    element.classList.add('list-unstyled');
    return element;
  }

  /**
   * Creates a menuitem
   *
   * @param {KeywordMenuItemConfig} config
   * @return {Element}
   */
  createMenuItemElement(config) {
    const element = document.createElement('li');

    element.setAttribute('role', 'menuitem');
    element.addEventListener('click', event => {
      this.onMenuItemSelect(getElementsDatasetIndex(event.currentTarget))
    });
    this.applyConfigToMenuItemElement(element, config);

    return element;
  }

  /**
   * Applies a config to a menu item element
   *
   * @param {Element} element
   * @param {KeywordMenuItemConfig} config
   */
  applyConfigToMenuItemElement(element, config) {
    element.innerHTML = `<div class="h5p-keyword-subtitle">${config.subtitle}</div><span class="h5p-keyword-title">${config.title}</span>`;
    element.dataset.index = config.index;
  }

  /**
   * Handles selecting menu item
   *
   * @param {number} index
   * @fires KeywordMenu#select
   */
  onMenuItemSelect(index) {
    if(this.state.currentIndex !== index) {
      this.setCurrentSlideIndex(index);
      this.eventDispatcher.trigger('select', { index });
    }
  }

  /**
   * Sets the current slide index
   *
   * @param {number} index
   */
  setCurrentSlideIndex(index) {
    const selectedElement = this.getElementByIndex(this.menuItemElements, index);

    this.state.currentIndex = index;
    this.updateCurrentlySelected(this.menuItemElements, this.state);
    this.controls.setTabbable(selectedElement);
  }

  /**
   * Updates the h5p-current class on the element list
   *
   * @param {Element[]} elements
   * @param {KeywordMenuState} state
   */
  updateCurrentlySelected(elements, state) {
    elements.forEach(element => {
      const isSelected = state.currentIndex === getElementsDatasetIndex(element);
      element.classList.toggle('h5p-current', isSelected);

      if (isSelected) {
        element.appendChild(this.currentSlideMarkerElement);
      }
    });
  }

  /**
   * Scroll to current keywords.
   *
   * @param {number} index
   */
  scrollToKeywords(index) {
    const elementToScrollTo = this.getFirstElementAfter(index);

    if(elementToScrollTo) {
      const $menu = $(this.menuElement);
      const move = $menu.scrollTop() + $(elementToScrollTo).position().top - 8;

      if (isIPad) {
        $menu.scrollTop(move);
      }
      else {
        $menu.stop().animate({ scrollTop: move }, 250);
      }
    }
  }

  /**
   * Returns the first element with an index larger then value
   *
   * @param {number} index
   * @return {Element}
   */
  getFirstElementAfter(index) {
    return this.menuItemElements.filter(element => getElementsDatasetIndex(element) >= index)[0];
  }

  /**
   * Returns the element with a given index
   *
   * @param {Element[]} elements
   * @param {number} index
   * @return {Element}
   */
  getElementByIndex(elements, index) {
    return elements.filter(element => getElementsDatasetIndex(element) === index)[0];
  }

  /**
   * Creates a hidden element, that will read "Current slide"
   *
   * @return {Element}
   */
  createCurrentSlideMarkerElement() {
    const element = document.createElement('div');
    element.classList.add('hidden-but-read');
    element.innerHTML = this.l10n.currentSlide;
    return element;
  }
}
