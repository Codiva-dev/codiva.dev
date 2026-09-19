import OpsInterviewsI18n from '@/i18n/OpsInterviewsI18n';
import OpsChromeI18n from '@/i18n/OpsChromeI18n';

export default function InterviewsLayout({ children }: { children: React.ReactNode }) {
  return (
    <OpsInterviewsI18n>
      <OpsChromeI18n>{children}</OpsChromeI18n>
    </OpsInterviewsI18n>
  );
}
