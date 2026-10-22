import { Result } from 'antd';

import useLanguage from '@/locale/useLanguage';

const About = () => {
  const translate = useLanguage();
  return (
    <Result
      status="info"
      title={'ERP'}
      subTitle={translate('Do you need help on customize of this app')}
    />
  );
};

export default About;
