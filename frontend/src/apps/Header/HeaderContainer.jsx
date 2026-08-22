import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Avatar, Dropdown, Layout, Typography } from 'antd';

import {
  DownOutlined,
  LogoutOutlined,
  SettingOutlined,
  ToolOutlined,
  UserOutlined,
} from '@ant-design/icons';

import { selectCurrentAdmin } from '@/redux/auth/selectors';

import { FILE_BASE_URL } from '@/config/serverApiConfig';

import useLanguage from '@/locale/useLanguage';

const { Text } = Typography;

const TITLE_MAP = [
  { match: (p) => p === '/' || p.startsWith('/dashboard'), key: 'dashboard' },
  { match: (p) => p.startsWith('/customer'), key: 'customers' },
  { match: (p) => p.startsWith('/invoice'), key: 'invoices' },
  { match: (p) => p.startsWith('/quote'), key: 'quotes' },
  { match: (p) => p.startsWith('/payment/mode'), key: 'payment_modes' },
  { match: (p) => p.startsWith('/payment'), key: 'payments' },
  { match: (p) => p.startsWith('/taxes'), key: 'taxes' },
  { match: (p) => p.startsWith('/settings'), key: 'settings' },
  { match: (p) => p.startsWith('/profile'), key: 'profile' },
];

export default function HeaderContent() {
  const currentAdmin = useSelector(selectCurrentAdmin);
  const { Header } = Layout;
  const location = useLocation();
  const translate = useLanguage();
  const navigate = useNavigate();

  const pageTitle = useMemo(() => {
    const found = TITLE_MAP.find((item) => item.match(location.pathname));
    return translate(found?.key || 'dashboard');
  }, [location.pathname, translate]);

  const ProfileDropdown = () => {
    return (
      <div className="profileDropdown" onClick={() => navigate('/profile')}>
        <Avatar
          size="large"
          className="last"
          src={currentAdmin?.photo ? FILE_BASE_URL + currentAdmin?.photo : undefined}
          style={{
            color: '#12263F',
            backgroundColor: currentAdmin?.photo ? 'transparent' : '#E8F0FF',
          }}
        >
          {currentAdmin?.name?.charAt(0)?.toUpperCase()}
        </Avatar>
        <div className="profileDropdownInfo">
          <p>
            {currentAdmin?.name} {currentAdmin?.surname}
          </p>
          <p>{currentAdmin?.email}</p>
        </div>
      </div>
    );
  };

  const items = [
    {
      label: <ProfileDropdown className="headerDropDownMenu" />,
      key: 'ProfileDropdown',
    },
    {
      type: 'divider',
    },
    {
      icon: <UserOutlined />,
      key: 'settingProfile',
      label: <Link to={'/profile'}>{translate('profile_settings')}</Link>,
    },
    {
      icon: <ToolOutlined />,
      key: 'settingApp',
      label: <Link to={'/settings'}>{translate('app_settings')}</Link>,
    },
    {
      type: 'divider',
    },
    {
      icon: <LogoutOutlined />,
      key: 'logout',
      label: <Link to={'/logout'}>{translate('logout')}</Link>,
    },
  ];

  const displayName = [currentAdmin?.name, currentAdmin?.surname].filter(Boolean).join(' ');

  return (
    <Header className="app-header">
      <div className="app-header-left">
        <Text className="app-header-eyebrow">{translate('workspace')}</Text>
        <Text className="app-header-title">{pageTitle}</Text>
      </div>

      <div className="app-header-right">
        <button
          type="button"
          className="app-header-settings"
          onClick={() => navigate('/settings')}
          aria-label={translate('settings')}
        >
          <SettingOutlined />
        </button>

        <Dropdown
          menu={{
            items,
          }}
          trigger={['click']}
          placement="bottomRight"
          overlayStyle={{ width: '280px' }}
        >
          <button type="button" className="app-header-profile">
            <Avatar
              src={currentAdmin?.photo ? FILE_BASE_URL + currentAdmin?.photo : undefined}
              style={{
                color: '#12263F',
                backgroundColor: currentAdmin?.photo ? 'transparent' : '#E8F0FF',
              }}
              size={36}
            >
              {currentAdmin?.name?.charAt(0)?.toUpperCase()}
            </Avatar>
            <span className="app-header-profile-meta">
              <span className="app-header-profile-name">{displayName || translate('profile')}</span>
              <span className="app-header-profile-role">{currentAdmin?.role || 'owner'}</span>
            </span>
            <DownOutlined className="app-header-caret" />
          </button>
        </Dropdown>
      </div>
    </Header>
  );
}
