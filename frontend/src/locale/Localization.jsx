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
          colorBorderSecondary: '#EDF1F7',
          colorBgLayout: nexoraBrand.surface,
          borderRadius: 8,
          borderRadiusLG: 12,
          controlHeight: 36,
          fontSize: 14,
          fontWeightStrong: 600,
          fontFamily:
            "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
          boxShadow: '0 4px 16px rgba(18, 38, 63, 0.08)',
          boxShadowSecondary: '0 8px 24px rgba(18, 38, 63, 0.10)',
        },
        components: {
          Button: {
            fontWeight: 500,
            primaryShadow: 'none',
            defaultShadow: 'none',
            dangerShadow: 'none',
          },
          Input: {
            activeShadow: '0 0 0 3px rgba(0, 97, 255, 0.12)',
          },
          Select: {
            optionSelectedFontWeight: 500,
          },
          Card: {
            borderRadiusLG: 12,
          },
          Table: {
            headerBg: nexoraBrand.surface,
            headerColor: nexoraBrand.textMuted,
            rowHoverBg: '#F8FAFF',
            cellPaddingBlock: 14,
          },
          Menu: {
            itemBorderRadius: 8,
            itemHeight: 40,
            itemSelectedBg: '#E8F0FF',
            itemSelectedColor: nexoraBrand.primary,
            itemHoverBg: nexoraBrand.hoverBg,
            horizontalItemSelectedBg: nexoraBrand.primary,
          },
          Tag: {
            borderRadiusSM: 999,
          },
          Modal: {
            borderRadiusLG: 14,
          },
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}
