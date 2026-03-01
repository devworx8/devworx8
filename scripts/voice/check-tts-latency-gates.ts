#!/usr/bin/env tsx

import path from 'node:path';
import { evaluateTTSLatencyGates, type TTSLatencySample } from '../../lib/voice/benchmark/ttsLatencyGate';
import { parseArgs, readJson } from './common';

type TTSInputFile = {
  samples?: TTSLatencySample[];
};

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const runId = String(args['run-id'] || '').trim();
  const inputPath = String(
    args.input || (runId ? path.join(process.cwd(), 'artifacts/voice', runId, 'tts_samples.json') : ''),
  ).trim();
  const maxP95Ms = Number(args['max-p95-ms'] || 3000);

  if (!inputPath) {
    throw new Error('Provide --input <tts_samples.json> or --run-id <id>');
  }

  const file = await readJson<TTSInputFile>(inputPath);
  const samples = Array.isArray(file.samples) ? file.samples : [];
  const result = evaluateTTSLatencyGates({ samples, maxP95Ms });

  if (result.passed) {
    console.log(`[voice-benchmark] TTS latency gate PASS (p95 <= ${result.maxP95Ms}ms)`);
    return;
  }

  console.error(`[voice-benchmark] TTS latency gate FAIL (p95 > ${result.maxP95Ms}ms)`);
  result.failures.forEach((line) => console.error(`- ${line}`));
  process.exit(1);
}

main().catch((error) => {
  console.error('[voice-benchmark] check-tts-latency-gates failed:', error);
  process.exit(1);
});

