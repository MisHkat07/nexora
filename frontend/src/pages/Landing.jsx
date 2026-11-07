import { Link } from 'react-router-dom';
import { Button, Typography } from 'antd';

export default function Landing() {
  return (
    <main style={{ maxWidth: 880, margin: '0 auto', padding: '64px 24px' }}>
      <Typography.Title>Nexora</Typography.Title>
      <Typography.Title level={3}>Quote, invoice, and get paid in one workspace.</Typography.Title>
      <Typography.Paragraph>
        Nexora is invoicing, a sales pipeline, and the books for a small team. Send a quote, turn it into an
        invoice, and let your client pay from a link. Your data stays in your organization.
      </Typography.Paragraph>
      <Button type="primary" size="large">
        <Link to="/register">Start a 14-day trial</Link>
      </Button>
      <Button size="large" style={{ marginLeft: 12 }}>
        <Link to="/login">Log in</Link>
      </Button>
      <Typography.Paragraph style={{ marginTop: 32 }}>
        <Link to="/docs">Product guide and API</Link>
        {' · '}
        <Link to="/privacy">Privacy</Link>
        {' · '}
        <Link to="/terms">Terms</Link>
      </Typography.Paragraph>
    </main>
  );
}
