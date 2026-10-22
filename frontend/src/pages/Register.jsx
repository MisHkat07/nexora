import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Form, Button, Input, Result } from 'antd';
import { ShopOutlined } from '@ant-design/icons';

import useLanguage from '@/locale/useLanguage';
import { register } from '@/redux/auth/actions';
import { selectAuth } from '@/redux/auth/selectors';
import { publicConfig } from '@/auth/auth.service';
import RegisterForm from '@/forms/RegisterForm';
import Loading from '@/components/Loading';
import AuthModule from '@/modules/AuthModule';

// Self-serve signup: creates a new organization and logs its owner in
const RegisterPage = () => {
  const translate = useLanguage();
  const dispatch = useDispatch();
  const { isLoading } = useSelector(selectAuth);
  const [signupEnabled, setSignupEnabled] = useState(null);

  useEffect(() => {
    publicConfig().then((config) => setSignupEnabled(Boolean(config.signupEnabled)));
  }, []);

  const onFinish = (values) => {
    dispatch(register({ registerData: values }));
  };

  if (signupEnabled === false) {
    return (
      <Result
        status="info"
        title="Signup is not available"
        subTitle="Ask your administrator for an account."
        extra={
          <Button type="primary" href="/login">
            {translate('Log in')}
          </Button>
        }
      />
    );
  }

  const FormContainer = () => (
    <Loading isLoading={isLoading}>
      <Form layout="vertical" name="register" className="login-form" onFinish={onFinish}>
        <Form.Item
          name="companyName"
          label="Company name"
          rules={[{ required: true }, { min: 2, max: 100 }]}
        >
          <Input prefix={<ShopOutlined className="site-form-item-icon" />} size="large" />
        </Form.Item>
        <RegisterForm />
        <Form.Item>
          <Button type="primary" htmlType="submit" className="login-form-button" loading={isLoading} size="large">
            Create account
          </Button>
          {translate('Or')} <a href="/login">{translate('already have account Login')}</a>
        </Form.Item>
      </Form>
    </Loading>
  );

  return (
    <AuthModule
      authContent={<FormContainer />}
      AUTH_TITLE="Create your account"
      AUTH_SUBTITLE="Start invoicing in minutes. Free to try."
      isForRegistre
    />
  );
};

export default RegisterPage;
