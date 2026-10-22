import { useEffect, useState } from 'react';

import DefaultLayout from '../DefaultLayout';

import SidePanel from '@/components/SidePanel';
import { Layout } from 'antd';
import { useCrudContext } from '@/context/crud';

const { Content } = Layout;

const ContentBox = ({ children }) => {
  const { state: stateCrud } = useCrudContext();
  const { isPanelClose } = stateCrud;
  // const { isNavMenuClose } = stateApp;

  const [, setSidePanel] = useState(isPanelClose);

  useEffect(() => {
    let timer = [];
    if (isPanelClose) {
      timer = setTimeout(() => {
        setSidePanel(isPanelClose);
      }, 200);
    } else {
      setSidePanel(isPanelClose);
    }

    return () => clearTimeout(timer);
  }, [isPanelClose]);

  // useEffect(() => {
  //   if (!isNavMenuClose) {
  //     panel.close();
  //   }
  // }, [isNavMenuClose]);
  return (
    <Content className="page-card" style={{ flex: 'none' }}>
      {children}
    </Content>
  );
};

export default function CrudLayout({
  children,
  config,
  sidePanelTopContent,
  sidePanelBottomContent,
  fixHeaderPanel,
}) {
  return (
    <>
      <DefaultLayout>
        <SidePanel
          config={config}
          topContent={sidePanelTopContent}
          bottomContent={sidePanelBottomContent}
          fixHeaderPanel={fixHeaderPanel}
        ></SidePanel>

        <ContentBox> {children}</ContentBox>
      </DefaultLayout>
    </>
  );
}
