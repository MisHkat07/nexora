import { API_BASE_URL } from '@/config/serverApiConfig';

import axios from 'axios';
import errorHandler from '@/request/errorHandler';
import successHandler from '@/request/successHandler';

// Own instance: '@/request' sets axios.defaults.baseURL after login, which would double the
// /api/ prefix on these calls (e.g. logging out and back in without reloading the page)
const http = axios.create({ baseURL: API_BASE_URL, withCredentials: true });

export const login = async ({ loginData }) => {
  try {
    const response = await http.post(
      `login?timestamp=${new Date().getTime()}`,
      loginData
    );

    const { status, data } = response;

    successHandler(
      { data, status },
      {
        notifyOnSuccess: false,
        notifyOnFailed: true,
      }
    );
    return data;
  } catch (error) {
    return errorHandler(error);
  }
};

export const register = async ({ registerData }) => {
  try {
    const response = await http.post(`register`, registerData);

    const { status, data } = response;

    successHandler(
      { data, status },
      {
        notifyOnSuccess: true,
        notifyOnFailed: true,
      }
    );
    return data;
  } catch (error) {
    return errorHandler(error);
  }
};

// Confirms the email address from the link in the signup email
export const verify = async ({ userId, token }) => {
  try {
    const response = await http.post('verify-email', { userId, token });
    return response.data;
  } catch (error) {
    // The page shows the message itself
    return error.response?.data || { success: false, message: 'Could not reach the server' };
  }
};

// What the login page needs before anyone is logged in (e.g. whether signup is on)
export const publicConfig = async () => {
  try {
    const response = await http.get('public-config');
    return response.data?.result || {};
  } catch {
    return {};
  }
};

export const resetPassword = async ({ resetPasswordData }) => {
  try {
    const response = await http.post(`resetpassword`, resetPasswordData);

    const { status, data } = response;

    successHandler(
      { data, status },
      {
        notifyOnSuccess: true,
        notifyOnFailed: true,
      }
    );
    return data;
  } catch (error) {
    return errorHandler(error);
  }
};
// The caller passes the token: the stored session is already cleared when this runs
export const logout = async ({ token } = {}) => {
  try {
    const response = await http.post(`logout?timestamp=${new Date().getTime()}`, null, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const { status, data } = response;

    successHandler(
      { data, status },
      {
        notifyOnSuccess: false,
        notifyOnFailed: true,
      }
    );
    return data;
  } catch (error) {
    return errorHandler(error);
  }
};


// Team invitation: details for the accept page, then accepting (which logs the new member in)
export const inviteDetails = async ({ userId, token }) => {
  try {
    const response = await http.get(`invite/${userId}/${token}`);
    return response.data;
  } catch (error) {
    return error.response?.data || { success: false, message: 'Could not reach the server' };
  }
};

export const acceptInvite = async ({ acceptData }) => {
  try {
    const response = await http.post('accept-invite', acceptData);
    successHandler({ data: response.data, status: response.status }, { notifyOnSuccess: true, notifyOnFailed: true });
    return response.data;
  } catch (error) {
    return errorHandler(error);
  }
};
