import { useEffect, useState } from 'react';
import axios from 'axios';
import { Button, Card, Input, Typography, message } from 'antd';

export default function Billing() {
  const [info, setInfo] = useState(null);
  const [confirm, setConfirm] = useState('');

  const load = async () => {
    const response = await axios.get('billing');
    setInfo(response.data.result);
  };

  useEffect(() => {
    load().catch(() => message.error('Could not load billing'));
  }, []);

  const choose = async (plan) => {
    const response = await axios.post('billing/checkout', { plan });
    if (response.data.result?.url) window.location.href = response.data.result.url;
    else message.success(response.data.message || 'Plan updated');
    await load();
  };

  const download = async () => {
    const response = await axios.get('compliance/export');
    const blob = new Blob([JSON.stringify(response.data.result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'nexora-export.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const remove = async () => {
    await axios.post('compliance/delete', { confirm });
    message.success('Workspace marked deleted');
  };

  if (!info) return null;

  return (
    <Card>
      <Typography.Title level={3}>Billing</Typography.Title>
      <Typography.Paragraph>
        Plan: {info.plan}. Status: {info.subscriptionStatus || 'not on a subscription'}. People: {info.people}.
        {info.limits.seats ? ` Seat limit ${info.limits.seats}.` : ''}
        {info.limits.invoicesPerMonth ? ` Invoice limit ${info.limits.invoicesPerMonth} a month.` : ''}
      </Typography.Paragraph>
      <Button type="primary" onClick={() => choose('starter')} style={{ marginRight: 8 }}>
        Starter
      </Button>
      <Button onClick={() => choose('pro')}>Pro</Button>
      <Typography.Title level={4} style={{ marginTop: 32 }}>
        Your data
      </Typography.Title>
      <Button onClick={download}>Export JSON</Button>
      <Typography.Paragraph style={{ marginTop: 16 }}>
        Type the organization name to delete the workspace. Database backups kept by the operator are the way to restore it.
      </Typography.Paragraph>
      <Input value={confirm} onChange={(event) => setConfirm(event.target.value)} placeholder="Organization name" />
      <Button danger style={{ marginTop: 8 }} onClick={() => remove().catch((error) => message.error(error.response?.data?.message || 'Could not delete'))}>
        Delete workspace
      </Button>
    </Card>
  );
}
