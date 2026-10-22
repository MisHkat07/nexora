import Sentry from './sentry';
// antd 5 needs this compatibility layer on React 19 (message, Modal.confirm, waves, etc.)
import '@ant-design/v5-patch-for-react-19';
import { createRoot } from 'react-dom/client';

import RootApp from './RootApp';
import ErrorFallback from './components/ErrorFallback';

const root = createRoot(document.getElementById('root'));
root.render(
  <Sentry.ErrorBoundary fallback={(props) => <ErrorFallback {...props} />}>
    <RootApp />
  </Sentry.ErrorBoundary>
);
