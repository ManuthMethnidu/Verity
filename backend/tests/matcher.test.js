import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { cosineSimilarity, findBestMatch } from '../src/utils/CosineMatcher.js';

describe('Cosine Similarity & Face Matcher Suite', () => {
  test('Identical vectors should yield a similarity of 1.0', () => {
    const v1 = [0.5, 0.5, 0.5, 0.5];
    const v2 = [0.5, 0.5, 0.5, 0.5];
    const sim = cosineSimilarity(v1, v2);
    assert.ok(Math.abs(sim - 1.0) < 1e-6, `Expected ~1.0, got ${sim}`);
  });

  test('Orthogonal vectors should yield a similarity of 0.0', () => {
    const v1 = [1, 0, 0, 0];
    const v2 = [0, 1, 0, 0];
    const sim = cosineSimilarity(v1, v2);
    assert.strictEqual(sim, 0);
  });

  test('Opposite vectors should yield a similarity of -1.0', () => {
    const v1 = [1, 2, 3];
    const v2 = [-1, -2, -3];
    const sim = cosineSimilarity(v1, v2);
    assert.ok(Math.abs(sim - (-1.0)) < 1e-6);
  });

  test('Handles zero vector or empty inputs safely', () => {
    assert.strictEqual(cosineSimilarity([], []), 0);
    assert.strictEqual(cosineSimilarity([0, 0], [1, 2]), 0);
    assert.strictEqual(cosineSimilarity(null, [1, 2]), 0);
  });

  test('findBestMatch returns correct student when above threshold (0.70)', () => {
    const probe = [0.9, 0.1, 0.0, 0.2];
    const candidates = [
      { id: '1', name: 'Sophia Chen', embedding: [0.88, 0.12, 0.01, 0.19] },
      { id: '2', name: 'Alex Johnson', embedding: [0.05, 0.95, 0.1, 0.0] },
      { id: '3', name: 'Marcus Williams', embedding: [-0.8, -0.2, 0.1, 0.0] },
    ];

    const result = findBestMatch(probe, candidates, 0.70);
    assert.ok(result.match !== null);
    assert.strictEqual(result.match.name, 'Sophia Chen');
    assert.ok(result.confidence > 0.95);
  });

  test('findBestMatch returns null when below threshold', () => {
    const probe = [0.1, 0.1, 0.9, 0.1];
    const candidates = [
      { id: '1', name: 'Sophia Chen', embedding: [0.9, 0.1, 0.0, 0.0] },
      { id: '2', name: 'Alex Johnson', embedding: [0.0, 0.9, 0.1, 0.0] },
    ];

    const result = findBestMatch(probe, candidates, 0.70);
    assert.strictEqual(result.match, null);
    assert.ok(result.confidence < 0.70);
  });
});
