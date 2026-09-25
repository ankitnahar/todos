import clsx from 'clsx';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  return (
    <div
      className={clsx(
        'inline-block animate-spin rounded-full border-4 border-solid border-current border-r-transparent',
        'align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]',
        {
          'h-4 w-4 border-2': size === 'sm',
          'h-8 w-8 border-4': size === 'md',
          'h-12 w-12 border-4': size === 'lg',
        },
        'text-primary-600 dark:text-primary-400',
        className
      )}
      role="status"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

export function LoadingPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <LoadingSpinner size="lg" />
    </div>
  );
}
