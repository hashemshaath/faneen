import "@testing-library/jest-dom";
import "jest-axe/extend-expect";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// jsdom doesn't implement IntersectionObserver/scrollIntoView used by HomeV2
if (!('IntersectionObserver' in window)) {
  class IO {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
    root = null;
    rootMargin = '';
    thresholds = [];
  }
  // @ts-expect-error test polyfill
  window.IntersectionObserver = IO;
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

// jsdom does not implement URL.createObjectURL / revokeObjectURL.
// Many dashboard/export flows call them to trigger downloads; without these
// polyfills any component that touches a Blob URL during a test throws
// `URL.createObjectURL is not a function`. We install no-op stand-ins ONLY
// when missing so real environments are untouched.
if (typeof URL.createObjectURL !== 'function') {
  // @ts-expect-error test polyfill
  URL.createObjectURL = () => 'blob:mock';
}
if (typeof URL.revokeObjectURL !== 'function') {
  // @ts-expect-error test polyfill
  URL.revokeObjectURL = () => {};
}

// jsPDF emits `console.warn("Unable to look up font label for font 'ArabicFont', '<style>'")`
// in jsdom because the bundled Noto Naskh TTF cannot be fetched via Vite's
// `?url` import in the test environment, so the Arabic font registration
// gracefully falls back. The warning is informational and unrelated to the
// behaviour under test — but it floods CI logs. We filter ONLY this exact
// jsPDF message; every other warning is preserved.
const originalWarn = console.warn.bind(console);
console.warn = (...args: unknown[]) => {
  const first = args[0];
  if (typeof first === 'string' && first.includes("Unable to look up font label for font 'ArabicFont'")) {
    return;
  }
  originalWarn(...(args as Parameters<typeof console.warn>));
};
