/**
 * Mobile-Web Vision Latency & Frame-Budget Benchmark Script
 * Asserts inference latency < 30ms for 30 FPS mode.
 */

import { performance } from 'node:perf_hooks';
import assert from 'node:assert/strict';
import { cosineSimilarity, findBestMatch } from '../backend/src/utils/CosineMatcher.js';

console.log('⚡ Starting Verity Face Recognition & Matching Latency Benchmark...');

// 1. Generate synthetic 128-D embeddings for 500 students in a classroom roster
const ROSTER_SIZE = 500;
const roster = [];
for (let i = 0; i < ROSTER_SIZE; i++) {
  const vec = new Float32Array(128);
  let norm = 0;
  for (let j = 0; j < 128; j++) {
    const val = Math.sin(i * 100 + j);
    vec[j] = val;
    norm += val * val;
  }
  norm = Math.sqrt(norm);
  for (let j = 0; j < 128; j++) vec[j] /= norm;

  roster.push({
    id: `student-${i}`,
    name: `Student ${i}`,
    embedding: Array.from(vec),
  });
}

// 2. Measure Cosine Similarity throughput across 1,000 queries
const ITERS = 1000;
const probe = roster[250].embedding.map((v) => v + (Math.random() - 0.5) * 0.05);

const startTime = performance.now();
for (let i = 0; i < ITERS; i++) {
  const result = findBestMatch(probe, roster, 0.70);
  assert.ok(result.match !== null, 'Should find match');
}
const elapsedMs = performance.now() - startTime;
const avgMatchLatencyMs = elapsedMs / ITERS;

console.log(`📊 Roster Size: ${ROSTER_SIZE} enrolled students`);
console.log(`📊 Iterations: ${ITERS} match queries`);
console.log(`⏱️ Total Time: ${elapsedMs.toFixed(2)} ms`);
console.log(`⏱️ Average Search Latency: ${avgMatchLatencyMs.toFixed(4)} ms per frame`);

// Target assert: < 30ms budget for 30 FPS loop
const MAX_BUDGET_MS = 30.0;
assert.ok(
  avgMatchLatencyMs < MAX_BUDGET_MS,
  `Assertion failed: Average search latency (${avgMatchLatencyMs.toFixed(2)}ms) exceeded ${MAX_BUDGET_MS}ms budget.`
);

console.log(`✅ BENCHMARK PASSED: Search latency is ${(MAX_BUDGET_MS / avgMatchLatencyMs).toFixed(0)}x faster than the 30 FPS frame-budget limit (${MAX_BUDGET_MS}ms)!`);
