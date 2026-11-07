import { configureStore } from '@reduxjs/toolkit';


import rootReducer from './rootReducer';
import storePersist from './storePersist';
import { withoutToken } from '@/auth/session';

// localStorageHealthCheck();

const AUTH_INITIAL_STATE = {
  current: {},
  isLoggedIn: false,
  isLoading: false,
  isSuccess: false,
};

const storedAuth = storePersist.get('auth');
const auth_state = storedAuth
  ? { ...storedAuth, current: withoutToken(storedAuth.current) }
  : AUTH_INITIAL_STATE;
if (storedAuth?.current?.token) {
  window.localStorage.setItem('auth', JSON.stringify(auth_state));
}

const initialState = { auth: auth_state };

const store = configureStore({
  reducer: rootReducer,
  preloadedState: initialState,
  devTools: import.meta.env.PROD === false, // Enable Redux DevTools in development mode
});

console.log('🚀 Welcome to Nexora!');

export default store;
