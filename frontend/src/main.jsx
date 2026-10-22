import Sentry from './sentry';
import { createRoot } from 'react-dom/client';

import RootApp from './RootApp';
import ErrorFallback from './components/ErrorFallback';

const root = createRoot(document.getElementById('root'));
root.render(
  <Sentry.ErrorBoundary fallback={(props) => <ErrorFallback {...props} />}>
    <RootApp />
  </Sentry.ErrorBoundary>
);
