import { ConfigProvider } from 'antd';

/** Nexora brand tokens from brand guideline */
export const nexoraBrand = {
  primary: '#0061FF',
  primaryHover: '#0052D9',
  purple: '#8833FF',
  success: '#00D97E',
  warning: '#FD7E14',
  danger: '#E63757',
  away: '#FF9F00',
  neutral: '#6E84A3',
  text: '#12263F',
  textMuted: '#6E84A3',
  border: '#E3EBF6',
  surface: '#F5F8FC',
  white: '#FFFFFF',
  sidebarBg: '#FFFFFF',
  activeBg: '#0061FF',
  hoverBg: 'rgba(0, 97, 255, 0.08)',
};

export default function Localization({ children }) {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: nexoraBrand.primary,
          colorInfo: nexoraBrand.primary,
          colorSuccess: nexoraBrand.success,
          colorWarning: nexoraBrand.warning,
          colorError: nexoraBrand.danger,
          colorLink: nexoraBrand.primary,
          colorText: nexoraBrand.text,
          colorTextSecondary: nexoraBrand.textMuted,
          colorBorder: nexoraBrand.border,
          colorBgLayout: nexoraBrand.surface,
          borderRadius: 10,
          controlHeight: 36,
          fontFamily:
            "'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif",
        },
        components: {
          Button: {
            borderRadius: 10,
            controlHeight: 36,
            primaryShadow: '0 4px 12px rgba(0, 97, 255, 0.25)',
          },
          Input: {
            borderRadius: 10,
          },
          Select: {
            borderRadius: 10,
          },
          Card: {
            borderRadius: 12,
          },
          Table: {
            borderRadius: 10,
            headerBorderRadius: 10,
            headerBg: nexoraBrand.surface,
            headerColor: nexoraBrand.textMuted,
            rowHoverBg: '#F8FAFF',
          },
          Menu: {
            itemBorderRadius: 10,
            itemHeight: 42,
            itemSelectedBg: '#E8F0FF',
            itemSelectedColor: nexoraBrand.primary,
            itemHoverBg: nexoraBrand.hoverBg,
            horizontalItemSelectedBg: nexoraBrand.primary,
          },
          Tag: {
            borderRadiusSM: 999,
          },
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}
