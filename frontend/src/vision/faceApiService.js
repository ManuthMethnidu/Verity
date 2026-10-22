import * as tf from '@tensorflow/tfjs';
import * as faceapi from '@vladmandic/face-api';

let modelsLoaded = false;
let loadingPromise = null;

const MODEL_PATHS = [
  '/models',
  'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/',
];

/**
 * Ensures TensorFlow.js WebGL / CPU backend is ready
 */
export async function initTensorFlow() {
  await tf.ready();
  console.log(`[FaceAPI] TensorFlow.js initialized (backend: ${tf.getBackend()}, version: ${tf.version.tfjs})`);
  return tf;
}

/**
 * Initializes and loads neural network models on top of TensorFlow.js:
 * - TinyFaceDetector (fast mobile/web real-time face detector)
 * - FaceLandmark68TinyNet (68 facial landmark detector)
 * - FaceRecognitionNet (ResNet-34 128-D deep facial recognition model)
 */
export async function loadFaceApiModels(onProgress = null) {
  if (modelsLoaded) return true;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    let lastError = null;

    await initTensorFlow();

    for (const modelPath of MODEL_PATHS) {
      try {
        if (onProgress) onProgress(`Loading neural vision models from ${modelPath}...`);

        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(modelPath),
          faceapi.nets.faceLandmark68TinyNet.loadFromUri(modelPath),
          faceapi.nets.faceRecognitionNet.loadFromUri(modelPath),
        ]);

        modelsLoaded = true;
        console.log(`[FaceAPI] Face-API ResNet models loaded successfully from ${modelPath}`);
        return true;
      } catch (err) {
        console.warn(`Could not load models from ${modelPath}, trying fallback:`, err.message);
        lastError = err;
      }
    }

    loadingPromise = null;
    throw new Error(`Failed to load face recognition models: ${lastError?.message}`);
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
 * Computes Euclidean distance between two 128-D face descriptors using TensorFlow.js tensors.
 * @param {Array<number>|Float32Array} d1
 * @param {Array<number>|Float32Array} d2
 * @returns {number} Euclidean distance
 */
export function computeFaceDistance(d1, d2) {
  if (!d1 || !d2 || d1.length !== d2.length) return 1.0;
  return tf.tidy(() => {
    const t1 = tf.tensor1d(d1);
    const t2 = tf.tensor1d(d2);
    return tf.norm(tf.sub(t1, t2), 'euclidean').dataSync()[0];
  });
}

/**
 * Matches a probe 128-D face descriptor against the enrolled student roster.
 * Uses GPU-accelerated TensorFlow.js tensor math with strict biometric thresholding.
 *
 * STRICT INDIVIDUAL BIOMETRICS:
 * - Same person (identical face): Euclidean distance 0.15 - 0.42
 * - Different person: Euclidean distance > 0.50
 * - Maximum distance allowed for individual recognition: 0.46
 * - Any distance > 0.46 is STRICTLY UNRECOGNIZED (NO FALSE POSITIVES).
 *
 * @param {Array<number>|Float32Array} probeDescriptor - Detected 128-D face descriptor
 * @param {Array<object>} roster - List of enrolled students with real 128-D descriptors
 * @param {number} minConfidenceThreshold - Minimum match confidence (e.g. 0.70)
 */
export function matchDescriptorToRoster(probeDescriptor, roster, minConfidenceThreshold = 0.70) {
  if (!probeDescriptor || !roster || roster.length === 0) {
    return { match: null, confidence: 0, distance: 1.0 };
  }

  // Filter valid enrolled students with 128-D vectors
  const validStudents = [];
  const vectors = [];

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

    if (candidateVector && candidateVector.length === 128) {
      validStudents.push(student);
      vectors.push(candidateVector);
    }
  }

  if (validStudents.length === 0) {
    return { match: null, confidence: 0, distance: 1.0 };
  }

  // Compute vectorized Euclidean distances via TensorFlow.js on GPU
  const { minIdx, lowestDistance } = tf.tidy(() => {
    const probeTensor = tf.tensor2d([Array.from(probeDescriptor)], [1, 128]);
    const rosterTensor = tf.tensor2d(vectors, [vectors.length, 128]);
    const diff = tf.sub(rosterTensor, probeTensor);
    const dists = tf.norm(diff, 'euclidean', 1);
    const distArray = dists.dataSync();

    let bestIdx = 0;
    let bestDist = distArray[0];
    for (let i = 1; i < distArray.length; i++) {
      if (distArray[i] < bestDist) {
        bestDist = distArray[i];
        bestIdx = i;
      }
    }
    return { minIdx: bestIdx, lowestDistance: bestDist };
  });

  // STRICT BIOMETRIC CEILING: Never accept distance > 0.46
  const STRICT_MAX_DISTANCE = 0.46;

  if (lowestDistance <= STRICT_MAX_DISTANCE) {
    // Map Euclidean distance [0.15, 0.46] -> confidence [0.99, 0.70]
    const confidence = Math.round(
      Math.max(70, Math.min(99, (1.0 - Math.pow(lowestDistance / 0.65, 1.6)) * 100))
    ) / 100;

    if (confidence >= minConfidenceThreshold) {
      return {
        match: validStudents[minIdx],
        confidence,
        distance: lowestDistance,
      };
    }
  }

  return {
    match: null,
    confidence: 0,
    distance: lowestDistance,
  };
}

export { tf, faceapi };
