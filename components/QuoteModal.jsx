'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Mail, MessageCircle, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LeadForm from '@/components/LeadForm';

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
          <LeadForm
            variant="quote-help"
            formClassName="space-y-4 text-sm text-zinc-800"
            buttonClassName="w-full rounded-xl bg-codiva-primary py-2.5 font-medium text-white transition hover:bg-codiva-primary-dark"
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
              window.open(`https://wa.me/5215566819736?text=${encodeURIComponent(text)}`, '_blank');
              onClose();
            }}
          />
        )}
      </motion.div>
    </motion.div>
  );
}
