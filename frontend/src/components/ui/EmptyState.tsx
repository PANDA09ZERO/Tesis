import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="mx-auto max-w-sm px-4 py-14 text-center">
      <Icon className="mx-auto mb-4 h-8 w-8 text-gray-400" aria-hidden="true" />
      <h3 className="mb-1.5 text-lg font-bold text-gray-900">{title}</h3>
      <p className="mb-5 text-[0.9375rem] text-gray-500">{description}</p>
      {action}
    </div>
  );
}
