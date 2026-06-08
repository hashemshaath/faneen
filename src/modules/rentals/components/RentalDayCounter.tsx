import React from 'react';
import { Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { daysLeft, overdueDays, alertTier } from '../utils/dayCounter';

export interface RentalDayCounterProps {
  endDate: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const TONE: Record<string, string> = {
  safe: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-300',
  t7: 'bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-300',
  t3: 'bg-amber-500/15 text-amber-700 border-amber-500/40 dark:text-amber-300',
  t1: 'bg-orange-500/15 text-orange-700 border-orange-500/40 dark:text-orange-300',
  expired: 'bg-red-500/10 text-red-700 border-red-500/30 dark:text-red-300',
  overdue: 'bg-red-500/15 text-red-800 border-red-500/40 dark:text-red-300',
};

export const RentalDayCounter: React.FC<RentalDayCounterProps> = ({ endDate, className = '', size = 'md' }) => {
  const { isRTL } = useLanguage();
  const tier = alertTier(endDate);
  const left = daysLeft(endDate);
  const over = overdueDays(endDate);
  const isOver = tier === 'overdue';
  const isExpired = tier === 'expired' || isOver;

  const Icon = isExpired ? AlertTriangle : tier === 'safe' ? CheckCircle2 : Clock;
  const sizeMap = { sm: 'text-xs px-2 py-1', md: 'text-sm px-3 py-1.5', lg: 'text-base px-4 py-2' };

  let label: string;
  if (isOver) label = isRTL ? `متجاوز ${over} يوم` : `${over} days overdue`;
  else if (tier === 'expired') label = isRTL ? 'انتهى اليوم' : 'Ends today';
  else label = isRTL ? `${left} يوم متبقي` : `${left} days left`;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${TONE[tier]} ${sizeMap[size]} ${className} tech-content`}>
      <Icon className="size-3.5" />
      {label}
    </span>
  );
};