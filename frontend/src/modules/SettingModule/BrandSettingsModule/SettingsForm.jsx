import { Form, Input, Select } from 'antd';

export default function SettingsForm() {
  return (
    <div>
      <Form.Item
        label="Brand color"
        name="brand_color"
        rules={[{ required: true, pattern: /^#[0-9a-fA-F]{6}$/, message: 'Use a hex color like #0061ff' }]}
      >
        <Input placeholder="#0061ff" />
      </Form.Item>
      <Form.Item label="Email footer" name="email_footer">
        <Input.TextArea rows={3} placeholder="Shown at the bottom of emails and PDFs" />
      </Form.Item>
      <Form.Item label="PDF template" name="pdf_template" rules={[{ required: true }]}>
        <Select
          options={[
            { value: 'classic', label: 'Classic' },
            { value: 'modern', label: 'Modern' },
          ]}
        />
      </Form.Item>
    </div>
  );
}
