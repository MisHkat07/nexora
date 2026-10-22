import { useLayoutEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { Layout } from 'antd';


import Navigation from '@/apps/Navigation/NavigationContainer';

import HeaderContent from '@/apps/Header/HeaderContainer';
import PageLoader from '@/components/PageLoader';

import { settingsAction } from '@/redux/settings/actions';

import { selectSettings } from '@/redux/settings/selectors';

import AppRouter from '@/router/AppRouter';
import VerifyEmailBanner from '@/components/VerifyEmailBanner';

import useResponsive from '@/hooks/useResponsive';


export default function ErpCrmApp() {
  const { Content } = Layout;

  // const { state: stateApp, appContextAction } = useAppContext();
  // // const { app } = appContextAction;
  // const { isNavMenuClose, currentApp } = stateApp;

  const { isMobile } = useResponsive();

  const dispatch = useDispatch();

  useLayoutEffect(() => {
    dispatch(settingsAction.list({ entity: 'setting' }));
  }, []);

  // const appSettings = useSelector(selectAppSettings);

  const { isSuccess: settingIsloaded } = useSelector(selectSettings);

  // useEffect(() => {
  //   const { loadDefaultLang } = storePersist.get('firstVisit');
  //   if (appSettings.idurar_app_language && !loadDefaultLang) {
  //     window.localStorage.setItem('firstVisit', JSON.stringify({ loadDefaultLang: true }));
  //   }
  // }, [appSettings]);

  if (settingIsloaded)
    return (
      <Layout hasSider className="app-shell">
        <Navigation />

        {isMobile ? (
          <Layout className="app-shell-main">
            <HeaderContent />
            <Content
              className="app-shell-content"
              style={{
                margin: '24px 0',
                overflow: 'initial',
                width: '100%',
                padding: '0 24px',
                maxWidth: 'none',
              }}
            >
              <VerifyEmailBanner />
              <AppRouter />
            </Content>
          </Layout>
        ) : (
          <Layout className="app-shell-main">
            <HeaderContent />
            <Content
              className="app-shell-content"
              style={{
                margin: '24px 0',
                overflow: 'initial',
                width: '100%',
                padding: '0 28px',
                maxWidth: 'none',
              }}
            >
              <VerifyEmailBanner />
              <AppRouter />
            </Content>
          </Layout>
        )}
      </Layout>
    );
  else return <PageLoader />;
}
