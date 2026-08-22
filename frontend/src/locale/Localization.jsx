import { ConfigProvider } from 'antd';

export default function Localization({ children }) {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#339393',
          colorLink: '#2a7a7a',
          borderRadius: 6,
          controlHeight: 36,
          fontFamily:
            "'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif",
        },
        components: {
          Button: {
            borderRadius: 6,
            controlHeight: 36,
          },
          Input: {
            borderRadius: 6,
          },
          Select: {
            borderRadius: 6,
          },
          Card: {
            borderRadius: 8,
          },
          Table: {
            borderRadius: 6,
            headerBorderRadius: 6,
          },
          Menu: {
            itemBorderRadius: 6,
            itemHeight: 40,
          },
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}
