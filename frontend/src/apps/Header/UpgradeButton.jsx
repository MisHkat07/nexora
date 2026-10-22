import { Button, Badge } from 'antd';

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
          background: '#0061FF',
          borderColor: '#0061FF',
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
