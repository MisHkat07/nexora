import { ErpContextProvider } from '@/context/erp';

import { Layout } from 'antd';

const { Content } = Layout;

export default function ErpLayout({ children }) {
  return (
    <ErpContextProvider>
      <Content className="page-card">{children}</Content>
    </ErpContextProvider>
  );
}
