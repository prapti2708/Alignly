declare const __STATIC__: boolean | undefined;
/** True in the browser-only build (`npm run build:static`): no server, no OCR, nothing uploaded. */
export const STATIC: boolean = typeof __STATIC__ !== 'undefined' && !!__STATIC__;
