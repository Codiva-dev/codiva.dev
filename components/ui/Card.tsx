import { cn } from '@/lib/cn';
import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';

const variants = {
  panel: 'rounded-xl border border-zinc-200 bg-white',
  raised: 'rounded-2xl border border-zinc-200 bg-white shadow-sm',
};

const paddings = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-8',
};

type CardProps<T extends ElementType = 'div'> = {
  as?: T;
  variant?: keyof typeof variants;
  padding?: keyof typeof paddings;
  className?: string;
  children?: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'className' | 'children'>;

export default function Card<T extends ElementType = 'div'>({
  as,
  variant = 'panel',
  padding = 'md',
  className,
  children,
  ...props
}: CardProps<T>) {
  const Tag = (as ?? 'div') as ElementType;
  return (
    <Tag className={cn(variants[variant], paddings[padding], className)} {...props}>
      {children}
    </Tag>
  );
}

export function CardHeader({
  title,
  action,
  className,
}: {
  title: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-4 flex min-w-0 flex-wrap items-start justify-between gap-3', className)}>
      <h2 className="min-w-0 font-semibold text-zinc-900">{title}</h2>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function SectionTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={cn('font-semibold text-zinc-900', className)}>{children}</h2>;
}
