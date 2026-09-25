import { ReactNode, CSSProperties } from 'react';
import clsx from 'clsx';

interface CardProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  hover?: boolean;
  onClick?: () => void;
}

export function Card({ children, className, style, hover = false, onClick }: CardProps) {
  return (
    <div
      className={clsx(
        'bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700',
        hover && 'hover:shadow-md transition-shadow duration-200',
        onClick && 'cursor-pointer',
        className
      )}
      style={style}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
