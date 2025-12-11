'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative';
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  description: string;
}

export default function KpiCard({
  title,
  value,
  change,
  changeType,
  icon: Icon,
  iconBg,
  iconColor,
  description,
}: KpiCardProps) {
  return (
    <div className="stats-card group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-2">{title}</p>
          <p className="text-4xl font-bold text-gray-900 mb-3">{value}</p>
        </div>
        <div className={`stats-icon ${iconBg}`}>
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
      </div>
      
      <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
        <span 
          className={`text-sm font-semibold ${
            changeType === 'positive' ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {change}
        </span>
        <span className="text-sm text-gray-600">{description}</span>
      </div>
    </div>
  );
}