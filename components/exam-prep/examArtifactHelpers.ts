import type { ParsedExam } from '@/lib/examParser';
import type {
  ExamArtifact,
  ExamArtifactType,
  FlashcardItem,
  FlashcardsArtifact,
  RevisionNotesArtifact,
  RevisionNotesSection,
  StudyGuideArtifact,
} from '@/components/exam-prep/types';

type ParsedGenerationPayload = {
  artifactType: ExamArtifactType;
  exam: ParsedExam | null;
  artifact: ExamArtifact | null;
};

type QuestionSummary = {
  id: string;
  question: string;
  answer: string;
  explanation: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function toTrimmedString(value: unknown, fallback = ''): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
}

function parseFlashcardsArtifact(value: unknown): FlashcardsArtifact | null {
  if (!isRecord(value)) return null;
  const title = toTrimmedString(value.title, 'Flashcards');
  const cards = Array.isArray(value.cards)
    ? value.cards
        .map((item, index): FlashcardItem | null => {
          if (!isRecord(item)) return null;
          const front = toTrimmedString(item.front);
          const back = toTrimmedString(item.back);
          if (!front || !back) return null;
          const hint = toTrimmedString(item.hint);
          return {
            id: toTrimmedString(item.id, `card_${index + 1}`),
            front,
            back,
            hint: hint || undefined,
          };
        })
        .filter((item): item is FlashcardItem => item !== null)
    : [];

  return { title, cards };
}

function parseRevisionNotesArtifact(value: unknown): RevisionNotesArtifact | null {
  if (!isRecord(value)) return null;
  const title = toTrimmedString(value.title, 'Revision Notes');
  const keyPoints = toStringArray(value.keyPoints);
  const sections = Array.isArray(value.sections)
    ? value.sections
        .map((item, index): RevisionNotesSection | null => {
          if (!isRecord(item)) return null;
          const bullets = toStringArray(item.bullets);
          return {
            title: toTrimmedString(item.title, `Topic ${index + 1}`),
            bullets: bullets.length > 0 ? bullets : ['Review this topic from class notes.'],
          };
        })
        .filter((item): item is RevisionNotesSection => item !== null)
    : [];

  return { title, keyPoints, sections };
}

function parseStudyGuideArtifact(value: unknown): StudyGuideArtifact | null {
  if (!isRecord(value)) return null;
  const title = toTrimmedString(value.title, 'Study Guide');
  const days = Array.isArray(value.days)
    ? value.days
        .map((item, index): StudyGuideArtifact['days'][number] | null => {
          if (!isRecord(item)) return null;
          const focus = toTrimmedString(item.focus);
          if (!focus) return null;
          return {
            day: toTrimmedString(item.day, `Day ${index + 1}`),
            focus,
            tasks: toStringArray(item.tasks),
          };
        })
        .filter((item): item is StudyGuideArtifact['days'][number] => item !== null)
    : [];

  return {
    title,
    days,
    checklist: toStringArray(value.checklist),
  };
}

export function isExamArtifactType(value: unknown): value is ExamArtifactType {
  return (
    value === 'practice_test' ||
    value === 'flashcards' ||
    value === 'revision_notes' ||
    value === 'study_guide'
  );
}

export function coerceExamArtifactType(
  value: unknown,
  fallback: ExamArtifactType = 'practice_test',
): ExamArtifactType {
  return isExamArtifactType(value) ? value : fallback;
}

function flattenQuestions(exam: ParsedExam): QuestionSummary[] {
  return (exam.sections || []).flatMap((section, sectionIndex) => {
    const sectionTitle = section.title || `Section ${sectionIndex + 1}`;
    return (section.questions || []).map((question, questionIndex) => {
      const id = question.id || `q_${sectionIndex + 1}_${questionIndex + 1}`;
      const questionText = String(question.question || '').trim();
      const answer = String(question.correctAnswer || '').trim();
      const explanation = String(question.explanation || '').trim();

      return {
        id,
        question: questionText || `${sectionTitle} concept ${questionIndex + 1}`,
        answer,
        explanation,
      };
    });
  });
}

export function buildFlashcardsArtifact(exam: ParsedExam): FlashcardsArtifact {
  const cards: FlashcardItem[] = flattenQuestions(exam)
    .slice(0, 36)
    .map((item, index) => ({
      id: item.id || `card_${index + 1}`,
      front: item.question,
      back: item.answer || item.explanation || 'Review this concept with your teacher notes.',
      hint: item.explanation || undefined,
    }));

  return {
    title: `${exam.subject || 'Subject'} Flashcards`,
    cards,
  };
}

export function buildRevisionNotesArtifact(exam: ParsedExam): RevisionNotesArtifact {
  const sections: RevisionNotesSection[] = (exam.sections || []).map((section, index) => {
    const bullets = (section.questions || [])
      .slice(0, 6)
      .map((question) => String(question.explanation || question.correctAnswer || question.question || '').trim())
      .filter(Boolean);

    return {
      title: section.title || `Topic ${index + 1}`,
      bullets: bullets.length > 0 ? bullets : ['Review this topic from class notes and homework examples.'],
    };
  });

  const keyPoints = flattenQuestions(exam)
    .slice(0, 8)
    .map((item) => item.answer || item.explanation || item.question)
    .filter(Boolean);

  return {
    title: `${exam.subject || 'Subject'} Revision Notes`,
    keyPoints,
    sections,
  };
}

export function buildStudyGuideArtifact(exam: ParsedExam): StudyGuideArtifact {
  const questions = flattenQuestions(exam);
  const dayBuckets = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5'];
  const perDay = Math.max(1, Math.ceil(Math.max(questions.length, 5) / dayBuckets.length));

  const days = dayBuckets.map((day, index) => {
    const slice = questions.slice(index * perDay, index * perDay + perDay);
    const tasks = slice
      .slice(0, 4)
      .map((item) => `Practice: ${item.question}`)
      .concat(slice.slice(0, 2).map((item) => `Check memo: ${item.answer || item.explanation || 'Write your own summary.'}`))
      .filter(Boolean);

    return {
      day,
      focus: (exam.sections || [])[index]?.title || `${exam.subject || 'Subject'} reinforcement`,
      tasks: tasks.length > 0 ? tasks : ['Revise your class notes and complete one timed question set.'],
    };
  });

  return {
    title: `${exam.subject || 'Subject'} Study Guide`,
    days,
    checklist: [
      'Revise difficult topics first',
      'Practice at least one timed section daily',
      'Review mistakes using memo explanations',
      'Do a final mixed-topic paper before test day',
    ],
  };
}

export function buildArtifactFromExam(
  artifactType: Exclude<ExamArtifactType, 'practice_test'>,
  exam: ParsedExam,
): ExamArtifact {
  if (artifactType === 'flashcards') {
    return {
      type: 'flashcards',
      flashcards: buildFlashcardsArtifact(exam),
    };
  }

  if (artifactType === 'revision_notes') {
    return {
      type: 'revision_notes',
      revisionNotes: buildRevisionNotesArtifact(exam),
    };
  }

  return {
    type: 'study_guide',
    studyGuide: buildStudyGuideArtifact(exam),
  };
}

function parseArtifactFromRecord(
  record: Record<string, unknown>,
  expectedType: ExamArtifactType,
): ExamArtifact | null {
  const declaredType = isExamArtifactType(record.type) ? record.type : expectedType;

  if (declaredType === 'flashcards') {
    const parsed = parseFlashcardsArtifact(record.flashcards ?? record);
    return parsed ? { type: 'flashcards', flashcards: parsed } : null;
  }

  if (declaredType === 'revision_notes') {
    const parsed = parseRevisionNotesArtifact(record.revisionNotes ?? record);
    return parsed ? { type: 'revision_notes', revisionNotes: parsed } : null;
  }

  if (declaredType === 'study_guide') {
    const parsed = parseStudyGuideArtifact(record.studyGuide ?? record);
    return parsed ? { type: 'study_guide', studyGuide: parsed } : null;
  }

  return null;
}

export function parseExamGenerationPayload(
  payload: unknown,
  parseExamPayload: (value: unknown) => ParsedExam | null,
  fallbackType: ExamArtifactType = 'practice_test',
): ParsedGenerationPayload {
  let parsedRaw: unknown = payload;

  if (typeof payload === 'string') {
    const trimmed = payload.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        parsedRaw = JSON.parse(trimmed);
      } catch {
        parsedRaw = payload;
      }
    }
  }

  if (isRecord(parsedRaw)) {
    const artifactType = coerceExamArtifactType(parsedRaw.artifactType, fallbackType);
    const fromArtifact = isRecord(parsedRaw.artifact)
      ? parseArtifactFromRecord(parsedRaw.artifact as Record<string, unknown>, artifactType)
      : null;

    const examCandidate =
      parsedRaw.exam ??
      parsedRaw.generated_exam ??
      (parsedRaw.sections ? parsedRaw : null);

    const exam = examCandidate ? parseExamPayload(examCandidate) : null;

    if (artifactType === 'practice_test') {
      return { artifactType, exam, artifact: null };
    }

    if (fromArtifact) {
      return { artifactType, exam, artifact: fromArtifact };
    }

    if (exam) {
      return {
        artifactType,
        exam,
        artifact: buildArtifactFromExam(artifactType, exam),
      };
    }
  }

  const exam = parseExamPayload(payload);
  if (!exam) {
    return {
      artifactType: fallbackType,
      exam: null,
      artifact: null,
    };
  }

  if (fallbackType === 'practice_test') {
    return { artifactType: 'practice_test', exam, artifact: null };
  }

  return {
    artifactType: fallbackType,
    exam,
    artifact: buildArtifactFromExam(fallbackType, exam),
  };
}
