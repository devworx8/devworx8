/**
 * Pure helper functions for student age calculation, grouping, and display.
 */

import type { AgeGroup, FilterOptions, Student } from './types';

export function calculateAgeInfo(dateOfBirth: string | null): {
  age_months: number;
  age_years: number;
} {
  if (!dateOfBirth) return { age_months: 0, age_years: 0 };

  const birth = new Date(dateOfBirth);
  const today = new Date();

  const totalMonths =
    (today.getFullYear() - birth.getFullYear()) * 12 +
    (today.getMonth() - birth.getMonth());
  const years = Math.floor(totalMonths / 12);

  return {
    age_months: Math.max(0, totalMonths),
    age_years: years,
  };
}

export function findAgeGroup(
  ageMonths: number,
  ageGroups: AgeGroup[],
): AgeGroup | undefined {
  return ageGroups.find((group) => {
    const min = group.min_age_months;
    const max = group.max_age_months;
    if (!Number.isFinite(min) || !Number.isFinite(max)) return false;
    return ageMonths >= (min as number) && ageMonths <= (max as number);
  });
}

export function formatAge(
  ageMonths: number,
  ageYears: number,
  schoolType: string,
): string {
  if (schoolType === 'preschool') {
    if (ageYears < 2) {
      return `${ageMonths} months`;
    }
    const remainingMonths = ageMonths % 12;
    return remainingMonths > 0
      ? `${ageYears}y ${remainingMonths}m`
      : `${ageYears} years`;
  }
  return `${ageYears} years`;
}

/** Preschool age group names configurable per school (principals/admins). */
export const PRESCHOOL_AGE_GROUP_NAMES = ['Curious Cubs', 'Little Explorers', 'Panda'] as const;

const CUSTOM_PRESCHOOL_COLORS = [
  '#F97316',
  '#14B8A6',
  '#0EA5E9',
  '#A855F7',
  '#EF4444',
  '#22C55E',
  '#EAB308',
  '#06B6D4',
  '#F43F5E',
  '#10B981',
] as const;

function colorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i);
    hash |= 0; // Keep 32-bit.
  }
  const index = Math.abs(hash) % CUSTOM_PRESCHOOL_COLORS.length;
  return CUSTOM_PRESCHOOL_COLORS[index];
}

export function resolveStudentGroupName(params: {
  className?: string | null;
  ageMonths: number;
  ageGroups: AgeGroup[];
}): string {
  const className = (params.className || '').trim();
  if (className) return className;

  const dobGroup = findAgeGroup(params.ageMonths, params.ageGroups);
  const dobGroupName = (dobGroup?.name || '').trim();
  if (dobGroupName) return dobGroupName;

  return 'Unassigned';
}

export function getAgeGroupColor(
  ageGroupName: string | undefined,
  schoolType: string,
): string {
  if (!ageGroupName) return '#9CA3AF';

  const normalizedName = ageGroupName.trim();
  if (!normalizedName) return '#9CA3AF';

  if (schoolType === 'preschool') {
    switch (normalizedName) {
      case 'Curious Cubs':
        return '#EC4899';
      case 'Little Explorers':
        return '#8B5CF6';
      case 'Panda':
        return '#059669';
      case 'Toddlers':
        return '#EC4899';
      case 'Preschool 3-4':
        return '#8B5CF6';
      case 'Preschool 4-5':
        return '#3B82F6';
      case 'Pre-K (Reception)':
        return '#059669';
      case 'Pre-K':
        return '#8B5CF6';
      case 'Kindergarten':
        return '#3B82F6';
      default:
        return colorFromName(normalizedName);
    }
  }

  if (normalizedName.includes('Grade R') || normalizedName.includes('Grade 1-3'))
    return '#059669';
  if (normalizedName.includes('Grade 4-6')) return '#3B82F6';
  if (normalizedName.includes('Grade 7-9')) return '#8B5CF6';
  if (normalizedName.includes('Grade 10-12')) return '#DC2626';
  return '#6B7280';
}

export function getSchoolTypeDisplay(schoolType: string): string {
  switch (schoolType) {
    case 'preschool':
      return 'Pre-School';
    case 'primary':
      return 'Primary School';
    case 'secondary':
      return 'Secondary School';
    case 'combined':
      return 'Combined School';
    default:
      return 'School';
  }
}

export function filterStudents(
  students: Student[],
  filters: FilterOptions,
): Student[] {
  return students.filter((student) => {
    const groupName = (student.age_group_name || '').trim();
    const resolvedGroupName = groupName || 'Unassigned';

    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      const fullName =
        `${student.first_name} ${student.last_name}`.toLowerCase();
      if (!fullName.includes(searchLower)) return false;
    }

    if (filters.ageGroup) {
      if (resolvedGroupName !== filters.ageGroup) return false;
    }
    if (filters.status && student.status !== filters.status) return false;
    if (filters.classId && student.class_id !== filters.classId) return false;

    return true;
  });
}

export function getAgeGroupStats(
  students: Student[],
  schoolType: string = 'preschool',
  orderedGroupNames: string[] = [],
): Record<string, number> {
  const raw: Record<string, number> = {};
  students.forEach((student) => {
    const group = (student.age_group_name || '').trim() || 'Unassigned';
    raw[group] = (raw[group] || 0) + 1;
  });
  if (Object.keys(raw).length === 0) return {};

  const configuredOrder = [...new Set(
    orderedGroupNames
      .map((name) => String(name || '').trim())
      .filter(Boolean),
  )];

  const stats: Record<string, number> = {};

  configuredOrder.forEach((groupName) => {
    if (raw[groupName] > 0) {
      stats[groupName] = raw[groupName];
    }
  });

  const remaining = Object.keys(raw)
    .filter((groupName) => groupName !== 'Unassigned' && !configuredOrder.includes(groupName))
    .sort((a, b) => {
      if (schoolType === 'preschool') return a.localeCompare(b);
      return a.localeCompare(b);
    });

  remaining.forEach((groupName) => {
    stats[groupName] = raw[groupName];
  });

  if (raw.Unassigned > 0) {
    stats.Unassigned = raw.Unassigned;
  }

  return stats;
}
