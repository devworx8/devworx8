// Payment utility functions

import type { FeeStatusInfo } from '@/types/payments';

export function formatCurrency(amount: number): string {
  return `R ${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}`;
}

export function formatPaymentDate(dateString: string): string {
  const date = new Date(dateString);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = String(date.getDate()).padStart(2, '0');
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

export function getFeeStatusColor(dueDate: string, gracePeriodDays: number = 7): FeeStatusInfo {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diffTime = now.getTime() - due.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const daysUntilDue = -diffDays;

  if (daysUntilDue > 14) {
    return {
      color: '#22c55e',
      bgColor: 'rgba(34, 197, 94, 0.1)',
      label: `Due in ${daysUntilDue} days`,
    };
  } else if (daysUntilDue > 7) {
    return {
      color: '#22c55e',
      bgColor: 'rgba(34, 197, 94, 0.1)',
      label: `Due in ${daysUntilDue} days`,
    };
  } else if (daysUntilDue > 3) {
    return {
      color: '#eab308',
      bgColor: 'rgba(234, 179, 8, 0.1)',
      label: `Due in ${daysUntilDue} days`,
    };
  } else if (daysUntilDue > 0) {
    return {
      color: '#f97316',
      bgColor: 'rgba(249, 115, 22, 0.1)',
      label: daysUntilDue === 1 ? 'Due tomorrow' : `Due in ${daysUntilDue} days`,
    };
  } else if (daysUntilDue === 0) {
    return {
      color: '#f97316',
      bgColor: 'rgba(249, 115, 22, 0.15)',
      label: 'Due today',
    };
  } else if (diffDays <= gracePeriodDays) {
    const daysLeft = gracePeriodDays - diffDays;
    return {
      color: '#f97316',
      bgColor: 'rgba(249, 115, 22, 0.1)',
      label: `Grace period (${daysLeft}d left)`,
    };
  } else if (diffDays <= 30) {
    return {
      color: '#ef4444',
      bgColor: 'rgba(239, 68, 68, 0.1)',
      label: `Overdue (${diffDays} days)`,
    };
  } else if (diffDays <= 60) {
    return {
      color: '#dc2626',
      bgColor: 'rgba(220, 38, 38, 0.15)',
      label: `Overdue (${diffDays} days)`,
    };
  } else {
    return {
      color: '#991b1b',
      bgColor: 'rgba(153, 27, 27, 0.15)',
      label: `Severely overdue (${diffDays} days)`,
    };
  }
}

export function getUploadStatusColor(status: string): { color: string; bgColor: string } {
  switch (status) {
    case 'approved':
      return { color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.1)' };
    case 'rejected':
      return { color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)' };
    default:
      return { color: '#fbbf24', bgColor: 'rgba(251, 191, 36, 0.1)' };
  }
}

/**
 * Compact currency format for dashboard cards and stats.
 * R1.2M, R45k, R500
 */
export function formatCurrencyCompact(amount: number): string {
  if (amount >= 1_000_000) {
    return `R${(amount / 1_000_000).toFixed(1)}M`;
  } else if (amount >= 1_000) {
    return `R${(amount / 1_000).toFixed(0)}k`;
  }
  return `R${amount.toFixed(0)}`;
}
