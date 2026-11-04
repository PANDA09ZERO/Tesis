import React from 'react';

interface BadgeProps {
  variant: 'success' | 'warning' | 'danger' | 'info' | 'default';
  children: React.ReactNode;
  className?: string;
}

const variantClasses = {
  success: 'bg-green-50 text-green-800 ring-green-600/20 dark:bg-green-950 dark:text-green-200 dark:ring-green-400/20',
  warning: 'bg-amber-50 text-amber-800 ring-amber-600/25 dark:bg-yellow-950 dark:text-yellow-200 dark:ring-yellow-400/20',
  danger: 'bg-red-50 text-red-800 ring-red-600/20 dark:bg-red-950 dark:text-red-200 dark:ring-red-400/20',
  info: 'bg-primary-50 text-primary-800 ring-primary-600/20 dark:bg-gray-700 dark:text-gray-200 dark:ring-gray-500/30',
  default: 'bg-gray-100 text-gray-700 ring-gray-500/20 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-500/30'
};

export default function Badge({ variant, children, className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.8125rem] font-semibold leading-5 ring-1 ring-inset ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  );
}
