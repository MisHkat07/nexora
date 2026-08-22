import useLanguage from '@/locale/useLanguage';

import { Layout, Col, Divider, Typography } from 'antd';

import AuthLayout from '@/layout/AuthLayout';
import SideContent from './SideContent';

const { Content } = Layout;
const { Title } = Typography;

const AuthModule = ({ authContent, AUTH_TITLE, isForRegistre = false }) => {
  const translate = useLanguage();
  return (
    <AuthLayout sideContent={<SideContent />}>
      <Content
        className="auth-form-content"
        style={{
          padding: isForRegistre ? '48px 32px 32px' : '96px 32px 32px',
          maxWidth: '440px',
          margin: '0 auto',
          width: '100%',
        }}
      >
        <Col xs={{ span: 24 }} sm={{ span: 24 }} md={{ span: 0 }} span={0}>
          <div className="space10" />
        </Col>
        <Title level={2} className="auth-form-title">
          {translate(AUTH_TITLE)}
        </Title>

        <Divider className="auth-form-divider" />
        <div className="site-layout-content">{authContent}</div>
      </Content>
    </AuthLayout>
  );
};

export default AuthModule;
