'use client';

import { useCallback, useState, type ComponentProps, type ReactNode } from 'react';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import ConfirmDialog from '@/components/ops/ConfirmDialog';
import { toUserErrorMessage } from '@/lib/user-error';

type ServerAction = ((formData: FormData) => Promise<unknown>) | (() => Promise<unknown>);

type ToastFormProps = Omit<ComponentProps<'form'>, 'action'> & {
  action: ServerAction;
  success?: string;
  loading?: string;
  confirmMessage?: string;
  confirmTitle?: string;
  confirmLabel?: string;
  confirmTone?: 'danger' | 'primary';
  validate?: (formData: FormData) => string | null | undefined;
  children: ReactNode;
};

/**
 * Formulario que muestra toast de loading / éxito / error alrededor de una server action.
 * Si la action hace `redirect()`, usa `redirectWithToast` para el mensaje en la página destino.
 */
export default function ToastForm({
  action,
  success,
  loading,
  confirmMessage,
  confirmTitle,
  confirmLabel,
  confirmTone = 'danger',
  validate,
  children,
  ...formProps
}: ToastFormProps) {
  const { t } = useTranslation();
  const successLabel = success ?? t('ops.toast.ready');
  const loadingLabel = loading ?? t('ops.toast.saving');
  const [pending, setPending] = useState<FormData | null>(null);

  function errorMessage(err: unknown): string {
    return toUserErrorMessage(err, t('common.status.actionFailed'));
  }

  const run = useCallback(
    async (formData: FormData) => {
      const id = toast.loading(loadingLabel);
      try {
        await action(formData);
        toast.success(successLabel, { id });
      } catch (err) {
        if (isRedirectError(err)) {
          toast.dismiss(id);
          throw err;
        }
        toast.error(errorMessage(err), { id });
      }
    },
    // errorMessage uses t; keep the same toast copy for this render
    [action, loadingLabel, successLabel, t]
  );

  const closeConfirm = useCallback(() => setPending(null), []);

  return (
    <>
      <form
        {...formProps}
        action={async (formData) => {
          const invalid = validate?.(formData);
          if (invalid) {
            toast.error(invalid);
            return;
          }
          if (confirmMessage) {
            setPending(formData);
            return;
          }
          await run(formData);
        }}
      >
        {children}
      </form>
      {confirmMessage ? (
        <ConfirmDialog
          open={pending !== null}
          title={confirmTitle}
          message={confirmMessage}
          confirmLabel={confirmLabel}
          tone={confirmTone}
          onCancel={closeConfirm}
          onConfirm={() => {
            const data = pending;
            setPending(null);
            if (!data) return;
            const invalid = validate?.(data);
            if (invalid) {
              toast.error(invalid);
              return;
            }
            void run(data);
          }}
        />
      ) : null}
    </>
  );
}
