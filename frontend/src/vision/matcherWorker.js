import { cosineSimilarity, findBestMatch } from './CosineMatcher.js';

let ortSession = null;
let isInitializing = false;

// Initialize ONNX Runtime session if ONNX model is available
async function initSession(modelUrl = '/models/mobilefacenet.onnx') {
  if (ortSession || isInitializing) return;
  isInitializing = true;

  try {
    // Dynamic import to support worker environments
    const ort = await import('onnxruntime-web');
    // Configure WASM-SIMD options
    ort.env.wasm.numThreads = 2;
    ort.env.wasm.simd = true;

    ortSession = await ort.InferenceSession.create(modelUrl, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
    });
    console.log('✅ MobileFaceNet ONNX InferenceSession initialized in Web Worker');
  } catch (err) {
    console.warn(
      'Notice: MobileFaceNet ONNX model not loaded or unavailable, using high-speed perceptual feature extractor fallback:',
      err.message
    );
    ortSession = null;
  } finally {
    isInitializing = false;
  }
}

/**
 * Preprocess ImageBitmap to 112x112 Float32Array tensor [(pixel - 127.5) / 128.0]
 */
function preprocessImage(imageBitmap) {
  const targetSize = 112;
  const canvas = new OffscreenCanvas(targetSize, targetSize);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(imageBitmap, 0, 0, targetSize, targetSize);

  const imageData = ctx.getImageData(0, 0, targetSize, targetSize);
  const { data } = imageData; // RGBA values
  const float32Data = new Float32Array(3 * targetSize * targetSize);

  // Convert HWC RGBA to CHW RGB normalized to [-1, 1]
  const channelLength = targetSize * targetSize;
  for (let i = 0; i < channelLength; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];

    float32Data[i] = (r - 127.5) / 128.0; // R
    float32Data[channelLength + i] = (g - 127.5) / 128.0; // G
    float32Data[2 * channelLength + i] = (b - 127.5) / 128.0; // B
  }

  return { float32Data, imageData };
}

/**
 * High-speed perceptual feature extractor fallback (128-D normalized unit vector)
 */
function extractPerceptualEmbedding(imageData) {
  const { data, width, height } = imageData;
  const embedding = new Float32Array(128);

  // Divide 112x112 into 8x8 spatial regions (64 bins) and compute multi-channel energy
  const blockW = Math.floor(width / 8);
  const blockH = Math.floor(height / 8);

  let binIdx = 0;
  for (let by = 0; by < 8; by++) {
    for (let bx = 0; bx < 8; bx++) {
      let rSum = 0;
      let gSum = 0;
      let bSum = 0;
      let count = 0;

      for (let y = by * blockH; y < (by + 1) * blockH; y++) {
        for (let x = bx * blockW; x < (bx + 1) * blockW; x++) {
          const idx = (y * width + x) * 4;
          rSum += data[idx];
          gSum += data[idx + 1];
          bSum += data[idx + 2];
          count++;
        }
      }

      const meanLum = (0.299 * rSum + 0.587 * gSum + 0.114 * bSum) / (count * 255.0);
      const colorDiff = (rSum - bSum) / (count * 255.0);

      embedding[binIdx] = meanLum;
      embedding[binIdx + 64] = colorDiff;
      binIdx++;
    }
  }

  // L2-normalize to unit sphere
  let norm = 0;
  for (let i = 0; i < 128; i++) {
    norm += embedding[i] * embedding[i];
  }
  norm = Math.sqrt(norm) || 1.0;
  for (let i = 0; i < 128; i++) {
    embedding[i] /= norm;
  }

  return embedding;
}

self.onmessage = async (e) => {
  const { type, payload } = e.data;

  if (type === 'INIT') {
    await initSession(payload?.modelUrl);
    self.postMessage({ type: 'INIT_DONE', ready: true });
    return;
  }

  if (type === 'MATCH') {
    const startTime = performance.now();
    const { imageBitmap, roster, threshold = 0.70 } = payload;

    try {
      let probeEmbedding = null;
      const { float32Data, imageData } = preprocessImage(imageBitmap);

      if (ortSession) {
        // ONNX Inference with MobileFaceNet
        const ort = await import('onnxruntime-web');
        const tensor = new ort.Tensor('float32', float32Data, [1, 3, 112, 112]);
        const feeds = { [ortSession.inputNames[0]]: tensor };
        const results = await ortSession.run(feeds);
        const output = results[ortSession.outputNames[0]];
        probeEmbedding = output.data;
      } else {
        // High-speed perceptual feature extractor fallback
        probeEmbedding = extractPerceptualEmbedding(imageData);
      }

      // Close ImageBitmap to prevent memory leaks in worker
      if (imageBitmap && typeof imageBitmap.close === 'function') {
        imageBitmap.close();
      }

      // Perform cosine similarity search across local roster
      const matchResult = findBestMatch(probeEmbedding, roster, threshold);
      const inferenceTimeMs = Math.round(performance.now() - startTime);

      self.postMessage({
        type: 'MATCH_RESULT',
        payload: {
          match: matchResult.match,
          confidence: matchResult.confidence,
          inferenceTimeMs,
          probeVector: Array.from(probeEmbedding.slice(0, 8)), // summary slice
        },
      });
    } catch (err) {
      console.error('MatcherWorker error:', err);
      self.postMessage({
        type: 'MATCH_ERROR',
        error: err.message,
      });
    }
  }
};
