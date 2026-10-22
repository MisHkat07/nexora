import { Layout, Row, Col } from 'antd';


export default function AuthLayout({ sideContent, children }) {
  return (
    <Layout className="auth-layout">
      <Row className="auth-layout-row">
        <Col
          xs={{ span: 0, order: 2 }}
          sm={{ span: 0, order: 2 }}
          md={{ span: 11, order: 1 }}
          lg={{ span: 12, order: 1 }}
          className="auth-side-col"
        >
          {sideContent}
        </Col>
        <Col
          xs={{ span: 24, order: 1 }}
          sm={{ span: 24, order: 1 }}
          md={{ span: 13, order: 2 }}
          lg={{ span: 12, order: 2 }}
          className="auth-form-col"
        >
          {children}
        </Col>
      </Row>
    </Layout>
  );
}
