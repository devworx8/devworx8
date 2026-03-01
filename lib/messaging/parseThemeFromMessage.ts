/**
 * Parse a teacher's message into a weekly theme suggestion: title + objectives.
 * Used when principal taps "Add to weekly program" on a message.
 *
 * Heuristics:
 * - Title: "theme will be X", "weekly theme: X", "Theme: X", "weekly Theme will be X"
 * - Objectives: lines like "1: phrase", "2: phrase", "1. phrase", or bullet lists
 */

export interface ParsedThemeFromMessage {
  title: string | null;
  objectives: string[];
  rawTitle?: string;
}

const TITLE_PATTERNS = [
  /(?:my\s+)?weekly\s+theme\s+will\s+be\s*[:\s]+([^.!\n]+)/i,
  /weekly\s+theme\s*[:\s]+([^.!\n]+)/i,
  /theme\s+will\s+be\s*[:\s]+([^.!\n]+)/i,
  /theme\s*[:\s]+([^.!\n]+)/i,
  /(?:this\s+week(?:'s)?\s+)?theme\s+is\s*[:\s]+([^.!\n]+)/i,
];

const NUMBERED_LINE = /^\s*(?:\d+[.)]\s*|[-*•]\s*)(.+)$/;

function extractTitle(text: string): string | null {
  const normalized = text.replace(/\r\n/g, '\n').trim();
  for (const re of TITLE_PATTERNS) {
    const m = normalized.match(re);
    if (m && m[1]) {
      const t = m[1].trim();
      if (t.length > 0 && t.length < 200) return t;
    }
  }
  return null;
}

function extractObjectives(text: string): string[] {
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);
  const objectives: string[] = [];
  for (const line of lines) {
    const m = line.match(NUMBERED_LINE);
    if (m && m[1]) {
      const obj = m[1].trim();
      if (obj.length > 0 && obj.length < 500) objectives.push(obj);
    }
  }
  return objectives;
}

/**
 * Parse message body into theme title and list of objectives.
 */
export function parseThemeFromMessage(messageText: string): ParsedThemeFromMessage {
  if (!messageText || typeof messageText !== 'string') {
    return { title: null, objectives: [] };
  }
  const title = extractTitle(messageText);
  const objectives = extractObjectives(messageText);
  return {
    title,
    objectives,
    rawTitle: title ?? undefined,
  };
}
