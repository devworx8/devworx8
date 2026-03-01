import {
  buildArtifactFromExam,
  coerceExamArtifactType,
  parseExamGenerationPayload,
} from '@/components/exam-prep/examArtifactHelpers';
import type { ParsedExam } from '@/lib/examParser';

const SAMPLE_EXAM: ParsedExam = {
  title: 'Mathematics Practice',
  grade: 'grade_6',
  subject: 'Mathematics',
  totalMarks: 20,
  sections: [
    {
      id: 'section_1',
      title: 'Section A',
      totalMarks: 10,
      questions: [
        {
          id: 'q1',
          type: 'multiple_choice',
          question: 'What is 2 + 2?',
          marks: 2,
          options: ['2', '3', '4', '5'],
          correctAnswer: '4',
          explanation: 'Adding two and two gives four.',
        },
        {
          id: 'q2',
          type: 'short_answer',
          question: 'Name one fraction equal to 1/2.',
          marks: 2,
          correctAnswer: '2/4',
          explanation: 'Equivalent fractions represent the same value.',
        },
      ],
    },
  ],
};

describe('examArtifactHelpers', () => {
  it('coerces unknown artifact types safely', () => {
    expect(coerceExamArtifactType('flashcards')).toBe('flashcards');
    expect(coerceExamArtifactType('worksheet')).toBe('practice_test');
  });

  it('builds flashcards from a parsed exam', () => {
    const artifact = buildArtifactFromExam('flashcards', SAMPLE_EXAM);
    expect(artifact.type).toBe('flashcards');
    if (artifact.type !== 'flashcards') {
      throw new Error('Expected flashcards artifact');
    }
    expect(artifact.flashcards.cards.length).toBeGreaterThan(0);
    expect(artifact.flashcards.cards[0].front).toContain('2 + 2');
  });

  it('parses wrapped generation payload for non-practice types', () => {
    const payload = {
      artifactType: 'revision_notes',
      artifact: {
        type: 'revision_notes',
        revisionNotes: {
          title: 'Math Notes',
          keyPoints: ['Fractions'],
          sections: [{ title: 'Numbers', bullets: ['Equivalent fractions'] }],
        },
      },
      exam: SAMPLE_EXAM,
    };

    const parsed = parseExamGenerationPayload(payload, () => SAMPLE_EXAM, 'practice_test');
    expect(parsed.artifactType).toBe('revision_notes');
    expect(parsed.artifact?.type).toBe('revision_notes');
    expect(parsed.exam?.subject).toBe('Mathematics');
  });

  it('derives non-practice artifacts from exam fallback payloads', () => {
    const parsed = parseExamGenerationPayload(
      SAMPLE_EXAM,
      () => SAMPLE_EXAM,
      'study_guide',
    );
    expect(parsed.artifactType).toBe('study_guide');
    expect(parsed.artifact?.type).toBe('study_guide');
    if (!parsed.artifact || parsed.artifact.type !== 'study_guide') {
      throw new Error('Expected study guide artifact');
    }
    expect(parsed.artifact.studyGuide.days.length).toBeGreaterThan(0);
  });
});
