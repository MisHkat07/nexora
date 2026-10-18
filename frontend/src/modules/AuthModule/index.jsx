import useLanguage from '@/locale/useLanguage';

import { Layout, Typography } from 'antd';

import AuthLayout from '@/layout/AuthLayout';
import SideContent from './SideContent';
import nexoraLogo from '@/style/images/nexora-logo.png';

const { Content } = Layout;
const { Title, Text } = Typography;

const AuthModule = ({ authContent, AUTH_TITLE, AUTH_SUBTITLE, isForRegistre = false }) => {
  const translate = useLanguage();
  return (
    <AuthLayout sideContent={<SideContent />}>
      <Content
        className="auth-form-content"
        style={{
          padding: isForRegistre ? '48px 32px 32px' : '48px 32px',
          maxWidth: '440px',
          margin: '0 auto',
          width: '100%',
        }}
      >
        <div className="auth-mobile-brand">
          <img src={nexoraLogo} alt="Nexora" />
          <span>Nexora</span>
        </div>
        <Title level={2} className="auth-form-title">
          {translate(AUTH_TITLE)}
        </Title>
        {AUTH_SUBTITLE && <Text className="auth-form-subtitle">{translate(AUTH_SUBTITLE)}</Text>}
        <div className="site-layout-content">{authContent}</div>
      </Content>
    </AuthLayout>
  );
};

export default AuthModule;
