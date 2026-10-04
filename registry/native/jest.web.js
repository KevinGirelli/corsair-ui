// jsdom has no matchMedia, which browsers (and so react-native-web and
// Reanimated) rely on. Here nothing matches: light mode, motion allowed.
window.matchMedia = (query) => ({
  matches: false,
  media: query,
  onchange: null,
  addEventListener() {},
  removeEventListener() {},
  addListener() {},
  removeListener() {},
  dispatchEvent: () => false,
});
