const defaultApi = 'http://localhost:3000/api';

export const API_BASE_URL = (globalThis as any).__SCORM_API_URL__ || defaultApi;
export const ASSETS_BASE_URL =
  (globalThis as any).__SCORM_ASSETS_URL__ || API_BASE_URL.replace(/\/api\/?$/, '');
