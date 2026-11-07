import SetingsSection from '../components/SetingsSection';
import UpdateSettingModule from '../components/UpdateSettingModule';
import SettingsForm from './SettingsForm';

export default function BrandSettingsModule({ config }) {
  return (
    <UpdateSettingModule config={config}>
      <SetingsSection
        title="Branding"
        description="Logo color, the line at the bottom of emails, and which PDF template this organization uses."
      >
        <SettingsForm />
      </SetingsSection>
    </UpdateSettingModule>
  );
}
