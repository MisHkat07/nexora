import { useEffect, useState } from 'react';
import axios from 'axios';
import { Button, Card, Col, Input, Row, Typography, message } from 'antd';

const STAGES = ['Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost'];

export default function Pipeline() {
  const [deals, setDeals] = useState([]);
  const [title, setTitle] = useState('');

  const load = async () => {
    const response = await axios.get('deal/list?items=100');
    setDeals(response.data?.result || []);
  };

  useEffect(() => {
    load().catch(() => message.error('Could not load the pipeline'));
  }, []);

  const add = async () => {
    if (!title.trim()) return;
    await axios.post('deal/create', { title: title.trim(), stage: 'Qualified', value: 0 });
    setTitle('');
    await load();
  };

  const move = async (deal, stage) => {
    await axios.patch(`deal/update/${deal._id}`, { stage });
    await load();
  };

  return (
    <div className="page-module">
      <Typography.Title level={3}>Pipeline</Typography.Title>
      <Row gutter={8} style={{ marginBottom: 16 }}>
        <Col flex="auto">
          <Input
            placeholder="New deal"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onPressEnter={add}
          />
        </Col>
        <Col>
          <Button type="primary" onClick={add}>
            Add deal
          </Button>
        </Col>
      </Row>
      <Row gutter={12}>
        {STAGES.map((stage) => (
          <Col key={stage} xs={24} md={8} xl={4}>
            <Card
              title={stage}
              size="small"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                const id = event.dataTransfer.getData('text/plain');
                const deal = deals.find((row) => row._id === id);
                if (deal) move(deal, stage);
              }}
            >
              {deals
                .filter((deal) => (deal.stage || 'Qualified') === stage)
                .map((deal) => (
                  <Card
                    key={deal._id}
                    size="small"
                    style={{ marginBottom: 8 }}
                    draggable
                    onDragStart={(event) => event.dataTransfer.setData('text/plain', deal._id)}
                  >
                    <div>{deal.title}</div>
                    <Typography.Text type="secondary">{deal.value || 0}</Typography.Text>
                  </Card>
                ))}
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}
