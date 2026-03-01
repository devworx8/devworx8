import { gradeAnswer, type ExamQuestion } from '@/lib/examParser';

describe('examParser gradeAnswer', () => {
  it('accepts equivalent LaTeX fractions for fill in the blank answers', () => {
    const question: ExamQuestion = {
      id: 'q1',
      type: 'fill_in_blank',
      question: 'Convert to simplest form: 2/4 = ____',
      marks: 2,
      correctAnswer: '\\frac{1}{2}',
    };

    const result = gradeAnswer(question, '1/2');

    expect(result.isCorrect).toBe(true);
    expect(result.marks).toBe(2);
  });

  it('accepts equivalent LaTeX square-root notation', () => {
    const question: ExamQuestion = {
      id: 'q2',
      type: 'fill_blank',
      question: 'Complete: $\\sqrt{16}$ = ____',
      marks: 1,
      correctAnswer: '\\sqrt{16}',
    };

    const result = gradeAnswer(question, 'sqrt(16)');

    expect(result.isCorrect).toBe(true);
    expect(result.marks).toBe(1);
  });
});
