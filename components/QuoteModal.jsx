'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { motion } from 'framer-motion';
import { Mail, MessageCircle, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function QuoteModal({ showForm, onShowForm, onClose }) {
  const { t } = useTranslation();
  const router = useRouter();
  const modalRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const validationSchema = Yup.object({
    name: Yup.string().trim().required(t('common.validation.required')),
    projectType: Yup.string().required(t('common.validation.required')),
    message: Yup.string().trim().min(10, t('common.validation.tooShort')),
  });

  return (
    <motion.div
      key="modal"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4"
    >
      <motion.div
        ref={modalRef}
        initial={{ scale: 0.9, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 40 }}
        transition={{ duration: 0.3 }}
        className="relative my-auto w-full max-w-md rounded-xl bg-white p-5 shadow-xl sm:p-6"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-zinc-500 transition hover:text-zinc-800"
        >
          <X className="h-5 w-5" />
        </button>

        {!showForm ? (
          <div className="space-y-5 text-center">
            <h2 className="text-lg font-semibold text-zinc-800">{t('quote.promptTitle')}</h2>
            <p className="text-sm text-zinc-600">{t('quote.promptSubtitle')}</p>

            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  router.push('/cotiza');
                }}
                className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-codiva-primary py-2.5 font-medium text-codiva-primary transition hover:bg-codiva-primary hover:text-white"
              >
                <Mail className="h-4 w-4" />
                {t('quote.knowWhatIWant')}
              </button>

              <button
                type="button"
                onClick={onShowForm}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-codiva-primary py-2.5 font-medium text-white transition hover:bg-codiva-primary-dark"
              >
                <MessageCircle className="h-4 w-4" />
                {t('quote.needHelp')}
              </button>
            </div>
          </div>
        ) : (
          <Formik
            initialValues={{ name: '', projectType: '', message: '' }}
            validationSchema={validationSchema}
            onSubmit={(values) => {
              const name = String(values.name || '').trim();
              const projectType = values.projectType;
              const message = String(values.message || '').trim();
              const text = t('quote.whatsappMessage', {
                nameLabel: t('common.fields.name'),
                name,
                typeLabel: t('common.fields.projectType'),
                projectType,
                messageLabel: t('common.fields.message'),
                message: message || 'N/A',
              });
              const url = `https://wa.me/5215566819736?text=${encodeURIComponent(text)}`;
              window.open(url, '_blank');
              onClose();
            }}
          >
            {() => (
              <Form className="space-y-4 text-sm text-zinc-800">
                <div>
                  <label htmlFor="name" className="mb-1 block font-medium">
                    {t('common.fields.name')}
                    <span className="text-codiva-primary" aria-hidden="true"> *</span>
                  </label>
                  <Field
                    name="name"
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-codiva-primary"
                  />
                  <ErrorMessage name="name" component="div" className="mt-1 text-xs text-red-500" />
                </div>

                <div>
                  <label htmlFor="projectType" className="mb-1 block font-medium">
                    {t('common.fields.projectType')}
                    <span className="text-codiva-primary" aria-hidden="true"> *</span>
                  </label>
                  <Field
                    as="select"
                    name="projectType"
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-codiva-primary"
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
                    <option value={t('quote.fields.options.other')}>
                      {t('quote.fields.options.other')}
                    </option>
                  </Field>
                  <ErrorMessage
                    name="projectType"
                    component="div"
                    className="mt-1 text-xs text-red-500"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="mb-1 block font-medium">
                    {t('common.fields.message')}
                  </label>
                  <Field
                    as="textarea"
                    name="message"
                    rows="4"
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-codiva-primary"
                  />
                  <ErrorMessage name="message" component="div" className="mt-1 text-xs text-red-500" />
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-codiva-primary py-2.5 font-medium text-white transition hover:bg-codiva-primary-dark"
                >
                  {t('common.buttons.submit')}
                </button>
              </Form>
            )}
          </Formik>
        )}
      </motion.div>
    </motion.div>
  );
}
