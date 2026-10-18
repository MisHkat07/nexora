import { Layout, Typography } from 'antd';
import {
  ContainerOutlined,
  FileSyncOutlined,
  CreditCardOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import useLanguage from '@/locale/useLanguage';
import nexoraLogo from '@/style/images/nexora-logo.png';

const { Content } = Layout;
const { Title, Text, Paragraph } = Typography;

export default function SideContent() {
  const translate = useLanguage();

  const features = [
    { icon: <TeamOutlined />, label: translate('auth_feature_customers') },
    { icon: <ContainerOutlined />, label: translate('auth_feature_invoices') },
    { icon: <FileSyncOutlined />, label: translate('auth_feature_quotes') },
    { icon: <CreditCardOutlined />, label: translate('auth_feature_payments') },
  ];

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
        <ul className="auth-feature-list">
          {features.map((feature) => (
            <li key={feature.label} className="auth-feature">
              <span className="auth-feature-icon">{feature.icon}</span>
              <span>{feature.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </Content>
  );
}
