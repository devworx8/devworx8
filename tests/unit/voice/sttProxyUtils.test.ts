import {
  formatSttProxyResponse,
  normalizeSttProxyRequest,
} from '@/supabase/functions/stt-proxy/sttProxyUtils';

describe('sttProxyUtils', () => {
  it('normalizes storage_path requests and keeps auto language', () => {
    const normalized = normalizeSttProxyRequest({
      storage_path: 'abc-user/voice.m4a',
      language: 'auto',
      auto_detect: true,
      candidate_languages: ['zu-ZA', 'en-ZA', 'zu-ZA'],
    });

    expect(normalized.source).toBe('storage_path');
    expect(normalized.storagePath).toBe('abc-user/voice.m4a');
    expect(normalized.language).toBe('auto');
    expect(normalized.prompt).toContain('zu');
    expect(normalized.prompt).toContain('en');
  });

  it('normalizes base64 requests and picks explicit language', () => {
    const normalized = normalizeSttProxyRequest({
      audio_base64: 'Zm9v',
      language: 'af-ZA',
      auto_detect: false,
    });

    expect(normalized.source).toBe('audio_base64');
    expect(normalized.audioBase64).toBe('Zm9v');
    expect(normalized.language).toBe('af');
  });

  it('throws when no supported audio input is provided', () => {
    expect(() => normalizeSttProxyRequest({})).toThrow(
      'Provide one of storage_path, audio_base64, or audio_url',
    );
  });

  it('returns compatibility response keys', () => {
    const response = formatSttProxyResponse({
      text: 'Sawubona class',
      language: 'zu',
      provider: 'whisper-1',
      source: 'storage_path',
    });

    expect(response.text).toBe('Sawubona class');
    expect(response.transcript).toBe('Sawubona class');
    expect(response.language).toBe('zu');
    expect(response.provider).toBe('whisper-1');
    expect(response.source).toBe('storage_path');
  });
});

