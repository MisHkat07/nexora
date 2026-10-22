import { Button, Result } from 'antd';

// Shown instead of a blank page when a component crashes
export default function ErrorFallback({ resetError }) {
  return (
    <Result
      status="error"
      title="Something went wrong"
      subTitle="The error has been reported. Reload the page to continue."
      extra={[
        <Button type="primary" key="reload" onClick={() => window.location.reload()}>
          Reload page
        </Button>,
        <Button key="retry" onClick={resetError}>
          Try again
        </Button>,
      ]}
    />
  );
}
