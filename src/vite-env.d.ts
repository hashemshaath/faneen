/// <reference types="vite/client" />

declare module '*.ttf?url' {
  const src: string;
  export default src;
}

declare const __BUILD_ID__: string;
declare const __BUILD_TIME__: string;

// jspdf-autotable augments the jsPDF instance at runtime with `lastAutoTable`.
// The plugin ships no first-party types for this property, so we declare the
// minimal shape we read (finalY) without using `any`.
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable?: { finalY: number };
  }
}
