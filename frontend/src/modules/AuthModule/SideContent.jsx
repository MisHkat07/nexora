import { Layout, Typography } from 'antd';
import useLanguage from '@/locale/useLanguage';
import nexoraLogo from '@/style/images/nexora-logo.png';

const { Content } = Layout;
const { Title, Text, Paragraph } = Typography;

export default function SideContent() {
  const translate = useLanguage();

  return (
    <Content className="sideContent auth-side-content">
      <div className="auth-side-inner">
        <div className="auth-brand-row">
          <img className="auth-brand-icon" src={nexoraLogo} alt="Nexora" />
          <Text className="auth-brand-mark">Nexora</Text>
        </div>
        <Title level={1} className="auth-side-title">
          {translate('manage_your_company_with')}
        </Title>
        <Paragraph className="auth-side-copy">
          {translate('it_brings_together_your_invoice_clients_and_leads')}
        </Paragraph>
        <Text type="secondary" className="auth-side-tagline">
          Accounting / Invoicing / Quote App
        </Text>
      </div>
    </Content>
  );
}
