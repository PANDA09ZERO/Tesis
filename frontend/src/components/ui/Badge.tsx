import React from 'react';

interface BadgeProps {
  variant: 'success' | 'warning' | 'danger' | 'info' | 'default';
  children: React.ReactNode;
  className?: string;
}

const variantClasses = {
  success: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200',
  warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200',
  danger: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
  info: 'bg-blue-100 text-blue-800 dark:bg-gray-700 dark:text-gray-200',
  default: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
};

export default function Badge({ variant, children, className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  );
}
