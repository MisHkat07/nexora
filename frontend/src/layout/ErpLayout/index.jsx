import { ErpContextProvider } from '@/context/erp';

import { Layout } from 'antd';
import { useSelector } from 'react-redux';

const { Content } = Layout;

export default function ErpLayout({ children }) {
  return (
    <ErpContextProvider>
      <Content
        className="whiteBox shadow layoutPadding"
        style={{
          margin: '30px auto',
          width: '100%',
          maxWidth: '100%',
          minHeight: '600px',
          margin: '0',
          padding: '24px',
          boxSizing: 'border-box',
        }}
      >
        {children}
      </Content>
    </ErpContextProvider>
  );
}
