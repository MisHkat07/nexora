import { Col, Divider, Row, Typography } from 'antd';

const { Title, Text } = Typography;

export default function SetingsSection({ title, description, children }) {
  return (
    <Row gutter={[24, 24]} className="settings-section">
      <Col span={24}>
        <Title level={4} className="settings-section-title">
          {title}
        </Title>
        <Text type="secondary" className="settings-section-desc">
          {description}
        </Text>
      </Col>

      <Col
        xl={{ span: 18, offset: 2 }}
        lg={{ span: 24 }}
        md={{ span: 24 }}
        sm={{ span: 24 }}
        xs={{ span: 24 }}
      >
        {children}
      </Col>
      <Divider />
    </Row>
  );
}
