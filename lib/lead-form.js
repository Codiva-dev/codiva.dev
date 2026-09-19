import * as Yup from 'yup';

export const EMAIL_WITH_TLD = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function phoneDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

export function requiredText(message) {
  return Yup.string().trim().required(message);
}

export function emailField(requiredMessage, invalidMessage) {
  return requiredText(requiredMessage).matches(EMAIL_WITH_TLD, invalidMessage);
}

export function contactLeadSchema(t) {
  const required = t('common.validation.required');
  return Yup.object({
    name: requiredText(required),
    email: emailField(required, t('common.validation.invalidEmail')),
    message: requiredText(required).min(10, t('common.validation.tooShort')),
  });
}

export function quoteHelpSchema(t) {
  const required = t('common.validation.required');
  return Yup.object({
    name: requiredText(required),
    projectType: Yup.string().required(required),
    message: Yup.string().trim().min(10, t('common.validation.tooShort')),
  });
}

export const CONTACT_LEAD_VALUES = { name: '', email: '', message: '' };
export const QUOTE_HELP_VALUES = { name: '', projectType: '', message: '' };

export const LEAD_INPUT_CLASS =
  'w-full rounded-lg border border-zinc-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-codiva-primary';
