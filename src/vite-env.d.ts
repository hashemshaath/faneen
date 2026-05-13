/// <reference types="vite/client" />

declare module '*.ttf?url' {
  const src: string;
  export default src;
}

declare const __BUILD_ID__: string;
declare const __BUILD_TIME__: string;
