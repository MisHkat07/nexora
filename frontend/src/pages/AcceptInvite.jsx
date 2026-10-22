import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Form, Input, Button, Result, Spin, Typography } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';

import { inviteDetails } from '@/auth/auth.service';
import { acceptInvite } from '@/redux/auth/actions';
import { selectAuth } from '@/redux/auth/selectors';
import AuthModule from '@/modules/AuthModule';

// Opened from the invitation email: the invitee picks their name and password and joins
export default function AcceptInvite() {
  const { userId, token } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isLoading } = useSelector(selectAuth);
  const [invite, setInvite] = useState(null);

  useEffect(() => {
    inviteDetails({ userId, token }).then(setInvite);
  }, [userId, token]);

  if (!invite) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!invite.success) {
    return (
      <Result
        status="error"
        title="This invitation can't be used"
        subTitle={invite.message}
        style={{ maxWidth: 520, margin: '40px auto' }}
        extra={
          <Button type="primary" onClick={() => navigate('/login')}>
            Go to login
          </Button>
        }
      />
    );
  }

  const { email, name, role, organizationName } = invite.result;

  const onFinish = async (values) => {
    const data = await dispatch(acceptInvite({ acceptData: { userId, token, ...values } }));
    if (data?.success) navigate('/');
  };

  const form = (
    <Form layout="vertical" name="accept_invite" initialValues={{ name }} onFinish={onFinish}>
      <Typography.Paragraph>
        You&apos;re joining <strong>{organizationName}</strong> as <strong>{role}</strong> with{' '}
        <strong>{email}</strong>.
      </Typography.Paragraph>
      <Form.Item name="name" label="First name" rules={[{ required: true }, { max: 100 }]}>
        <Input prefix={<UserOutlined />} size="large" />
      </Form.Item>
      <Form.Item name="surname" label="Last name" rules={[{ max: 100 }]}>
        <Input size="large" />
      </Form.Item>
      <Form.Item
        name="password"
        label="Choose a password"
        rules={[{ required: true }, { min: 8, message: 'Use at least 8 characters' }]}
      >
        <Input.Password prefix={<LockOutlined />} size="large" />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit" size="large" loading={isLoading} block>
          Join {organizationName}
        </Button>
      </Form.Item>
    </Form>
  );

  return <AuthModule authContent={form} AUTH_TITLE="Accept invitation" />;
}
