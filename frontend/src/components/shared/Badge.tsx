import { ReactNode } from 'react';
import clsx from 'clsx';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  color?: string;
  className?: string;
}

export function Badge({ children, variant = 'default', color, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        {
          'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300':
            variant === 'default' && !color,
          'bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300':
            variant === 'primary',
          'bg-success-100 text-success-800 dark:bg-success-900/30 dark:text-success-300':
            variant === 'success',
          'bg-warning-100 text-warning-800 dark:bg-warning-900/30 dark:text-warning-300':
            variant === 'warning',
          'bg-danger-100 text-danger-800 dark:bg-danger-900/30 dark:text-danger-300':
            variant === 'danger',
        },
        className
      )}
      style={
        color
          ? {
              backgroundColor: `${color}20`,
              color: color,
            }
          : undefined
      }
    >
      {children}
    </span>
  );
}
