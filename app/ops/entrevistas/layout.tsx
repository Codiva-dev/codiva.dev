import OpsChromeI18n from '@/i18n/OpsChromeI18n';
import OpsInterviewsI18n from '@/i18n/OpsInterviewsI18n';
import { loadOpsSurface } from '@/i18n/load-ops-surface';
import enChrome from '@/i18n/locales/en/ops-chrome.json';
import enInterviews from '@/i18n/locales/en/ops-interviews.json';
import esChrome from '@/i18n/locales/es/ops-chrome.json';
import esInterviews from '@/i18n/locales/es/ops-interviews.json';

export default async function InterviewsLayout({ children }: { children: React.ReactNode }) {
  const interviews = await loadOpsSurface(esInterviews, enInterviews);
  const chrome = await loadOpsSurface(esChrome, enChrome);
  return (
    <OpsInterviewsI18n {...interviews}>
      <OpsChromeI18n {...chrome}>{children}</OpsChromeI18n>
    </OpsInterviewsI18n>
  );
}
