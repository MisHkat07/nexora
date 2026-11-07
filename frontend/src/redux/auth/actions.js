import * as actionTypes from './types';
import * as authService from '@/auth';
import { request } from '@/request';
import { forgetUser, rememberUser, withoutToken } from '@/auth/session';

const signedIn = (dispatch, result) => {
  const authState = rememberUser(result);
  dispatch({
    type: actionTypes.REQUEST_SUCCESS,
    payload: authState.current,
  });
};

export const login =
  ({ loginData }) =>
  async (dispatch) => {
    dispatch({
      type: actionTypes.REQUEST_LOADING,
    });
    const data = await authService.login({ loginData });

    if (data.success === true && data.result?.twoFactorRequired) {
      dispatch({ type: actionTypes.REQUEST_FAILED });
      return data;
    }
    if (data.success === true) {
      signedIn(dispatch, data.result);
    } else {
      dispatch({
        type: actionTypes.REQUEST_FAILED,
      });
    }
    return data;
  };

export const completeLogin = (result) => (dispatch) => {
  signedIn(dispatch, result);
};

export const register =
  ({ registerData }) =>
  async (dispatch) => {
    dispatch({
      type: actionTypes.REQUEST_LOADING,
    });
    const data = await authService.register({ registerData });

    // Signup logs the new owner straight in
    if (data.success === true) {
      signedIn(dispatch, data.result);
    } else {
      dispatch({
        type: actionTypes.REQUEST_FAILED,
      });
    }
  };

// After the address is confirmed, update the stored session (if logged in) so the banner disappears
export const markEmailVerified = () => async (dispatch, getState) => {
  const { auth } = getState();
  if (!auth.isLoggedIn) return;
  const current = { ...auth.current, emailVerified: true };
  rememberUser(current);
  dispatch({ type: actionTypes.REQUEST_SUCCESS, payload: current });
};

export const resetPassword =
  ({ resetPasswordData }) =>
  async (dispatch) => {
    dispatch({
      type: actionTypes.REQUEST_LOADING,
    });
    const data = await authService.resetPassword({ resetPasswordData });

    if (data.success === true) {
      signedIn(dispatch, data.result);
    } else {
      dispatch({
        type: actionTypes.REQUEST_FAILED,
      });
    }
  };

export const logout = () => async (dispatch) => {
  await authService.logout();
  forgetUser();
  dispatch({
    type: actionTypes.LOGOUT_SUCCESS,
  });
};

export const updateProfile =
  ({ entity, jsonData }) =>
  async (dispatch, getState) => {
    let data = await request.updateAndUpload({ entity, id: '', jsonData });

    if (data.success === true) {
      // Merge: the profile response has no session token or permissions, which must be kept
      const current = withoutToken({ ...getState().auth.current, ...data.result });
      rememberUser(current);
      dispatch({
        type: actionTypes.REQUEST_SUCCESS,
        payload: current,
      });
    }
  };

// Accepting a team invitation logs the new member in (replacing any current session in this tab)
export const acceptInvite =
  ({ acceptData }) =>
  async (dispatch) => {
    dispatch({ type: actionTypes.REQUEST_LOADING });
    const data = await authService.acceptInvite({ acceptData });
    if (data.success === true) {
      signedIn(dispatch, data.result);
    } else {
      dispatch({ type: actionTypes.REQUEST_FAILED });
    }
    return data;
  };
