import { useEffect, useState } from 'react';
import { Button, Form, Input, Table, Tag, Typography } from 'antd';
import { useDispatch, useSelector } from 'react-redux';

import { request } from '@/request';
import { logout } from '@/redux/auth/actions';
import { REQUEST_SUCCESS } from '@/redux/auth/types';
import { selectCurrentAdmin } from '@/redux/auth/selectors';
import { rememberUser } from '@/auth/session';
import TwoFactorEnroll from '@/components/TwoFactorEnroll';

const { Paragraph, Title } = Typography;

export default function AccountSecurity() {
  const dispatch = useDispatch();
  const current = useSelector(selectCurrentAdmin);
  const [sessions, setSessions] = useState([]);
  const [busy, setBusy] = useState(false);

  const loadSessions = async () => {
    const data = await request.get({ entity: 'auth/sessions' });
    if (data?.success) setSessions(data.result || []);
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const endSession = async (id, isCurrent) => {
    await request.remove({ entity: `auth/sessions/${id}` });
    if (isCurrent) dispatch(logout());
    else loadSessions();
  };

  const logoutEverywhere = async () => {
    setBusy(true);
    await request.post({ entity: 'auth/logout-all', jsonData: {} });
    setBusy(false);
    dispatch(logout());
  };

  const disable = async (values) => {
    const recovery = values.code.includes('-') || values.code.trim().length > 6;
    setBusy(true);
    const data = await request.post({
      entity: 'auth/2fa/disable',
      jsonData: {
        password: values.password,
        ...(recovery ? { recoveryCode: values.code } : { code: values.code }),
      },
    });
    setBusy(false);
    if (data?.success) {
      const next = { ...current, twoFactorEnabled: false };
      rememberUser(next);
      dispatch({ type: REQUEST_SUCCESS, payload: next });
    }
  };

  return (
    <div style={{ marginTop: 32 }}>
      <Title level={4}>Security</Title>
      <Paragraph type="secondary">Sessions on this account, and two-factor authentication.</Paragraph>

      <Table
        rowKey="id"
        pagination={false}
        dataSource={sessions}
        columns={[
          {
            title: 'Device',
            dataIndex: 'userAgent',
            render: (value, row) => (
              <span>
                {value} {row.current && <Tag color="blue">This device</Tag>}
              </span>
            ),
          },
          { title: 'IP', dataIndex: 'ip', width: 140 },
          {
            title: 'Last used',
            dataIndex: 'lastUsedAt',
            width: 200,
            render: (value) => (value ? new Date(value).toLocaleString() : ''),
          },
          {
            title: '',
            width: 120,
            render: (_, row) => (
              <Button size="small" onClick={() => endSession(row.id, row.current)}>
                Sign out
              </Button>
            ),
          },
        ]}
      />
      <Button style={{ margin: '12px 0 28px' }} onClick={logoutEverywhere} loading={busy}>
        Log out everywhere
      </Button>

      <Title level={5}>Two-factor authentication</Title>
      {current?.twoFactorEnabled ? (
        <Form layout="vertical" onFinish={disable} style={{ maxWidth: 420 }}>
          <Paragraph>On. Enter your password and a current code to turn it off.</Paragraph>
          <Form.Item label="Password" name="password" rules={[{ required: true }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item label="Authentication or recovery code" name="code" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Button htmlType="submit" loading={busy}>
            Turn off
          </Button>
        </Form>
      ) : (
        <TwoFactorEnroll />
      )}
    </div>
  );
}
