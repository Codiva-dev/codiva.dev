'use client';

import { Formik, Form } from 'formik';
import { useTranslation } from 'react-i18next';
import { LeadField } from '@/components/LeadField';
import {
  CONTACT_LEAD_VALUES,
  QUOTE_HELP_VALUES,
  contactLeadSchema,
  quoteHelpSchema,
} from '@/lib/lead-form';

export default function LeadForm({
  variant = 'contact',
  onSubmit,
  formClassName = 'space-y-6 font-inter text-zinc-800',
  buttonClassName = 'w-full rounded-xl bg-codiva-primary px-6 py-3 font-medium text-white transition hover:bg-codiva-primary-dark',
  describedBy,
}) {
  const { t } = useTranslation();
  const isQuote = variant === 'quote-help';

  return (
    <Formik
      initialValues={isQuote ? QUOTE_HELP_VALUES : CONTACT_LEAD_VALUES}
      validationSchema={isQuote ? quoteHelpSchema(t) : contactLeadSchema(t)}
      onSubmit={onSubmit}
    >
      {({ isSubmitting }) => (
        <Form role="form" aria-describedby={describedBy} className={formClassName}>
          <fieldset className="space-y-4" disabled={isSubmitting}>
            <LeadField id={`${variant}-name`} name="name" label={t('common.fields.name')} required />
            {isQuote ? (
              <LeadField
                id="quote-projectType"
                name="projectType"
                label={t('common.fields.projectType')}
                required
                as="select"
              >
                <option value="">{t('quote.fields.selectOption')}</option>
                <option value={t('quote.fields.options.webEssentials')}>
                  {t('quote.fields.options.webEssentials')}
                </option>
                <option value={t('quote.fields.options.appsSystems')}>
                  {t('quote.fields.options.appsSystems')}
                </option>
                <option value={t('quote.fields.options.continuousCare')}>
                  {t('quote.fields.options.continuousCare')}
                </option>
                <option value={t('quote.fields.options.other')}>{t('quote.fields.options.other')}</option>
              </LeadField>
            ) : (
              <LeadField
                id="contact-email"
                name="email"
                type="email"
                label={t('common.fields.email')}
                required
              />
            )}
            <LeadField
              id={`${variant}-message`}
              name="message"
              label={t('common.fields.message')}
              required={!isQuote}
              as="textarea"
              rows={isQuote ? 4 : 5}
            />
            <button type="submit" disabled={isSubmitting} className={buttonClassName}>
              {t('common.buttons.submit')}
            </button>
          </fieldset>
        </Form>
      )}
    </Formik>
  );
}
