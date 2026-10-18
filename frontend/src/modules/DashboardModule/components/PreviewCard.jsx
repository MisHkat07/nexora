import { useMemo } from 'react';
import { Col, Progress, Spin } from 'antd';
import useLanguage from '@/locale/useLanguage';

const colours = {
  draft: '#A6B5CC',
  sent: '#0061FF',
  pending: '#FF9F00',
  unpaid: '#E63757',
  overdue: '#B4233F',
  partially: '#8833FF',
  paid: '#00D97E',
  declined: '#E63757',
  accepted: '#00D97E',
  expired: '#FD7E14',
};

const defaultStatistics = [
  {
    tag: 'draft',
    value: 0,
  },
  {
    tag: 'pending',
    value: 0,
  },
  {
    tag: 'sent',
    value: 0,
  },
  {
    tag: 'accepted',
    value: 0,
  },
  {
    tag: 'declined',
    value: 0,
  },
  {
    tag: 'expired',
    value: 0,
  },
];

const defaultInvoiceStatistics = [
  {
    tag: 'draft',
    value: 0,
  },
  {
    tag: 'pending',
    value: 0,
  },
  {
    tag: 'overdue',
    value: 0,
  },
  {
    tag: 'paid',
    value: 0,
  },
  {
    tag: 'unpaid',
    value: 0,
  },
  {
    tag: 'partially',
    value: 0,
  },
];

const PreviewState = ({ tag, value }) => {
  const translate = useLanguage();
  const color = colours[tag] || '#0061FF';
  return (
    <div className="status-row">
      <div className="status-row-label">
        <span className="status-dot" style={{ background: color }} />
        <span className="capitalize">{translate(tag)}</span>
        <span className="status-row-value">{value}%</span>
      </div>
      <Progress percent={value} showInfo={false} strokeColor={color} size="small" />
    </div>
  );
};

export default function PreviewCard({
  title = 'Preview',
  statistics = defaultStatistics,
  isLoading = false,
  entity = 'invoice',
}) {
  const statisticsMap = useMemo(() => {
    if (entity === 'invoice') {
      return defaultInvoiceStatistics.map((defaultStat) => {
        const matchedStat = Array.isArray(statistics)
          ? statistics.find((stat) => stat.tag === defaultStat.tag)
          : null;
        return matchedStat || defaultStat;
      });
    } else {
      return defaultStatistics.map((defaultStat) => {
        const matchedStat = Array.isArray(statistics)
          ? statistics.find((stat) => stat.tag === defaultStat.tag)
          : null;
        return matchedStat || defaultStat;
      });
    }
  }, [statistics, entity]);

  return (
    <Col
      className="gutter-row"
      xs={{ span: 24 }}
      sm={{ span: 24 }}
      md={{ span: 12 }}
      lg={{ span: 12 }}
    >
      <div className="status-breakdown">
        <h3 className="dash-card-title">{title}</h3>
        {isLoading ? (
          <div className="dash-card-loading">
            <Spin />
          </div>
        ) : (
          statisticsMap?.map((status, index) => (
            <PreviewState key={index} tag={status.tag} value={status?.value} />
          ))
        )}
      </div>
    </Col>
  );
}
