import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Switch, Typography } from 'antd';
import { useDispatch, useSelector } from 'react-redux';

import { request } from '@/request';
import { REQUEST_SUCCESS } from '@/redux/auth/types';
import { selectCurrentAdmin } from '@/redux/auth/selectors';
import { rememberUser } from '@/auth/session';

const { Paragraph, Title } = Typography;

export default function SecuritySettings() {
  const dispatch = useDispatch();
  const current = useSelector(selectCurrentAdmin);
  const [required, setRequired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    request.get({ entity: 'organization' }).then((data) => {
      setLoading(false);
      if (data?.success) setRequired(Boolean(data.result.requireTwoFactor));
    });
  }, []);

  const save = async (value) => {
    setSaving(true);
    const data = await request.patch({ entity: 'organization', jsonData: { requireTwoFactor: value } });
    setSaving(false);
    if (!data?.success) return;
    setRequired(value);
    if (value && !current?.twoFactorEnabled) {
      const next = { ...current, mustEnrollTwoFactor: true };
      rememberUser(next);
      dispatch({ type: REQUEST_SUCCESS, payload: next });
    }
  };

  return (
    <div style={{ maxWidth: 560 }}>
      <Title level={4}>Two-factor authentication</Title>
      <Paragraph>
        Require every member of this organization to use an authenticator app. People who have not set it up yet can
        only finish setup until they do.
      </Paragraph>
      <Switch checked={required} loading={loading || saving} onChange={save} />
      <span style={{ marginLeft: 12 }}>{required ? 'Required' : 'Optional'}</span>
      <div style={{ marginTop: 16 }}>
        <Link to="/profile">Set up your own authenticator on your profile</Link>
      </div>
    </div>
  );
}
