import { Link, useLocation } from 'react-router-dom';
import { Typography } from 'antd';

const privacy = {
  title: 'Privacy',
  body: [
    'Nexora stores the business records you enter: customers, invoices, quotes, payments, and team accounts. That data belongs to your organization.',
    'We use it to run the product: sign-in, emailing documents you ask us to send, and, when you connect them, card payments. We do not sell customer lists.',
    'You can export your workspace or ask the owner to delete it from Billing. Operator backups of the database are kept so a restore is possible after a mistake; delete requests are applied to the live data and to the next backup cycle.',
  ],
};

const terms = {
  title: 'Terms',
  body: [
    'Nexora is provided as a subscription workspace. The free plan has limits on invoices and seats. Paid plans are billed through the payment provider you connect.',
    'You are responsible for the invoices you send and for keeping your login secure. Do not use the service to send unsolicited email.',
    'We may suspend a workspace that does not pay after the grace period. The workspace becomes read-only until billing is updated. You can export your data before you close the account.',
  ],
};

export default function Legal() {
  const page = useLocation().pathname.startsWith('/terms') ? terms : privacy;
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px' }}>
      <Typography.Title>{page.title}</Typography.Title>
      {page.body.map((paragraph) => (
        <Typography.Paragraph key={paragraph}>{paragraph}</Typography.Paragraph>
      ))}
      <Link to="/login">Back</Link>
    </main>
  );
}
