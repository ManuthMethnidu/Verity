/**
 * Computes cosine similarity between two numeric vectors of identical dimension.
 * Cosine similarity = (A . B) / (||A|| * ||B||)
 * @param {Array<number>|Float32Array} a
 * @param {Array<number>|Float32Array} b
 * @returns {number} Value in range [-1.0, 1.0]
 */
export function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length || a.length === 0) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Finds the best matching candidate in a roster above a given threshold.
 * @param {Array<number>|Float32Array} probeEmbedding - 128-D vector of detected face
 * @param {Array<{id: string, name: string, embedding: Array<number>|Float32Array}>} candidates
 * @param {number} threshold - Minimum cosine similarity threshold (default 0.70)
 * @returns {{ match: object|null, confidence: number }}
 */
export function findBestMatch(probeEmbedding, candidates, threshold = 0.70) {
  if (!probeEmbedding || !candidates || candidates.length === 0) {
    return { match: null, confidence: 0 };
  }

  let bestMatch = null;
  let highestScore = -1;

  for (const candidate of candidates) {
    if (!candidate.embedding) continue;

    const score = cosineSimilarity(probeEmbedding, candidate.embedding);
    if (score > highestScore) {
      highestScore = score;
      bestMatch = candidate;
    }
  }

  if (highestScore >= threshold && bestMatch) {
    return {
      match: bestMatch,
      confidence: highestScore,
    };
  }

  return {
    match: null,
    confidence: highestScore > 0 ? highestScore : 0,
  };
}
