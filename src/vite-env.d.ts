declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  readonly VITE_GOOGLE_WEB_CLIENT_ID?: string;
  readonly VITE_GYMTRACKER_SERVER_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
