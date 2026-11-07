import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Alert, Button } from 'antd';

export default function OnboardingBanner() {
  const [steps, setSteps] = useState([]);
  const [hidden, setHidden] = useState(() => window.localStorage.getItem('nexora-onboarding-hide') === '1');

  useEffect(() => {
    if (hidden) return undefined;
    axios
      .get('onboarding')
      .then((response) => setSteps(response.data.result?.steps || []))
      .catch(() => setSteps([]));
    return undefined;
  }, [hidden]);

  const remaining = steps.filter((step) => !step.done);
  if (hidden || remaining.length === 0) return null;

  return (
    <Alert
      type="info"
      showIcon
      style={{ margin: '12px 16px 0' }}
      message={`Getting started: ${remaining.map((step) => step.label).join(' · ')}`}
      action={
        <>
          <Button size="small" style={{ marginRight: 8 }}>
            <Link to="/customer">Add a customer</Link>
          </Button>
          <Button
            size="small"
            onClick={async () => {
              await axios.post('onboarding/sample').catch(() => {});
              window.localStorage.setItem('nexora-onboarding-hide', '1');
              setHidden(true);
            }}
          >
            Use sample data
          </Button>
        </>
      }
    />
  );
}
