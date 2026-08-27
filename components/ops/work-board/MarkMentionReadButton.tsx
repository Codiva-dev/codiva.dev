'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import { markWorkMentionRead } from '@/lib/ops/work-board-actions';
import { toUserErrorMessage } from '@/lib/user-error';
import { useTranslation } from 'react-i18next';

export default function MarkMentionReadButton({
  mentionId,
  label,
  success,
}: {
  mentionId: string;
  label: string;
  success: string;
}) {
  const router = useRouter();
  const { t } = useTranslation();
  const [pending, start] = useTransition();

  return (
    <Button
      type="button"
      size="xs"
      variant="secondary"
      disabled={pending}
      onClick={() => {
        start(async () => {
          try {
            await markWorkMentionRead(mentionId);
            toast.success(success);
            router.refresh();
          } catch (err) {
            toast.error(toUserErrorMessage(err, t('common.status.actionFailed')));
          }
        });
      }}
    >
      {label}
    </Button>
  );
}
