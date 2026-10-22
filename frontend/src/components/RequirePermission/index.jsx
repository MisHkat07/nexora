import { Button, Result } from 'antd';
import { useNavigate } from 'react-router-dom';

import usePermission from '@/hooks/usePermission';

// Wraps a page that needs a permission, e.g. /invoice/create needs invoice:create
export default function RequirePermission({ entity, action, children }) {
  const { can } = usePermission();
  const navigate = useNavigate();

  if (can(entity, action)) return children;

  return (
    <Result
      status="403"
      title="You don't have access to this page"
      subTitle="Your role doesn't allow this. Ask an owner or admin of your organization."
      extra={
        <Button type="primary" onClick={() => navigate('/')}>
          Back to dashboard
        </Button>
      }
    />
  );
}
