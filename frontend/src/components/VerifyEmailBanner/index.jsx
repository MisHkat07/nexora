import { useState } from 'react';
import { useSelector } from 'react-redux';
import { Alert, Button, message } from 'antd';

import { request } from '@/request';
import { selectCurrentAdmin } from '@/redux/auth/selectors';

// Shown until a new signup confirms their email address (they can't email customers before that)
export default function VerifyEmailBanner() {
  const current = useSelector(selectCurrentAdmin);
  const [sending, setSending] = useState(false);

  // Accounts from before email verification existed have no flag: don't nag them
  if (!current || current.emailVerified !== false) return null;

  const resend = async () => {
    setSending(true);
    const data = await request.post({ entity: 'resend-verification' });
    if (data?.success) message.success(data.message);
    setSending(false);
  };

  return (
    <Alert
      type="warning"
      showIcon
      style={{ marginBottom: 16 }}
      message={`Confirm your email address (${current.email}) to send invoices and quotes to your customers.`}
      action={
        <Button size="small" loading={sending} onClick={resend}>
          Resend link
        </Button>
      }
    />
  );
}
