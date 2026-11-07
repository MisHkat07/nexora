import { useEffect, useState } from 'react';
import axios from 'axios';
import { Col, Row, Statistic } from 'antd';

export default function Insights() {
  const [data, setData] = useState(null);

  useEffect(() => {
    axios
      .get('dashboard')
      .then((response) => setData(response.data.result))
      .catch(() => setData(null));
  }, []);

  if (!data) return null;

  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
      <Col xs={12} md={6}>
        <Statistic title="Unpaid" value={data.unpaid} precision={2} />
      </Col>
      <Col xs={12} md={6}>
        <Statistic title="Collected" value={data.collected} precision={2} />
      </Col>
      <Col xs={12} md={6}>
        <Statistic title="Profit" value={data.profit} precision={2} />
      </Col>
      <Col xs={12} md={6}>
        <Statistic title="Pipeline" value={data.pipeline} precision={2} />
      </Col>
    </Row>
  );
}
