import { useState } from 'react';
import { Button, Form, Input, Typography } from 'antd';
import { useDispatch, useSelector } from 'react-redux';

import { request } from '@/request';
import { logout } from '@/redux/auth/actions';
import { REQUEST_SUCCESS } from '@/redux/auth/types';
import { selectCurrentAdmin } from '@/redux/auth/selectors';
import { rememberUser } from '@/auth/session';

const { Paragraph, Title } = Typography;

/**
 * Enroll an authenticator app. `standalone` is the full-page gate used when the
 * organization requires 2FA and this account has not set it up yet.
 */
export default function TwoFactorEnroll({ standalone = false }) {
  const dispatch = useDispatch();
  const current = useSelector(selectCurrentAdmin);
  const [setup, setSetup] = useState(null);
  const [codes, setCodes] = useState(null);
  const [busy, setBusy] = useState(false);

  const start = async () => {
    setBusy(true);
    const data = await request.post({ entity: 'auth/2fa/setup', jsonData: {} });
    setBusy(false);
    if (data?.success) setSetup(data.result);
  };

  const confirm = async ({ code }) => {
    setBusy(true);
    const data = await request.post({ entity: 'auth/2fa/confirm', jsonData: { code } });
    setBusy(false);
    if (data?.success) {
      setCodes(data.result.recoveryCodes);
      setSetup(null);
      const next = { ...current, twoFactorEnabled: true, mustEnrollTwoFactor: false };
      rememberUser(next);
      dispatch({ type: REQUEST_SUCCESS, payload: next });
    }
  };

  return (
    <div style={{ maxWidth: 480 }}>
      {standalone && (
        <>
          <Title level={3}>Set up two-factor authentication</Title>
          <Paragraph>
            Your organization requires a second step at sign-in. Scan the code with an authenticator app, then enter
            the 6-digit code.
          </Paragraph>
        </>
      )}

      {codes ? (
        <>
          <Paragraph>Save these recovery codes somewhere safe. Each one works once, and they will not be shown again.</Paragraph>
          <pre style={{ background: '#f5f8fc', padding: 16, borderRadius: 8 }}>{codes.join('\n')}</pre>
        </>
      ) : setup ? (
        <Form layout="vertical" onFinish={confirm}>
          <img src={setup.qrDataUrl} alt="Authenticator QR code" width={240} height={240} />
          <Paragraph type="secondary" copyable={{ text: setup.secret }}>
            Or enter this secret manually: {setup.secret}
          </Paragraph>
          <Form.Item label="6-digit code" name="code" rules={[{ required: true, len: 6, message: 'Enter the 6-digit code' }]}>
            <Input size="large" autoFocus inputMode="numeric" autoComplete="one-time-code" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={busy}>
            Confirm
          </Button>
        </Form>
      ) : (
        <Button type="primary" onClick={start} loading={busy}>
          Set up authenticator
        </Button>
      )}

      {standalone && (
        <div style={{ marginTop: 24 }}>
          <Button onClick={() => dispatch(logout())}>Log out</Button>
        </div>
      )}
    </div>
  );
}
