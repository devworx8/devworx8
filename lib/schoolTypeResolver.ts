import { getOrganizationType } from '@/lib/tenant/compat';

export type ResolvedSchoolType = 'preschool' | 'k12_school';

// Legacy/shared tenant id for EduDash Pro Community School.
const COMMUNITY_SCHOOL_IDS = new Set([
  '00000000-0000-0000-0000-000000000001',
]);

const K12_ALIASES = new Set([
  'k12',
  'k12_school',
  'combined',
  'primary',
  'elementary',
  'high_school',
  'secondary',
  'community_school',
  'community school',
]);

const PRESCHOOL_ALIASES = new Set([
  'preschool',
  'ecd',
  'early_childhood',
  'nursery',
  'daycare',
  'creche',
  'kindergarten',
]);

export function normalizeResolvedSchoolType(value: unknown): ResolvedSchoolType | null {
  if (value === null || value === undefined) return null;
  const normalized = String(value).toLowerCase().trim();
  if (!normalized) return null;

  if (K12_ALIASES.has(normalized)) return 'k12_school';
  if (PRESCHOOL_ALIASES.has(normalized)) return 'preschool';

  if (
    normalized.includes('k12') ||
    normalized.includes('k-12') ||
    normalized.includes('primary') ||
    normalized.includes('secondary') ||
    normalized.includes('community school') ||
    normalized.includes('community_school')
  ) {
    return 'k12_school';
  }

  if (
    normalized.includes('preschool') ||
    normalized.includes('ecd') ||
    normalized.includes('early') ||
    normalized.includes('nursery') ||
    normalized.includes('daycare') ||
    normalized.includes('creche') ||
    normalized.includes('kindergarten')
  ) {
    return 'preschool';
  }

  return null;
}

export function resolveSchoolTypeFromProfile(
  profile: any,
  fallback: ResolvedSchoolType = 'preschool'
): ResolvedSchoolType {
  const organizationId =
    profile?.organization_id ||
    profile?.preschool_id ||
    profile?.organization_membership?.organization_id ||
    null;
  if (organizationId && COMMUNITY_SCHOOL_IDS.has(String(organizationId))) {
    return 'k12_school';
  }

  const candidates = [
    profile?.organization_membership?.school_type,
    profile?.organization_membership?.organization_kind,
    profile?.organization_membership?.organization_name,
    profile?.organization_type,
    profile?.school_type,
    profile?.usage_type,
    profile?.organization_kind,
    profile?.tenant_kind,
    profile?.organization_name,
    profile?.preschool_name,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeResolvedSchoolType(candidate);
    if (normalized) return normalized;
  }

  const compatType = getOrganizationType(profile);
  if (compatType === 'k12_school' || compatType === 'preschool') {
    return compatType;
  }

  return fallback;
}

/**
 * Resolve school type only when explicitly present on profile sources.
 * Unlike resolveSchoolTypeFromProfile(), this does NOT fall back to defaults.
 */
export function resolveExplicitSchoolTypeFromProfile(profile: any): ResolvedSchoolType | null {
  const organizationId =
    profile?.organization_id ||
    profile?.preschool_id ||
    profile?.organization_membership?.organization_id ||
    null;
  if (organizationId && COMMUNITY_SCHOOL_IDS.has(String(organizationId))) {
    return 'k12_school';
  }

  const candidates = [
    profile?.organization_membership?.school_type,
    profile?.organization_membership?.organization_kind,
    profile?.organization_membership?.organization_name,
    profile?.organization_type,
    profile?.school_type,
    profile?.usage_type,
    profile?.organization_kind,
    profile?.tenant_kind,
    profile?.organization_name,
    profile?.preschool_name,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeResolvedSchoolType(candidate);
    if (normalized) return normalized;
  }

  return null;
}

export function isK12ResolvedSchoolType(value: unknown): boolean {
  return normalizeResolvedSchoolType(value) === 'k12_school';
}

export function resolveOrganizationId(profile: any): string | null {
  return (
    profile?.organization_id ||
    profile?.preschool_id ||
    profile?.organizationId ||
    profile?.preschoolId ||
    null
  );
}
