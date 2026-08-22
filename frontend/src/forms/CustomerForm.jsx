import { Form, Input, Row, Col } from 'antd';
import { validatePhoneNumber } from '@/utils/helpers';

import useLanguage from '@/locale/useLanguage';

export default function CustomerForm({ isUpdateForm = false }) {
  const translate = useLanguage();
  const validateEmptyString = (_, value) => {
    if (value && value.trim() === '') {
      return Promise.reject(new Error('Field cannot be empty'));
    }

    return Promise.resolve();
  };

  return (
    <>
      <Form.Item
        label={translate('company')}
        name="company"
        rules={[
          {
            required: true,
          },
          {
            validator: validateEmptyString,
          },
        ]}
      >
        <Input />
      </Form.Item>
      <Row gutter={12}>
        <Col span={12}>
          <Form.Item
            label={translate('manager_first_name')}
            name="managerName"
            rules={[
              {
                required: true,
              },
              {
                validator: validateEmptyString,
              },
            ]}
          >
            <Input />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            label={translate('manager_last_name')}
            name="managerSurname"
            rules={[
              {
                required: true,
              },
              {
                validator: validateEmptyString,
              },
            ]}
          >
            <Input />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item
        name="phone"
        label={translate('Phone')}
        rules={[
          {
            required: true,
          },
          {
            validator: validateEmptyString,
          },
          {
            pattern: validatePhoneNumber,
            message: 'Please enter a valid phone number',
          },
        ]}
      >
        <Input />
      </Form.Item>
      <Form.Item
        name="email"
        label={translate('email')}
        rules={[
          {
            type: 'email',
          },
          {
            required: true,
          },
          {
            validator: validateEmptyString,
          },
        ]}
      >
        <Input />
      </Form.Item>
    </>
  );
}
