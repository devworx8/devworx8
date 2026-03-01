type ExamGenerationDraft = {
  customPrompt?: string;
  createdAt: number;
};

const MAX_DRAFTS = 24;
const draftStore = new Map<string, ExamGenerationDraft>();

function trimStore(): void {
  if (draftStore.size <= MAX_DRAFTS) return;
  const oldest = [...draftStore.entries()].sort((a, b) => a[1].createdAt - b[1].createdAt);
  while (oldest.length > 0 && draftStore.size > MAX_DRAFTS) {
    const next = oldest.shift();
    if (!next) break;
    draftStore.delete(next[0]);
  }
}

export function stashExamGenerationDraft(draft: Omit<ExamGenerationDraft, 'createdAt'>): string {
  const id = `exam_draft_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  draftStore.set(id, {
    ...draft,
    createdAt: Date.now(),
  });
  trimStore();
  return id;
}

export function consumeExamGenerationDraft(id?: string): ExamGenerationDraft | null {
  if (!id) return null;
  const draft = draftStore.get(id) || null;
  if (draft) {
    draftStore.delete(id);
  }
  return draft;
}
