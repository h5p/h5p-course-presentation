const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');

// Run the production attachElement method with lightweight H5P DOM/event doubles.
const source = readFileSync(join(__dirname, '../src/scripts/cp.js'), 'utf8');
const body = source.slice(source.indexOf('const KEYWORD_TITLE_SKIP'))
  .replace('export default CoursePresentation;', 'globalThis.CoursePresentation = CoursePresentation;');

function fakeElement() {
  return {
    css() {
      return this;
    },
    appendTo() {
      return this;
    },
    children() {
      return this;
    },
    first() {
      return this;
    },
    toggleClass() {
      return this;
    },
    get() {
      return [{ style: {} }];
    },
  };
}

function setup(slideIndex, loaded) {
  const context = { Parent: function () {}, H5P: { jQuery: fakeElement } };
  vm.runInNewContext(body, context, { filename: 'cp.js' });
  const cp = Object.create(context.CoursePresentation.prototype);
  const events = new Map();
  cp.currentSlideIndex = 0;
  cp.on = (name, callback) => events.set(name, callback);
  cp.off = (name, callback) => {
    if (events.get(name) === callback) events.delete(name);
  };
  cp.setOverflowTabIndex = () => {};
  cp.getLibraryTypePmz = () => 'video';
  const instanceEvents = new Map();
  let plays = 0;
  let isLoaded = loaded;
  const instance = {
    on: (name, callback) => instanceEvents.set(name, () => {
      isLoaded = true;
      callback();
    }),
    attach() {},
    isLoaded: () => isLoaded,
    play: () => {
      plays++;
    },
  };
  const element = {
    x: 0, y: 0, width: 50, height: 50,
    action: { library: 'H5P.Video 1.6', params: { playback: { autoplay: true } } },
  };
  cp.attachElement(element, instance, { children: () => ({ first: fakeElement }) }, slideIndex);
  return { cp, events, instanceEvents, plays: () => plays };
}

test('preloaded video on inactive slide waits until the slide becomes current', () => {
  const { cp, events, plays } = setup(1, true);
  assert.equal(plays(), 0);
  cp.currentSlideIndex = 1;
  events.get('changedSlide')({ data: 1 });
  assert.equal(plays(), 1);
});

test('video loading on an inactive slide cannot play until activation', () => {
  const { cp, events, instanceEvents, plays } = setup(1, false);
  instanceEvents.get('loaded')();
  assert.equal(plays(), 0);
  cp.currentSlideIndex = 1;
  events.get('changedSlide')({ data: 1 });
  assert.equal(plays(), 1);
  assert.equal(events.has('changedSlide'), false);
});

test('video loading after navigation plays only when ready', () => {
  const { cp, events, instanceEvents, plays } = setup(1, false);
  cp.currentSlideIndex = 1;
  events.get('changedSlide')({ data: 1 });
  assert.equal(plays(), 0);
  instanceEvents.get('loaded')();
  assert.equal(plays(), 1);
});

test('video on current slide retains immediate autoplay', () => {
  const { plays } = setup(0, true);
  assert.equal(plays(), 1);
});
