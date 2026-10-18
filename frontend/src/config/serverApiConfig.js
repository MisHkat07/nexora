// In production the SPA is served by the backend itself, so the API lives on the
// same origin ('/'). Set VITE_BACKEND_SERVER only when the API is hosted elsewhere.
const REMOTE_BACKEND = import.meta.env.VITE_BACKEND_SERVER || '/';
const USE_REMOTE = import.meta.env.PROD || import.meta.env.VITE_DEV_REMOTE == 'remote';

export const BASE_URL = USE_REMOTE ? REMOTE_BACKEND : 'http://localhost:8888/';
export const API_BASE_URL = BASE_URL + 'api/';

export const WEBSITE_URL = import.meta.env.PROD ? window.location.origin + '/' : 'http://localhost:3000/';
export const DOWNLOAD_BASE_URL = BASE_URL + 'download/';
export const ACCESS_TOKEN_NAME = 'x-auth-token';

export const FILE_BASE_URL = import.meta.env.VITE_FILE_BASE_URL || BASE_URL;
