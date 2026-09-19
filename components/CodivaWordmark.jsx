'use client';

import clsx from 'clsx';
import {
  WORDMARK_SIZE,
  WORDMARK_VARIANT,
  wordmarkClassName,
} from './CodivaWordmarkMark';

/**
 * Wordmark unificado: Codiva + .dev con animación en cascada.
 */
export default function CodivaWordmark({
  size = 'md',
  variant = 'default',
  animate = true,
  active = true,
  className = '',
}) {
  const sizes = WORDMARK_SIZE[size] ?? WORDMARK_SIZE.md;
  const colors = WORDMARK_VARIANT[variant] ?? WORDMARK_VARIANT.default;
  const shouldAnimate = animate && active;

  return (
    <span className={wordmarkClassName(size, variant, className)}>
      <span
        className={clsx(
          'inline-block',
          sizes.codiva,
          colors.codiva,
          animate && 'wordmark-cascade wordmark-cascade-codiva',
          shouldAnimate && 'is-in'
        )}
      >
        Codiva
      </span>
      <span
        className={clsx(
          'inline-block',
          sizes.dev,
          colors.dev,
          variant === 'default' && 'font-medium',
          animate && 'wordmark-cascade wordmark-cascade-dev',
          shouldAnimate && 'is-in'
        )}
      >
        .dev
      </span>
    </span>
  );
}
