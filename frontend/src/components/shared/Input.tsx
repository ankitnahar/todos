import { InputHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={clsx(
            'w-full px-3 py-2 border rounded-lg transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
            'dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100',
            error
              ? 'border-danger-500 dark:border-danger-500'
              : 'border-gray-300 dark:border-gray-600',
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-danger-600 dark:text-danger-400">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
