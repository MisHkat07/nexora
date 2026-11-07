import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button, Card, Input, Typography } from 'antd';

import { API_BASE_URL } from '@/config/serverApiConfig';

export default function Portal() {
  const { token } = useParams();
  const [doc, setDoc] = useState(null);
  const [name, setName] = useState('');
  const [comment, setComment] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    const response = await fetch(`${API_BASE_URL}portal/${token}`);
    const body = await response.json();
    if (!response.ok) throw new Error(body.message || 'This link is not valid.');
    setDoc(body.result);
  };

  useEffect(() => {
    load().catch((error) => setMessage(error.message));
  }, [token]);

  const post = async (path, payload) => {
    const response = await fetch(`${API_BASE_URL}portal/${token}/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.message || 'Something went wrong.');
    setMessage(body.message || 'Saved');
    await load();
  };

  if (!doc) {
    return (
      <Card style={{ maxWidth: 560, margin: '48px auto' }}>
        <Typography.Text>{message || 'Loading…'}</Typography.Text>
      </Card>
    );
  }

  return (
    <Card style={{ maxWidth: 640, margin: '48px auto' }}>
      <Typography.Title level={3}>
        {doc.entity === 'quote' ? 'Quote' : 'Invoice'} {doc.number}/{doc.year}
      </Typography.Title>
      <Typography.Paragraph>
        {doc.clientName} · {doc.currency} {doc.amountDue ?? doc.total}
      </Typography.Paragraph>
      <Typography.Paragraph type="secondary">Status: {doc.status}</Typography.Paragraph>
      {(doc.items || []).map((item, index) => (
        <div key={`${item.itemName}-${index}`}>
          {item.itemName} × {item.quantity} — {item.total}
        </div>
      ))}
      {doc.entity === 'quote' && doc.status !== 'accepted' && doc.status !== 'declined' && (
        <div style={{ marginTop: 24 }}>
          <Input placeholder="Your name" value={name} onChange={(event) => setName(event.target.value)} />
          <Button type="primary" style={{ marginTop: 8, marginRight: 8 }} onClick={() => post('accept', { name }).catch((error) => setMessage(error.message))}>
            Accept
          </Button>
          <Input.TextArea style={{ marginTop: 8 }} placeholder="Reason for declining" value={comment} onChange={(event) => setComment(event.target.value)} />
          <Button style={{ marginTop: 8 }} onClick={() => post('decline', { comment }).catch((error) => setMessage(error.message))}>
            Decline
          </Button>
        </div>
      )}
      {doc.entity === 'invoice' && doc.amountDue > 0 && (
        <Button type="primary" style={{ marginTop: 24 }} onClick={() => post('pay', { confirm: true }).catch((error) => setMessage(error.message))}>
          Pay {doc.amountDue}
        </Button>
      )}
      {message && <Typography.Paragraph style={{ marginTop: 16 }}>{message}</Typography.Paragraph>}
    </Card>
  );
}
