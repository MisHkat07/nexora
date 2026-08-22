import { useState, useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button, Drawer, Layout, Menu, Typography } from 'antd';

import { useAppContext } from '@/context/appContext';

import useLanguage from '@/locale/useLanguage';
import useResponsive from '@/hooks/useResponsive';

import {
  SettingOutlined,
  CustomerServiceOutlined,
  ContainerOutlined,
  FileSyncOutlined,
  DashboardOutlined,
  CreditCardOutlined,
  MenuOutlined,
  PercentageOutlined,
  WalletOutlined,
} from '@ant-design/icons';

const { Sider } = Layout;
const { Text } = Typography;

function resolveSelectedKey(pathname) {
  if (!pathname || pathname === '/') return 'dashboard';
  if (pathname.startsWith('/customer')) return 'customer';
  if (pathname.startsWith('/invoice')) return 'invoice';
  if (pathname.startsWith('/quote')) return 'quote';
  if (pathname.startsWith('/payment/mode')) return 'paymentMode';
  if (pathname.startsWith('/payment')) return 'payment';
  if (pathname.startsWith('/taxes')) return 'taxes';
  if (pathname.startsWith('/settings')) return 'generalSettings';
  if (pathname.startsWith('/profile')) return 'generalSettings';
  return pathname.replace(/^\//, '').split('/')[0];
}

export default function Navigation() {
  const { isMobile } = useResponsive();

  return isMobile ? <MobileSidebar /> : <Sidebar collapsible={false} />;
}

function Sidebar({ collapsible, isMobile = false }) {
  const location = useLocation();

  const { state: stateApp, appContextAction } = useAppContext();
  const { isNavMenuClose } = stateApp;
  const { navMenu } = appContextAction;
  const [showLogoApp, setLogoApp] = useState(isNavMenuClose);
  const selectedKey = useMemo(() => resolveSelectedKey(location.pathname), [location.pathname]);

  const translate = useLanguage();
  const navigate = useNavigate();

  const items = [
    {
      key: 'main',
      type: 'group',
      label: translate('main_menu'),
      children: [
        {
          key: 'dashboard',
          icon: <DashboardOutlined />,
          label: <Link to={'/'}>{translate('dashboard')}</Link>,
        },
        {
          key: 'customer',
          icon: <CustomerServiceOutlined />,
          label: <Link to={'/customer'}>{translate('customers')}</Link>,
        },
      ],
    },
    {
      key: 'sales',
      type: 'group',
      label: translate('sales'),
      children: [
        {
          key: 'invoice',
          icon: <ContainerOutlined />,
          label: <Link to={'/invoice'}>{translate('invoices')}</Link>,
        },
        {
          key: 'quote',
          icon: <FileSyncOutlined />,
          label: <Link to={'/quote'}>{translate('quotes')}</Link>,
        },
        {
          key: 'payment',
          icon: <CreditCardOutlined />,
          label: <Link to={'/payment'}>{translate('payments')}</Link>,
        },
      ],
    },
    {
      key: 'config',
      type: 'group',
      label: translate('configuration'),
      children: [
        {
          key: 'paymentMode',
          label: <Link to={'/payment/mode'}>{translate('payment_modes')}</Link>,
          icon: <WalletOutlined />,
        },
        {
          key: 'taxes',
          label: <Link to={'/taxes'}>{translate('taxes')}</Link>,
          icon: <PercentageOutlined />,
        },
        {
          key: 'generalSettings',
          label: <Link to={'/settings'}>{translate('settings')}</Link>,
          icon: <SettingOutlined />,
        },
      ],
    },
  ];

  useEffect(() => {
    if (isNavMenuClose) {
      setLogoApp(isNavMenuClose);
    }
    const timer = setTimeout(() => {
      if (!isNavMenuClose) {
        setLogoApp(isNavMenuClose);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [isNavMenuClose]);

  const onCollapse = () => {
    navMenu.collapse();
  };

  return (
    <Sider
      collapsible={collapsible}
      collapsed={collapsible ? isNavMenuClose : collapsible}
      onCollapse={onCollapse}
      className="navigation"
      width={248}
      style={{
        overflow: 'hidden',
        height: isMobile ? '100vh' : '100vh',
        position: isMobile ? 'absolute' : 'sticky',
        top: 0,
      }}
      theme={'light'}
    >
      <div className="navigation-inner">
        <div className="logo" onClick={() => navigate('/')} role="button" tabIndex={0}>
          <span className="logo-mark">ERP</span>
          {!showLogoApp && (
            <div className="logo-text-wrap">
              <span className="logo-text">ERP / CRM</span>
              <Text className="logo-sub">{translate('business_workspace')}</Text>
            </div>
          )}
        </div>

        <Menu
          className="navigation-menu"
          items={items}
          mode="inline"
          theme={'light'}
          selectedKeys={[selectedKey]}
          style={{
            borderInlineEnd: 'none',
            background: 'transparent',
          }}
        />

        {!showLogoApp && (
          <div className="navigation-footer">
            <Text type="secondary">{translate('version')} 4.1.0</Text>
          </div>
        )}
      </div>
    </Sider>
  );
}

function MobileSidebar() {
  const [visible, setVisible] = useState(false);
  const showDrawer = () => {
    setVisible(true);
  };
  const onClose = () => {
    setVisible(false);
  };

  return (
    <>
      <Button
        type="text"
        size="large"
        onClick={showDrawer}
        className="mobile-sidebar-btn"
        style={{ marginLeft: 16 }}
      >
        <MenuOutlined style={{ fontSize: 18 }} />
      </Button>
      <Drawer
        width={260}
        placement={'left'}
        closable={false}
        onClose={onClose}
        open={visible}
        styles={{ body: { padding: 0 } }}
      >
        <Sidebar collapsible={false} isMobile={true} />
      </Drawer>
    </>
  );
}
