import * as faceapi from '@vladmandic/face-api';

let modelsLoaded = false;
let loadingPromise = null;

const MODEL_PATHS = [
  '/models',
  'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/',
];

/**
 * Initializes and loads face-api.js neural network models:
 * - TinyFaceDetector (fast mobile/web real-time face detector)
 * - FaceLandmark68TinyNet (68 facial landmark detector)
 * - FaceRecognitionNet (ResNet-34 128-D deep facial recognition model)
 */
export async function loadFaceApiModels(onProgress = null) {
  if (modelsLoaded) return true;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    let lastError = null;

    for (const modelPath of MODEL_PATHS) {
      try {
        if (onProgress) onProgress(`Loading models from ${modelPath}...`);
        
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(modelPath),
          faceapi.nets.faceLandmark68TinyNet.loadFromUri(modelPath),
          faceapi.nets.faceRecognitionNet.loadFromUri(modelPath),
        ]);

        modelsLoaded = true;
        console.log(`✅ face-api.js models loaded successfully from ${modelPath}`);
        return true;
      } catch (err) {
        console.warn(`Could not load models from ${modelPath}, trying fallback:`, err.message);
        lastError = err;
      }
    }

    loadingPromise = null;
    throw new Error(`Failed to load face-api.js models: ${lastError?.message}`);
  })();

  return loadingPromise;
}

export function isFaceApiReady() {
  return modelsLoaded;
}

/**
 * Detects a single face in an image or video element, with landmarks and 128-D neural descriptor.
 * @param {HTMLVideoElement|HTMLImageElement|HTMLCanvasElement} input
 * @param {number} inputSize - Detection input size (default 320 for speed)
 * @param {number} scoreThreshold - Minimum face detection score (default 0.5)
 */
export async function detectSingleFaceWithDescriptor(input, inputSize = 320, scoreThreshold = 0.5) {
  if (!input) return null;
  if (input instanceof HTMLVideoElement && (input.videoWidth === 0 || input.readyState < 2)) {
    return null;
  }

  if (!modelsLoaded) {
    await loadFaceApiModels();
  }

  const options = new faceapi.TinyFaceDetectorOptions({
    inputSize,
    scoreThreshold,
  });

  const detection = await faceapi
    .detectSingleFace(input, options)
    .withFaceLandmarks(true)
    .withFaceDescriptor();

  if (!detection) return null;

  return {
    detection: detection.detection,
    landmarks: detection.landmarks,
    descriptor: Array.from(detection.descriptor),
    box: {
      x: detection.detection.box.x,
      y: detection.detection.box.y,
      width: detection.detection.box.width,
      height: detection.detection.box.height,
    },
  };
}

/**
 * Detects all faces in an image or video element, with landmarks and 128-D neural descriptors.
 * Supports multiple students in camera frame simultaneously!
 */
export async function detectAllFacesWithDescriptors(input, inputSize = 320, scoreThreshold = 0.5) {
  if (!input) return [];
  if (input instanceof HTMLVideoElement && (input.videoWidth === 0 || input.readyState < 2)) {
    return [];
  }

  if (!modelsLoaded) {
    await loadFaceApiModels();
  }

  const options = new faceapi.TinyFaceDetectorOptions({
    inputSize,
    scoreThreshold,
  });

  const detections = await faceapi
    .detectAllFaces(input, options)
    .withFaceLandmarks(true)
    .withFaceDescriptors();

  return detections.map((det) => ({
    detection: det.detection,
    landmarks: det.landmarks,
    descriptor: Array.from(det.descriptor),
    box: {
      x: det.detection.box.x,
      y: det.detection.box.y,
      width: det.detection.box.width,
      height: det.detection.box.height,
    },
  }));
}

/**
 * Crops a detected face region into a square JPEG data URL thumbnail.
 */
export function extractFaceThumbnail(imageSource, box) {
  const canvas = document.createElement('canvas');
  const size = 160;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const sw = imageSource.videoWidth || imageSource.naturalWidth || imageSource.width || 640;
  const sh = imageSource.videoHeight || imageSource.naturalHeight || imageSource.height || 480;

  let sx, sy, sWidth, sHeight;

  if (box) {
    const padX = box.width * 0.25;
    const padY = box.height * 0.25;
    sx = Math.max(0, box.x - padX);
    sy = Math.max(0, box.y - padY);
    sWidth = Math.min(sw - sx, box.width + 2 * padX);
    sHeight = Math.min(sh - sy, box.height + 2 * padY);
  } else {
    const cropSize = Math.min(sw, sh) * 0.7;
    sx = (sw - cropSize) / 2;
    sy = (sh - cropSize) / 2;
    sWidth = cropSize;
    sHeight = cropSize;
  }

  ctx.drawImage(imageSource, sx, sy, sWidth, sHeight, 0, 0, size, size);
  return canvas.toDataURL('image/jpeg', 0.9);
}

/**
 * Computes Euclidean distance between two 128-D face descriptors using face-api.
 * Euclidean distance:
 *  0.0 - 0.40 : Strong match (same person)
 *  0.40 - 0.55 : Good match
 *  > 0.60      : Different person
 * @param {Array<number>|Float32Array} d1
 * @param {Array<number>|Float32Array} d2
 * @returns {number} Euclidean distance
 */
export function computeFaceDistance(d1, d2) {
  if (!d1 || !d2 || d1.length !== d2.length) return 1.0;
  return faceapi.euclideanDistance(d1, d2);
}

/**
 * Finds best match for a probe descriptor against a list of enrolled student descriptors.
 * @param {Array<number>|Float32Array} probeDescriptor - Detected 128-D face descriptor
 * @param {Array<object>} roster - List of students with `embeddingVector` or `embedding`
 * @param {number} maxDistanceThreshold - Maximum Euclidean distance considered a match (default 0.55)
 */
export function matchDescriptorToRoster(probeDescriptor, roster, maxDistanceThreshold = 0.55) {
  if (!probeDescriptor || !roster || roster.length === 0) {
    return { match: null, confidence: 0, distance: 1.0 };
  }

  let bestMatch = null;
  let lowestDistance = Infinity;

  for (const student of roster) {
    let candidateVector = student.embeddingVector;

    if (!candidateVector && student.embedding) {
      if (typeof student.embedding === 'string') {
        try {
          const binaryString = atob(student.embedding);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          candidateVector = Array.from(new Float32Array(bytes.buffer));
        } catch {}
      } else if (Array.isArray(student.embedding)) {
        candidateVector = student.embedding;
      }
    }

    if (!candidateVector || candidateVector.length !== 128) continue;

    const dist = faceapi.euclideanDistance(probeDescriptor, candidateVector);
    if (dist < lowestDistance) {
      lowestDistance = dist;
      bestMatch = student;
    }
  }

  if (lowestDistance <= maxDistanceThreshold && bestMatch) {
    // Map Euclidean distance [0, 0.60] to confidence percentage [1.0, 0.60]
    const confidence = Math.max(0.60, Math.min(0.99, 1.0 - (lowestDistance / 0.60) * 0.40));
    return {
      match: bestMatch,
      confidence,
      distance: lowestDistance,
    };
  }

  return {
    match: null,
    confidence: lowestDistance < 1.0 ? Math.max(0, 1.0 - lowestDistance) : 0,
    distance: lowestDistance,
  };
}

export { faceapi };
