declare const __APP_VERSION__: string;

export const VERSION = __APP_VERSION__;
export const BUILD_TIME = new Date().toISOString().slice(0, 10).replace(/-/g, ".");
