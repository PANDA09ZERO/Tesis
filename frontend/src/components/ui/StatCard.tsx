import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  subtitle?: string;
}

// Iconos neutros: solo el rojo conserva color porque comunica un estado que requiere atención.
const colorMap = {
  blue: 'text-gray-400',
  green: 'text-gray-400',
  yellow: 'text-gray-400',
  red: 'text-red-700',
  purple: 'text-gray-400'
};

export default function StatCard({ title, value, icon: Icon, color = 'blue', subtitle }: StatCardProps) {
  return (
    <div className="card flex flex-col gap-3 text-left">
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 break-words text-[0.875rem] font-semibold text-gray-600">{title}</p>
        <Icon className={`h-5 w-5 shrink-0 ${colorMap[color]}`} aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="text-[1.75rem] font-bold leading-none tracking-tight text-gray-900 tabular-nums">{value}</p>
        {subtitle && <p className="mt-2 text-[0.8125rem] text-gray-500">{subtitle}</p>}
      </div>
    </div>
  );
}
