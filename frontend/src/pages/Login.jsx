import { useEffect, useState } from 'react';

import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import useLanguage from '@/locale/useLanguage';

import { Form, Button, Input } from 'antd';

import { completeLogin, login } from '@/redux/auth/actions';
import { selectAuth } from '@/redux/auth/selectors';
import LoginForm from '@/forms/LoginForm';
import Loading from '@/components/Loading';
import AuthModule from '@/modules/AuthModule';
import { publicConfig, verifyTwoFactor } from '@/auth/auth.service';

const LoginPage = () => {
  const translate = useLanguage();
  const { isLoading, isSuccess } = useSelector(selectAuth);
  const navigate = useNavigate();
  // const size = useSize();

  const dispatch = useDispatch();
  const [challenge, setChallenge] = useState(null);
  const [useRecovery, setUseRecovery] = useState(false);
  const [checkingCode, setCheckingCode] = useState(false);

  const onFinish = async (values) => {
    const data = await dispatch(login({ loginData: values }));
    if (data?.result?.twoFactorRequired) {
      setChallenge({ ticket: data.result.ticket, remember: values.remember });
    }
  };

  const onCode = async (values) => {
    setCheckingCode(true);
    const data = await verifyTwoFactor({
      ticket: challenge.ticket,
      remember: challenge.remember,
      code: useRecovery ? undefined : values.code,
      recoveryCode: useRecovery ? values.code : undefined,
    });
    setCheckingCode(false);
    if (data.success && data.result?.token) dispatch(completeLogin(data.result));
  };

  useEffect(() => {
    if (isSuccess) navigate('/');
  }, [isSuccess]);

  // Only show "Create an account" when this server allows self-serve signup
  const [signupEnabled, setSignupEnabled] = useState(false);
  useEffect(() => {
    publicConfig().then((config) => setSignupEnabled(Boolean(config.signupEnabled)));
  }, []);

  const FormContainer = () => {
    if (challenge) {
      return (
        <Loading isLoading={checkingCode}>
          <Form layout="vertical" onFinish={onCode}>
            <Form.Item
              label={useRecovery ? 'Recovery code' : 'Authentication code'}
              name="code"
              rules={[{ required: true, message: 'Enter the code' }]}
            >
              <Input size="large" autoFocus autoComplete="one-time-code" placeholder={useRecovery ? 'ABCD-EFGH' : '123456'} />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" className="login-form-button" size="large" loading={checkingCode}>
                {translate('Log in')}
              </Button>
              <div style={{ marginTop: 12 }}>
                <Button type="link" onClick={() => setUseRecovery((value) => !value)} style={{ padding: 0 }}>
                  {useRecovery ? 'Use an authenticator code' : 'Use a recovery code'}
                </Button>
              </div>
            </Form.Item>
          </Form>
        </Loading>
      );
    }
    return (
      <Loading isLoading={isLoading}>
        <Form
          layout="vertical"
          name="normal_login"
          className="login-form"
          initialValues={{
            remember: true,
          }}
          onFinish={onFinish}
        >
          <LoginForm />
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              className="login-form-button"
              loading={isLoading}
              size="large"
            >
              {translate('Log in')}
            </Button>
            {signupEnabled && (
              <div style={{ marginTop: 12 }}>
                New to Nexora? <a href="/register">Create an account</a>
              </div>
            )}
          </Form.Item>
        </Form>
      </Loading>
    );
  };

  return (
    <AuthModule
      authContent={<FormContainer />}
      AUTH_TITLE="Sign in"
      AUTH_SUBTITLE="auth_form_subtitle"
    />
  );
};

export default LoginPage;
