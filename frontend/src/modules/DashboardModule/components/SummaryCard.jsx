import { Col, Skeleton, Tooltip } from 'antd';
import { useMoney } from '@/settings';
import { selectMoneyFormat } from '@/redux/settings/selectors';
import { useSelector } from 'react-redux';

export default function AnalyticSummaryCard({
  title,
  icon,
  tone = 'primary',
  data,
  prefix,
  isLoading = false,
}) {
  const { moneyFormatter } = useMoney();
  const money_format_settings = useSelector(selectMoneyFormat);

  const formatted = moneyFormatter({
    amount: data || 0,
    currency_code: money_format_settings?.default_currency_code,
  });

  return (
    <Col className="gutter-row" xs={{ span: 24 }} sm={{ span: 12 }} lg={{ span: 6 }}>
      <div className={`kpi-card kpi-card--${tone}`}>
        <div className="kpi-card-head">
          <span className="kpi-card-title">{title}</span>
          {icon && <span className="kpi-card-icon">{icon}</span>}
        </div>
        {isLoading ? (
          <Skeleton.Input active size="small" className="kpi-card-skeleton" />
        ) : (
          <Tooltip title={formatted}>
            <div className="kpi-card-value">{formatted}</div>
          </Tooltip>
        )}
        <div className="kpi-card-caption">{prefix}</div>
      </div>
    </Col>
  );
}
