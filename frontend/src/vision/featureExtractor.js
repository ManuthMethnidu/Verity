/**
 * High-performance 128-D Face Feature & Embedding Extractor.
 * Preprocesses video/image inputs, resizes to 112x112, extracts multi-region
 * spatial luminance & color moments, and L2-normalizes to a unit hypersphere vector.
 */

/**
 * Preprocesses an image source (HTMLVideoElement, HTMLImageElement, or ImageBitmap)
 * into a 112x112 canvas and returns the ImageData.
 */
export function cropFaceImageData(imageSource, cropRect = null) {
  const targetSize = 112;
  const canvas = document.createElement('canvas');
  canvas.width = targetSize;
  canvas.height = targetSize;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  if (cropRect) {
    ctx.drawImage(
      imageSource,
      cropRect.x,
      cropRect.y,
      cropRect.width,
      cropRect.height,
      0,
      0,
      targetSize,
      targetSize
    );
  } else {
    // Center crop
    const sw = imageSource.videoWidth || imageSource.width || 640;
    const sh = imageSource.videoHeight || imageSource.height || 480;
    const size = Math.min(sw, sh) * 0.7;
    const sx = (sw - size) / 2;
    const sy = (sh - size) / 2;
    ctx.drawImage(imageSource, sx, sy, size, size, 0, 0, targetSize, targetSize);
  }

  const imageData = ctx.getImageData(0, 0, targetSize, targetSize);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

  return { imageData, dataUrl };
}

/**
 * Extracts a deterministic, normalized 128-D perceptual feature vector
 * from 112x112 ImageData.
 * @param {ImageData} imageData
 * @returns {Float32Array} 128-D unit vector (L2 norm = 1.0)
 */
export function extractEmbeddingFromImageData(imageData) {
  const { data, width, height } = imageData;
  const embedding = new Float32Array(128);

  // Divide into 8x8 spatial grid (64 bins) and compute multi-channel energy
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

  // L2 normalization to unit sphere
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

/**
 * Captures face from video element and extracts both thumbnail and 128-D embedding.
 */
export function captureFaceFromVideo(videoElement, cropRect = null) {
  const { imageData, dataUrl } = cropFaceImageData(videoElement, cropRect);
  const embedding = extractEmbeddingFromImageData(imageData);
  return {
    thumbnailUrl: dataUrl,
    embeddingVector: Array.from(embedding),
  };
}
