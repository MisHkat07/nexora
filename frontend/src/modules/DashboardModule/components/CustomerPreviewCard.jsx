import { Progress, Spin } from 'antd';
import { TeamOutlined } from '@ant-design/icons';
import useLanguage from '@/locale/useLanguage';
import { nexoraBrand } from '@/locale/Localization';

const CustomerStat = ({ label, value, color }) => (
  <div className="customer-stat">
    <Progress
      type="circle"
      percent={Number(value) || 0}
      size={88}
      strokeWidth={9}
      strokeColor={color}
      trailColor={nexoraBrand.border}
      format={(percent) => <span className="customer-stat-value">{Math.round(percent)}%</span>}
    />
    <span className="customer-stat-label">{label}</span>
  </div>
);

export default function CustomerPreviewCard({
  isLoading = false,
  activeCustomer = 0,
  newCustomer = 0,
}) {
  const translate = useLanguage();
  return (
    <div className="dash-card customer-preview-card">
      <div className="dash-card-header">
        <h3 className="dash-card-title">{translate('Customers')}</h3>
        <span className="kpi-card-icon">
          <TeamOutlined />
        </span>
      </div>

      {isLoading ? (
        <div className="dash-card-loading">
          <Spin />
        </div>
      ) : (
        <div className="customer-stats">
          <CustomerStat
            label={translate('New Customer this Month')}
            value={newCustomer}
            color={nexoraBrand.primary}
          />
          <CustomerStat
            label={translate('Active Customer')}
            value={activeCustomer}
            color={nexoraBrand.success}
          />
        </div>
      )}
    </div>
  );
}
