'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Field from '@/components/ui/Field';
import { Select } from '@/components/ui/Input';
import OpsEntityPicker from '@/components/ops/search/OpsEntityPicker';
import { WORK_PROCESS_KINDS, type WorkProcessKind } from '@/lib/ops/work-board';
import { type ProcessOption } from './types';

export function ProcessFields({
  processOptions,
  processLabels,
  defaultKind = 'none',
  defaultId = '',
}: {
  processOptions: ProcessOption[];
  processLabels: Record<string, string>;
  defaultKind?: WorkProcessKind;
  defaultId?: string;
}) {
  const { t } = useTranslation();
  const [kind, setKind] = useState<WorkProcessKind>(defaultKind);
  const [processId, setProcessId] = useState(defaultId);
  const options = processOptions.filter((row) => row.kind === kind);
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label={t('ops.asignaciones.process')}>
        <Select
          name="processKind"
          size="sm"
          value={kind}
          onChange={(event) => {
            const next = event.target.value as WorkProcessKind;
            setKind(next);
            setProcessId(next === defaultKind ? defaultId : '');
          }}
        >
          {WORK_PROCESS_KINDS.map((id) => (
            <option key={id} value={id}>
              {processLabels[id]}
            </option>
          ))}
        </Select>
      </Field>
      {kind !== 'none' ? (
        <Field label={processLabels[kind]}>
          <OpsEntityPicker
            name="processId"
            required
            value={processId}
            onChange={setProcessId}
            placeholder={t('ops.asignaciones.processSearch')}
            options={options.map((row) => ({ id: row.id, label: row.label }))}
          />
        </Field>
      ) : null}
    </div>
  );
}
