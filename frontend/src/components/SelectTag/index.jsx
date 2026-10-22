import { Select } from 'antd';
import useLanguage from '@/locale/useLanguage';

// `options` may be plain values or { value, label } objects
export default function SelectTag({ options, defaultValue }) {
  const translate = useLanguage();
  return (
    <Select
      defaultValue={defaultValue}
      style={{
        width: '100%',
      }}
    >
      {options?.map((option) =>
        typeof option === 'object' ? (
          <Select.Option key={option.value} value={option.value}>
            {translate(option.label)}
          </Select.Option>
        ) : (
          <Select.Option key={option} value={option}>
            {option}
          </Select.Option>
        )
      )}
    </Select>
  );
}
