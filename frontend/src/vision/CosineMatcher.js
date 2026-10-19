/**
 * Computes cosine similarity between two numeric vectors of equal length.
 * Range: [-1.0, 1.0]
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
 * Finds the candidate student with the highest cosine similarity above the threshold.
 * @param {Float32Array|Array<number>} probeEmbedding - Extracted 128-D vector
 * @param {Array<object>} roster - List of student records with embeddings
 * @param {number} threshold - Minimum acceptable confidence (default 0.70)
 */
export function findBestMatch(probeEmbedding, roster, threshold = 0.70) {
  if (!probeEmbedding || !roster || roster.length === 0) {
    return { match: null, confidence: 0 };
  }

  let bestMatch = null;
  let highestScore = -1;

  for (const student of roster) {
    let candidateVector = student.embeddingVector;

    // Convert from base64 string if necessary
    if (!candidateVector && student.embedding) {
      if (typeof student.embedding === 'string') {
        const binaryString = atob(student.embedding);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        candidateVector = new Float32Array(bytes.buffer);
      } else if (Array.isArray(student.embedding)) {
        candidateVector = new Float32Array(student.embedding);
      }
    }

    if (!candidateVector || candidateVector.length === 0) continue;

    const sim = cosineSimilarity(probeEmbedding, candidateVector);
    if (sim > highestScore) {
      highestScore = sim;
      bestMatch = student;
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
