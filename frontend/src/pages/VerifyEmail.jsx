import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Button, Result, Spin } from 'antd';

import { verify } from '@/auth/auth.service';
import { markEmailVerified } from '@/redux/auth/actions';
import { selectAuth } from '@/redux/auth/selectors';

// Opened from the link in the signup email; works whether or not the user is logged in
export default function VerifyEmail() {
  const { userId, token } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isLoggedIn } = useSelector(selectAuth);
  const [outcome, setOutcome] = useState(null);

  useEffect(() => {
    let cancelled = false;
    verify({ userId, token }).then((data) => {
      if (cancelled) return;
      setOutcome(data);
      if (data.success) dispatch(markEmailVerified());
    });
    return () => {
      cancelled = true;
    };
  }, [userId, token, dispatch]);

  if (!outcome) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Result
      status={outcome.success ? 'success' : 'error'}
      title={outcome.success ? 'Email address confirmed' : 'This link did not work'}
      subTitle={outcome.message}
      style={{ maxWidth: 520, margin: '40px auto' }}
      extra={
        <Button type="primary" onClick={() => navigate(isLoggedIn ? '/' : '/login')}>
          {isLoggedIn ? 'Go to dashboard' : 'Log in'}
        </Button>
      }
    />
  );
}
