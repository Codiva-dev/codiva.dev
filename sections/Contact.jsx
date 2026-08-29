'use client';

import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { motion, useInView } from 'framer-motion';
import toast from 'react-hot-toast';
import Heading from '../components/Heading';

export default function Contact() {
  const { t } = useTranslation();
  const sectionRef = useRef(null);
  const inView = useInView(sectionRef, { triggerOnce: false, threshold: 0.6 });

  const validationSchema = Yup.object({
    name: Yup.string().trim().required(t('common.validation.required')),
    email: Yup.string()
      .trim()
      .required(t('common.validation.required'))
      .matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, t('common.validation.invalidEmail')),
    message: Yup.string()
      .trim()
      .min(10, t('common.validation.tooShort'))
      .required(t('common.validation.required')),
  });

  return (
    <section
      ref={sectionRef}
      aria-labelledby="contact-heading"
      className="section-spacing w-full px-6 md:px-12 flex justify-center bg-zinc-50"
    >
      <div className="w-full max-w-2xl rounded-xl bg-white px-5 py-8 shadow-md sm:px-8 sm:py-12 md:px-12">
        {/* Título */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          transition={{ duration: 0.6 }}
        >
          <Heading
            as="h2"
            id="contact-heading"
            size="text-2xl sm:text-3xl md:text-4xl"
            className="mb-10 text-center text-balance text-codiva-primary"
          >
            {t('contact.title')}
          </Heading>
        </motion.div>

        {/* Formulario accesible */}
        <Formik
          initialValues={{ name: '', email: '', message: '' }}
          validationSchema={validationSchema}
          onSubmit={async (values, { resetForm, setSubmitting }) => {
            const toastId = toast.loading(t('common.status.loading'));
            try {
              const response = await fetch('/api/inbox', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  name: values.name.trim(),
                  email: values.email.trim(),
                  message: values.message.trim(),
                }),
              });

              if (response.status === 429) {
                toast.error(t('common.status.rateLimited'), { id: toastId });
                return;
              }

              if (response.status === 400) {
                toast.error(t('common.status.invalidFields'), { id: toastId });
                return;
              }

              if (!response.ok) throw new Error('Error sending message');

              toast.success(t('common.status.success'), { id: toastId });
              resetForm();
            } catch (error) {
              toast.error(t('common.status.error'), { id: toastId });
            } finally {
              setSubmitting(false);
            }
          }}
        >
          {({ isSubmitting }) => (
            <Form
              role="form"
              aria-describedby="contact-heading"
              className="space-y-6 font-inter text-zinc-800"
            >
              <fieldset className="space-y-6" disabled={isSubmitting}>
                {/* Nombre */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                >
                  <label htmlFor="name" className="block text-sm font-medium mb-1">
                    {t('common.fields.name')}
                    <span className="text-codiva-primary" aria-hidden="true"> *</span>
                  </label>
                  <Field
                    id="name"
                    name="name"
                    aria-required="true"
                    aria-describedby="name-error"
                    className="w-full border border-zinc-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-codiva-primary"
                  />
                  <ErrorMessage
                    name="name"
                    component="div"
                    id="name-error"
                    className="text-red-500 text-sm mt-1"
                  />
                </motion.div>

                {/* Email */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <label htmlFor="email" className="block text-sm font-medium mb-1">
                    {t('common.fields.email')}
                    <span className="text-codiva-primary" aria-hidden="true"> *</span>
                  </label>
                  <Field
                    id="email"
                    name="email"
                    type="email"
                    aria-required="true"
                    aria-describedby="email-error"
                    className="w-full border border-zinc-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-codiva-primary"
                  />
                  <ErrorMessage
                    name="email"
                    component="div"
                    id="email-error"
                    className="text-red-500 text-sm mt-1"
                  />
                </motion.div>

                {/* Mensaje */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <label htmlFor="message" className="block text-sm font-medium mb-1">
                    {t('common.fields.message')}
                    <span className="text-codiva-primary" aria-hidden="true"> *</span>
                  </label>
                  <Field
                    id="message"
                    name="message"
                    as="textarea"
                    rows="5"
                    aria-required="true"
                    aria-describedby="message-error"
                    className="w-full border border-zinc-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-codiva-primary"
                  />
                  <ErrorMessage
                    name="message"
                    component="div"
                    id="message-error"
                    className="text-red-500 text-sm mt-1"
                  />
                </motion.div>

                {/* Botón enviar */}
                <motion.button
                  type="submit"
                  disabled={isSubmitting}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-codiva-primary text-white py-3 px-6 rounded-xl hover:bg-codiva-primary-dark transition font-medium"
                >
                  {t('common.buttons.submit')}
                </motion.button>
              </fieldset>
            </Form>
          )}
        </Formik>
      </div>
    </section>
  );
}