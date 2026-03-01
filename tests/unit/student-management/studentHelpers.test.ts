import type { AgeGroup, Student } from '@/hooks/student-management/types';
import {
  findAgeGroup,
  getAgeGroupColor,
  getAgeGroupStats,
  resolveStudentGroupName,
} from '@/hooks/student-management/studentHelpers';

function makeStudent(id: string, ageGroupName?: string): Student {
  return {
    id,
    first_name: 'First',
    last_name: 'Last',
    date_of_birth: null,
    age_months: 0,
    age_years: 0,
    preschool_id: 'school-1',
    class_id: null,
    parent_id: null,
    guardian_id: null,
    is_active: true,
    status: 'active',
    ...(ageGroupName ? { age_group_name: ageGroupName } : {}),
  };
}

function makeAgeGroup(
  name: string,
  minAgeMonths: number | null,
  maxAgeMonths: number | null,
): AgeGroup {
  return {
    id: `${name}-id`,
    name,
    min_age_months: minAgeMonths,
    max_age_months: maxAgeMonths,
    age_min: null,
    age_max: null,
    school_type: 'preschool',
    description: null,
    preschool_id: 'school-1',
  };
}

describe('studentHelpers', () => {
  it('returns dynamic preschool stats without collapsing non-canonical groups to Other', () => {
    const stats = getAgeGroupStats(
      [
        makeStudent('1', 'Pre-K'),
        makeStudent('2', 'Kindergarten'),
        makeStudent('3', 'Owls'),
        makeStudent('4', 'Lions'),
      ],
      'preschool',
    );

    expect(stats['Pre-K']).toBe(1);
    expect(stats.Kindergarten).toBe(1);
    expect(stats.Owls).toBe(1);
    expect(stats.Lions).toBe(1);
    expect(stats.Other).toBeUndefined();
  });

  it('prefers class label over DOB-derived age group', () => {
    const resolved = resolveStudentGroupName({
      className: 'Curious Cubs',
      ageMonths: 40,
      ageGroups: [makeAgeGroup('Pre-K', 36, 47)],
    });

    expect(resolved).toBe('Curious Cubs');
  });

  it('ignores invalid age-group ranges and falls back to Unassigned', () => {
    const ageGroups = [
      makeAgeGroup('Broken', null, null),
      makeAgeGroup('Pre-K', 36, 47),
    ];

    expect(findAgeGroup(40, ageGroups)?.name).toBe('Pre-K');
    expect(findAgeGroup(10, ageGroups)).toBeUndefined();

    const resolved = resolveStudentGroupName({
      className: null,
      ageMonths: 10,
      ageGroups,
    });
    expect(resolved).toBe('Unassigned');
  });

  it('returns stable non-default colors for unknown preschool labels', () => {
    const first = getAgeGroupColor('Owls', 'preschool');
    const second = getAgeGroupColor('Owls', 'preschool');

    expect(first).toBe(second);
    expect(first).not.toBe('#6B7280');
    expect(getAgeGroupColor('Curious Cubs', 'preschool')).toBe('#EC4899');
  });

  it('orders stats by configured group order, then remaining, then Unassigned', () => {
    const stats = getAgeGroupStats(
      [
        makeStudent('1', 'Owls'),
        makeStudent('2', 'Kindergarten'),
        makeStudent('3', 'Pre-K'),
        makeStudent('4'),
      ],
      'preschool',
      ['Pre-K', 'Kindergarten', 'Panda'],
    );

    expect(Object.keys(stats)).toEqual([
      'Pre-K',
      'Kindergarten',
      'Owls',
      'Unassigned',
    ]);
  });
});
