export type DashLanguageSource = 'explicit_override' | 'auto_detect' | 'preference';
export type DashSupportedLocale = 'en-ZA' | 'af-ZA' | 'zu-ZA' | 'xh-ZA' | 'nso-ZA';

export const DASH_VOICE_GUARANTEED_LOCALES: DashSupportedLocale[] = [
  'en-ZA',
  'af-ZA',
  'zu-ZA',
  'xh-ZA',
  'nso-ZA',
];

export function normalizeDashLocale(value?: string | null): DashSupportedLocale | null {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return null;
  if (raw === 'en' || raw === 'en-za') return 'en-ZA';
  if (raw === 'af' || raw === 'af-za') return 'af-ZA';
  if (raw === 'zu' || raw === 'zu-za') return 'zu-ZA';
  if (raw === 'xh' || raw === 'xh-za') return 'xh-ZA';
  if (raw === 'nso' || raw === 'nso-za' || raw === 'st' || raw === 'sepedi') return 'nso-ZA';
  return null;
}

export function detectLanguageOverrideFromText(text: string): DashSupportedLocale | null {
  const value = String(text || '').toLowerCase();
  if (!value) return null;
  if (/\b(afrikaans|in afrikaans|afrikaans work|antwoord in afrikaans|verduidelik in afrikaans)\b/i.test(value)) {
    return 'af-ZA';
  }
  if (/\b(isizulu|zulu|ngesi zulu|in isi zulu|in isizulu|phendula ngesi zulu)\b/i.test(value)) {
    return 'zu-ZA';
  }
  if (/\b(isixhosa|xhosa|ngesi xhosa|in isi xhosa|in isixhosa)\b/i.test(value)) {
    return 'xh-ZA';
  }
  if (/\b(sepedi|northern sotho|in sepedi|ka sepedi|ka sesotho sa leboa)\b/i.test(value)) {
    return 'nso-ZA';
  }
  if (/\b(in english|respond in english|answer in english)\b/i.test(value)) {
    return 'en-ZA';
  }
  return null;
}

export function detectLanguageFromText(text: string): DashSupportedLocale | null {
  const value = String(text || '').toLowerCase();
  if (!value) return null;

  const afScore =
    (value.match(/\b(afrikaans|asseblief|dankie|baie|goeie|middag|aand|verduidelik|som|antwoord|wiskunde)\b/g) || [])
      .length;
  const zuScore =
    (value.match(/\b(isizulu|sawubona|ngiyabonga|yebo|cha|umfundi|ngiyacela|ngiyazi)\b/g) || []).length;
  const xhScore =
    (value.match(/\b(isixhosa|molo|enkosi|ndicela|ndiyabulela|umfundi|utitshala)\b/g) || []).length;
  const nsoScore =
    (value.match(/\b(sepedi|thobela|ke a leboga|ka kgopelo|morutiši|moithuti)\b/g) || []).length;

  if (afScore >= 2 && afScore > zuScore && afScore > xhScore && afScore > nsoScore) return 'af-ZA';
  if (zuScore >= 2 && zuScore > afScore && zuScore > xhScore && zuScore > nsoScore) return 'zu-ZA';
  if (xhScore >= 2 && xhScore > afScore && xhScore > zuScore && xhScore > nsoScore) return 'xh-ZA';
  if (nsoScore >= 2 && nsoScore > afScore && nsoScore > zuScore && nsoScore > xhScore) return 'nso-ZA';
  return null;
}

export function resolveResponseLocale(input: {
  explicitOverride?: string | null;
  responseText?: string | null;
  fallbackPreference?: string | null;
}): {
  locale: DashSupportedLocale | null;
  source: DashLanguageSource | null;
} {
  const explicit = normalizeDashLocale(input.explicitOverride || null);
  if (explicit) return { locale: explicit, source: 'explicit_override' };

  const autoDetected = detectLanguageFromText(String(input.responseText || ''));
  if (autoDetected) return { locale: autoDetected, source: 'auto_detect' };

  const preference = normalizeDashLocale(input.fallbackPreference || null);
  if (preference) return { locale: preference, source: 'preference' };

  return { locale: null, source: null };
}

export function getDashLanguageLabel(locale: DashSupportedLocale): string {
  if (locale === 'af-ZA') return 'Afrikaans';
  if (locale === 'zu-ZA') return 'isiZulu';
  if (locale === 'xh-ZA') return 'isiXhosa';
  if (locale === 'nso-ZA') return 'Sepedi (Northern Sotho)';
  return 'English (South Africa)';
}

export function buildLanguageDirectiveForTurn(input: {
  locale?: DashSupportedLocale | null;
  source?: DashLanguageSource | null;
}): string | null {
  const locale = input.locale || null;
  const source = input.source || null;
  if (!locale || !source) return null;

  const label = getDashLanguageLabel(locale);
  if (source === 'explicit_override') {
    return `LANGUAGE OVERRIDE (THIS TURN ONLY): Reply entirely in ${label} (${locale}). Keep explanations and examples in that language.`;
  }
  if (source === 'auto_detect') {
    return `LANGUAGE MATCH (AUTO-DETECTED): The learner message appears to be in ${label} (${locale}). Reply in the same language unless the learner asks to switch.`;
  }
  return `LANGUAGE PREFERENCE: Prefer ${label} (${locale}) for this turn unless the learner requests another language.`;
}
