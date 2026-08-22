import { Avatar, Popover, Button, Badge, Col, List } from 'antd';

// import Notifications from '@/components/Notification';

import { RocketOutlined } from '@ant-design/icons';

import useLanguage from '@/locale/useLanguage';

export default function UpgradeButton() {
  const translate = useLanguage();

  return (
    <Badge count={1} size="small">
      <Button
        type="primary"
        style={{
          float: 'right',
          marginTop: '5px',
          cursor: 'pointer',
          background: '#339393',
          borderColor: '#339393',
          boxShadow: '0 2px 0 rgba(51, 147, 147, 0.2)',
        }}
        icon={<RocketOutlined />}
        onClick={() => {
          window.open(`https://cloud.idurarapp.com`);
        }}
      >
        {translate('try_enterprise_version')}
      </Button>
    </Badge>
  );
}
