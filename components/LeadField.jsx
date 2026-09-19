import { Field, ErrorMessage } from 'formik';
import { LEAD_INPUT_CLASS } from '@/lib/lead-form';

export function RequiredMark() {
  return (
    <span className="text-codiva-primary" aria-hidden="true">
      {' '}
      *
    </span>
  );
}

export function FieldError({ id, children }) {
  if (!children) return null;
  return (
    <p id={id} data-field-error="" className="mt-1 text-xs text-red-500" role="alert">
      {children}
    </p>
  );
}

export function LeadField({
  id,
  name,
  label,
  required = false,
  as,
  type,
  rows,
  children,
  className = LEAD_INPUT_CLASS,
}) {
  const errorId = `${id}-error`;
  const fieldProps = {
    id,
    name,
    as,
    type,
    rows,
    'aria-required': required || undefined,
    'aria-describedby': errorId,
    className,
  };
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
        {required ? <RequiredMark /> : null}
      </label>
      {children ? <Field {...fieldProps}>{children}</Field> : <Field {...fieldProps} />}
      <ErrorMessage name={name} component="div" id={errorId} className="mt-1 text-xs text-red-500" />
    </div>
  );
}
