import { cn } from '@/lib/cn';
import type { ComponentPropsWithoutRef, ComponentPropsWithRef } from 'react';

const sizes = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-4 py-2',
};

const controlClass =
  'w-full rounded-lg border border-zinc-300 bg-white outline-none transition focus:border-codiva-primary focus:ring-2 focus:ring-codiva-primary/20 disabled:cursor-not-allowed disabled:bg-zinc-50';

type ControlSize = keyof typeof sizes;

export default function Input({
  className,
  size = 'md',
  ...props
}: Omit<ComponentPropsWithoutRef<'input'>, 'size'> & { size?: ControlSize }) {
  return <input className={cn(controlClass, sizes[size], className)} {...props} />;
}

export function Textarea({
  className,
  rows = 4,
  size = 'md',
  ref,
  ...props
}: ComponentPropsWithRef<'textarea'> & { size?: ControlSize }) {
  return <textarea ref={ref} rows={rows} className={cn(controlClass, sizes[size], className)} {...props} />;
}

export function Select({
  className,
  size = 'md',
  children,
  ...props
}: Omit<ComponentPropsWithoutRef<'select'>, 'size'> & { size?: ControlSize }) {
  return (
    <select className={cn(controlClass, sizes[size], className)} {...props}>
      {children}
    </select>
  );
}
