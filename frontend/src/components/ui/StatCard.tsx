import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  subtitle?: string;
}

const colorMap = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-green-50 text-green-600',
  yellow: 'bg-yellow-50 text-yellow-600',
  red: 'bg-red-50 text-red-600',
  purple: 'bg-purple-50 text-purple-600'
};

export default function StatCard({ title, value, icon: Icon, color = 'blue', subtitle }: StatCardProps) {
  return (
    <div className="card flex flex-col items-start gap-3 p-3 text-left sm:flex-row sm:items-center sm:p-4">
      <div className={`shrink-0 rounded-lg p-1 sm:p-2 ${colorMap[color]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 break-words">{title}</p>
        <p className="text-xl font-bold text-gray-900">{value}</p>
        {subtitle && <p className="text-[10px] text-gray-400 sm:text-xs">{subtitle}</p>}
      </div>
    </div>
  );
}
