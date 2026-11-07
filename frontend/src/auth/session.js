import axios from 'axios';
import { API_BASE_URL } from '@/config/serverApiConfig';

/*
  The access token lives in memory only. The refresh token is an httpOnly cookie the
  page script cannot read. localStorage keeps the user profile so a reload can restore
  the screen, then asks the server for a new access token.
*/

let accessToken = null;

export const getAccessToken = () => accessToken;
export const setAccessToken = (token) => {
  accessToken = token || null;
};
export const clearAccessToken = () => {
  accessToken = null;
};

export const withoutToken = (result) => {
  if (!result || typeof result !== 'object') return result;
  const rest = { ...result };
  delete rest.token;
  return rest;
};

/** Persists the signed-in user without the access token. Returns the redux auth slice. */
export const rememberUser = (result) => {
  if (result?.token) setAccessToken(result.token);
  const authState = {
    current: withoutToken(result),
    isLoggedIn: true,
    isLoading: false,
    isSuccess: true,
  };
  window.localStorage.setItem('auth', JSON.stringify(authState));
  window.localStorage.removeItem('isLogout');
  return authState;
};

export const forgetUser = () => {
  clearAccessToken();
  window.localStorage.removeItem('auth');
  window.localStorage.removeItem('settings');
  window.localStorage.setItem('isLogout', JSON.stringify({ isLogout: true }));
};

const refreshClient = axios.create({ baseURL: API_BASE_URL, withCredentials: true });

let pendingRefresh = null;

/** One refresh in flight, shared by every request that got a 401 at the same time. */
export const refreshAccessToken = () => {
  if (!pendingRefresh) {
    pendingRefresh = refreshClient
      .post('auth/refresh')
      .then((response) => {
        const result = response.data?.result;
        if (!result?.token) throw new Error('No access token');
        rememberUser(result);
        return result;
      })
      .finally(() => {
        pendingRefresh = null;
      });
  }
  return pendingRefresh;
};

/** Adds the in-memory token, and retries once after a silent refresh when it has expired. */
export const attachSession = (instance) => {
  instance.interceptors.request.use((config) => {
    const token = getAccessToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const config = error.config;
      const expired = Boolean(error.response?.data?.jwtExpired);
      if (!config || config.skipAuthRefresh || config._retry || !expired) {
        return Promise.reject(error);
      }
      config._retry = true;
      try {
        const result = await refreshAccessToken();
        config.headers.Authorization = `Bearer ${result.token}`;
        return instance(config);
      } catch {
        return Promise.reject(error);
      }
    }
  );
};
