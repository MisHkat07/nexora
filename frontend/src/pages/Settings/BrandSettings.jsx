import BrandSettingsModule from '@/modules/SettingModule/BrandSettingsModule';

export default function BrandSettings() {
  const entity = 'setting';
  const config = {
    entity,
    settingsCategory: 'brand_settings',
    SETTINGS_TITLE: 'Branding',
  };
  return <BrandSettingsModule config={config} />;
}
