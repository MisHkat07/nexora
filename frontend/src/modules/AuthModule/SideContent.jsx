import { Space, Layout, Divider, Typography } from 'antd';
import useLanguage from '@/locale/useLanguage';
import { useSelector } from 'react-redux';

const { Content } = Layout;
const { Title, Text } = Typography;

export default function SideContent() {
  const translate = useLanguage();

  return (
    <Content
      style={{
        padding: '150px 30px 30px',
        width: '100%',
        maxWidth: '450px',
        margin: '0 auto',
      }}
      className="sideContent"
    >
      <div style={{ width: '100%' }}>

        <Title level={1} style={{ fontSize: 28 }}>
         ERP / CRM
        </Title>
        <Text>
          Accounting / Invoicing / Quote App <b />
        </Text>

        <div className="space20"></div>
      </div>
    </Content>
  );
}
