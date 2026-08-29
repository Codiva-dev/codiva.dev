'use client';

import { useEffect, useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useTranslation } from 'react-i18next';
import { localIsoDate } from '@/lib/local-iso-date';

const EMAIL_WITH_TLD = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function phoneDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function RequiredMark() {
  return (
    <span className="text-codiva-primary" aria-hidden="true">
      {' '}
      *
    </span>
  );
}

function FieldError({ id, children }) {
  if (!children) return null;
  return (
    <p id={id} data-field-error="" className="mt-1 text-xs text-red-500" role="alert">
      {children}
    </p>
  );
}

export default function FormularioCotizacion() {
  const { t, i18n } = useTranslation();
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const sectionOptions = ['start', 'services', 'blog', 'contact'];
  const functionalityOptions = ['login', 'catalog', 'admin', 'pwa', 'blog', 'multilang'];
  const yesNoPartialOptions = ['yes', 'partial', 'no'];

  const minDelivery = localIsoDate();
  const formik = useFormik({
    initialValues: {
      name: '',
      company: '',
      email: '',
      phone: '',
      need: '',
      sections: [],
      functionalities: [],
      hasContent: '',
      hasDomain: '',
      hasHosting: '',
      deliveryDate: '',
      budget: '',
      referenceSite: '',
      privacyConsent: false,
    },
    validationSchema: Yup.object({
      name: Yup.string().trim().required(t('validation.required')),
      company: Yup.string().trim().required(t('validation.required')),
      email: Yup.string()
        .trim()
        .required(t('validation.required'))
        .matches(EMAIL_WITH_TLD, t('validation.invalidEmail')),
      phone: Yup.string()
        .trim()
        .required(t('validation.required'))
        .test('phone-digits', t('validation.invalidPhone'), (value) => {
          const digits = phoneDigits(value);
          return digits.length >= 8 && digits.length <= 15;
        }),
      need: Yup.string().trim().required(t('validation.required')),
      sections: Yup.array().min(1, t('validation.required')),
      functionalities: Yup.array().min(1, t('validation.required')),
      hasContent: Yup.string().required(t('validation.required')),
      hasDomain: Yup.string().required(t('validation.required')),
      hasHosting: Yup.string().required(t('validation.required')),
      deliveryDate: Yup.string()
        .required(t('validation.required'))
        .test('not-past', t('validation.minDate'), (value) =>
          Boolean(value && value >= minDelivery)
        ),
      budget: Yup.string(),
      referenceSite: Yup.string()
        .transform((v) => (v === '' ? undefined : v))
        .optional()
        .url(t('validation.invalidUrl')),
      privacyConsent: Yup.boolean().oneOf([true], t('validation.required')),
    }),
    onSubmit: async (values, { resetForm, setSubmitting }) => {
      setError('');
      try {
        const res = await fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...values,
            name: values.name.trim(),
            company: values.company.trim(),
            email: values.email.trim(),
            phone: values.phone.trim(),
            need: values.need.trim(),
            locale: i18n.language?.startsWith('en') ? 'en' : 'es',
          }),
        });
        if (res.ok) {
          setSubmitted(true);
          resetForm();
        } else if (res.status === 429) {
          setError(t('status.rateLimited'));
        } else {
          const data = await res.json();
          setError(data.error === 'rate_limited' ? t('status.rateLimited') : data.error || t('status.error'));
        }
      } catch {
        setError(t('status.error'));
      } finally {
        setSubmitting(false);
      }
    },
  });

  useEffect(() => {
    if (!formik.submitCount || formik.isValid || formik.isSubmitting) return;
    const node = document.querySelector('[data-field-error]');
    node?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [formik.submitCount, formik.isValid, formik.isSubmitting, formik.errors]);

  const showError = (field) =>
    (formik.touched[field] || formik.submitCount > 0) && formik.errors[field]
      ? formik.errors[field]
      : '';

  if (submitted) {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-codiva-primary mb-2">{t('status.success')}</h2>
        <p>{t('quote.thankYou')}</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={formik.handleSubmit}
      noValidate
      className="mx-4 max-w-2xl space-y-6 rounded-2xl bg-white p-5 shadow-xl sm:mx-auto sm:p-8"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {['name', 'company', 'email', 'phone'].map((field) => (
          <div key={field}>
            <label htmlFor={`quote-${field}`} className="block mb-1 text-sm font-medium">
              {t(`fields.${field}`)}
              <RequiredMark />
            </label>
            <input
              id={`quote-${field}`}
              name={field}
              type={field === 'email' ? 'email' : field === 'phone' ? 'tel' : 'text'}
              autoComplete={field === 'phone' ? 'tel' : field}
              inputMode={field === 'phone' ? 'tel' : undefined}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              value={formik.values[field]}
              aria-invalid={Boolean(showError(field))}
              aria-describedby={showError(field) ? `quote-${field}-error` : undefined}
              className="w-full border border-zinc-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-codiva-primary"
            />
            <FieldError id={`quote-${field}-error`}>{showError(field)}</FieldError>
          </div>
        ))}
      </div>

      <div>
        <label htmlFor="quote-need" className="block mb-1 text-sm font-medium">
          {t('fields.need')}
          <RequiredMark />
        </label>
        <textarea
          id="quote-need"
          name="need"
          rows="4"
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          value={formik.values.need}
          aria-invalid={Boolean(showError('need'))}
          aria-describedby={showError('need') ? 'quote-need-error' : undefined}
          className="w-full border border-zinc-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-codiva-primary"
        />
        <FieldError id="quote-need-error">{showError('need')}</FieldError>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="block mb-1 text-sm font-medium">
            {t('fields.sections')}
            <RequiredMark />
          </p>
          <div className="space-y-1">
            {sectionOptions.map((key) => (
              <label key={key} className="flex items-center">
                <input
                  type="checkbox"
                  name="sections"
                  value={t(`sections.${key}`)}
                  checked={formik.values.sections.includes(t(`sections.${key}`))}
                  onChange={(e) => {
                    const set = new Set(formik.values.sections);
                    e.target.checked ? set.add(e.target.value) : set.delete(e.target.value);
                    formik.setFieldValue('sections', Array.from(set));
                    formik.setFieldTouched('sections', true, false);
                  }}
                  className="mr-2 rounded border-zinc-300 text-codiva-primary focus:ring-codiva-primary"
                />
                {t(`sections.${key}`)}
              </label>
            ))}
          </div>
          <FieldError id="quote-sections-error">{showError('sections')}</FieldError>
        </div>

        <div>
          <p className="block mb-1 text-sm font-medium">
            {t('fields.functionalities')}
            <RequiredMark />
          </p>
          <div className="space-y-1">
            {functionalityOptions.map((key) => (
              <label key={key} className="flex items-center">
                <input
                  type="checkbox"
                  name="functionalities"
                  value={t(`functionalities.${key}`)}
                  checked={formik.values.functionalities.includes(t(`functionalities.${key}`))}
                  onChange={(e) => {
                    const set = new Set(formik.values.functionalities);
                    e.target.checked ? set.add(e.target.value) : set.delete(e.target.value);
                    formik.setFieldValue('functionalities', Array.from(set));
                    formik.setFieldTouched('functionalities', true, false);
                  }}
                  className="mr-2 rounded border-zinc-300 text-codiva-primary focus:ring-codiva-primary"
                />
                {t(`functionalities.${key}`)}
              </label>
            ))}
          </div>
          <FieldError id="quote-functionalities-error">{showError('functionalities')}</FieldError>
        </div>
      </div>

      {['hasContent', 'hasDomain', 'hasHosting'].map((field) => (
        <div key={field}>
          <label htmlFor={`quote-${field}`} className="block mb-1 text-sm font-medium">
            {t(`fields.${field}`)}
            <RequiredMark />
          </label>
          <select
            id={`quote-${field}`}
            name={field}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            value={formik.values[field]}
            aria-invalid={Boolean(showError(field))}
            aria-describedby={showError(field) ? `quote-${field}-error` : undefined}
            className="w-full border border-zinc-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-codiva-primary"
          >
            <option value="">{t('fields.selectOption')}</option>
            {(field === 'hasContent' ? yesNoPartialOptions : ['yes', 'no']).map((opt) => (
              <option key={opt} value={t(`options.${opt}`)}>
                {t(`options.${opt}`)}
              </option>
            ))}
          </select>
          <FieldError id={`quote-${field}-error`}>{showError(field)}</FieldError>
        </div>
      ))}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="quote-deliveryDate" className="block mb-1 text-sm font-medium">
            {t('fields.deliveryDate')}
            <RequiredMark />
          </label>
          <input
            id="quote-deliveryDate"
            type="date"
            name="deliveryDate"
            min={minDelivery}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            value={formik.values.deliveryDate}
            aria-invalid={Boolean(showError('deliveryDate'))}
            aria-describedby={showError('deliveryDate') ? 'quote-deliveryDate-error' : undefined}
            className="w-full border border-zinc-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-codiva-primary"
          />
          <FieldError id="quote-deliveryDate-error">{showError('deliveryDate')}</FieldError>
        </div>
        <div>
          <label htmlFor="quote-budget" className="block mb-1 text-sm font-medium">
            {t('fields.budget')}
          </label>
          <input
            id="quote-budget"
            type="number"
            name="budget"
            onChange={formik.handleChange}
            value={formik.values.budget}
            className="w-full border border-zinc-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-codiva-primary"
          />
        </div>
        <div>
          <label htmlFor="quote-referenceSite" className="block mb-1 text-sm font-medium">
            {t('fields.referenceSite')}
          </label>
          <input
            id="quote-referenceSite"
            type="url"
            name="referenceSite"
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            value={formik.values.referenceSite}
            aria-invalid={Boolean(showError('referenceSite'))}
            aria-describedby={showError('referenceSite') ? 'quote-referenceSite-error' : undefined}
            className="w-full border border-zinc-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-codiva-primary"
          />
          <FieldError id="quote-referenceSite-error">{showError('referenceSite')}</FieldError>
        </div>
      </div>

      <div>
        <div className="flex items-start">
          <input
            id="quote-privacy"
            type="checkbox"
            name="privacyConsent"
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            checked={formik.values.privacyConsent}
            aria-invalid={Boolean(showError('privacyConsent'))}
            aria-describedby={showError('privacyConsent') ? 'quote-privacy-error' : undefined}
            className="mt-0.5 mr-2 rounded border-zinc-300 text-codiva-primary focus:ring-codiva-primary"
          />
          <label htmlFor="quote-privacy" className="text-sm">
            {t('fields.privacyConsentPrefix')}{' '}
            <a
              href="/legal/aviso-privacidad"
              target="_blank"
              rel="noreferrer"
              className="text-codiva-primary underline"
            >
              {t('fields.privacyConsentLink')}
            </a>
            <RequiredMark />
          </label>
        </div>
        <FieldError id="quote-privacy-error">{showError('privacyConsent')}</FieldError>
      </div>

      <button
        type="submit"
        disabled={formik.isSubmitting}
        className="w-full bg-codiva-primary text-white py-3 rounded-xl hover:bg-codiva-primary-dark transition text-base font-medium disabled:opacity-60"
      >
        {t('buttons.submit')}
      </button>

      {error ? <p className="text-red-500 text-center mt-2">{error}</p> : null}
    </form>
  );
}
