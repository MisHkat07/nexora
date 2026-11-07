import { lazy, Suspense, useEffect, useState } from 'react';

import { useDispatch, useSelector } from 'react-redux';
import { selectAuth } from '@/redux/auth/selectors';
import { REQUEST_SUCCESS, LOGOUT_SUCCESS } from '@/redux/auth/types';
import storePersist from '@/redux/storePersist';
import { forgetUser, refreshAccessToken, withoutToken } from '@/auth/session';
import { AppContextProvider } from '@/context/appContext';
import PageLoader from '@/components/PageLoader';
import AuthRouter from '@/router/AuthRouter';
import Localization from '@/locale/Localization';

const ErpApp = lazy(() => import('./ErpApp'));

const DefaultApp = () => (
  <Localization>
    <AppContextProvider>
      <Suspense fallback={<PageLoader />}>
        <ErpApp />
      </Suspense>
    </AppContextProvider>
  </Localization>
);

export default function ERP() {
  const { isLoggedIn } = useSelector(selectAuth);
  const dispatch = useDispatch();
  const [ready, setReady] = useState(false);

  // A reload has the user profile but not the access token. The refresh cookie gets a new one.
  useEffect(() => {
    const stored = storePersist.get('auth');
    if (!stored?.isLoggedIn) {
      setReady(true);
      return;
    }
    refreshAccessToken()
      .then((result) => {
        dispatch({ type: REQUEST_SUCCESS, payload: withoutToken(result) });
      })
      .catch(() => {
        forgetUser();
        dispatch({ type: LOGOUT_SUCCESS });
      })
      .finally(() => setReady(true));
  }, [dispatch]);

  console.log('Welcome to Nexora!');

  if (!ready) return <PageLoader />;

  if (!isLoggedIn)
    return (
      <Localization>
        <AuthRouter />
      </Localization>
    );
  else {
    return <DefaultApp />;
  }
}
