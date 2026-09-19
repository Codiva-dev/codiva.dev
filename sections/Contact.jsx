'use client';

import { useTranslation } from 'react-i18next';
import { revealClass, useInView } from '../utils/inView';
import toast from 'react-hot-toast';
import Heading from '../components/Heading';
import LeadForm from '@/components/LeadForm';

export default function Contact() {
  const { t } = useTranslation();
  const [sectionRef, inView] = useInView(0.6);

  return (
    <section
      ref={sectionRef}
      aria-labelledby="contact-heading"
      className="section-spacing flex w-full justify-center bg-zinc-50 px-6 md:px-12"
    >
      <div className="w-full max-w-2xl rounded-xl bg-white px-5 py-8 shadow-md sm:px-8 sm:py-12 md:px-12">
        <div className={revealClass(inView)}>
          <Heading
            as="h2"
            id="contact-heading"
            size="text-2xl sm:text-3xl md:text-4xl"
            className="mb-10 text-balance text-center text-codiva-primary"
          >
            {t('contact.title')}
          </Heading>
        </div>

        <div className={revealClass(inView, 'reveal-delay-1')}>
          <LeadForm
            variant="contact"
            describedBy="contact-heading"
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
              } catch {
                toast.error(t('common.status.error'), { id: toastId });
              } finally {
                setSubmitting(false);
              }
            }}
          />
        </div>
      </div>
    </section>
  );
}
