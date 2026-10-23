/**
 * Real-Time Facial Pose Estimation from 68-Point Landmarks.
 * Computes horizontal yaw, vertical pitch, and roll without any external ML dependencies.
 *
 * Landmark Index Reference (@vladmandic/face-api 68 points):
 * - 0: Leftmost jaw edge (camera perspective)
 * - 16: Rightmost jaw edge (camera perspective)
 * - 30: Nose tip
 * - 27: Nose bridge top (between eyes)
 * - 8: Chin lowest tip
 * - 36: Left eye outer corner
 * - 39: Left eye inner corner
 * - 42: Right eye inner corner
 * - 45: Right eye outer corner
 */

/**
 * @typedef {Object} PoseEstimate
 * @property {number} yaw - Estimated horizontal head turn in degrees (-90 to +90)
 * @property {number} pitch - Estimated vertical tilt in degrees (-45 to +45)
 * @property {number} roll - Estimated sideways tilt in degrees (-45 to +45)
 * @property {number} yawRatio - Symmetry ratio (-1.0 to 1.0)
 * @property {'front' | 'left' | 'right' | 'overrotated' | 'unknown'} pose
 * @property {boolean} isFront
 * @property {boolean} isLeftProfile
 * @property {boolean} isRightProfile
 * @property {string} feedback
 * @property {number} confidence
 */

/**
 * Extracts normalized positions array from face-api landmark object
 */
function getPositions(landmarks) {
  if (!landmarks) return null;
  if (Array.isArray(landmarks)) return landmarks;
  if (Array.isArray(landmarks.positions)) return landmarks.positions;
  if (Array.isArray(landmarks._positions)) return landmarks._positions;
  return null;
}

/**
 * Estimates 3D head pose orientation from 68 2D facial landmarks.
 *
 * @param {object|Array} landmarks - 68-point landmarks from face-api.js
 * @param {boolean} isMirrored - Whether camera stream is horizontally mirrored (selfie mode)
 * @returns {PoseEstimate}
 */
export function estimateHeadPose(landmarks, isMirrored = false) {
  const pts = getPositions(landmarks);
  if (!pts || pts.length < 68) {
    return {
      yaw: 0,
      pitch: 0,
      roll: 0,
      yawRatio: 0,
      pose: 'unknown',
      isFront: false,
      isLeftProfile: false,
      isRightProfile: false,
      feedback: 'Face not clearly visible',
      confidence: 0,
    };
  }

  const p0 = pts[0]; // Left jaw
  const p16 = pts[16]; // Right jaw
  const p30 = pts[30]; // Nose tip
  const p27 = pts[27]; // Nose bridge root
  const p8 = pts[8]; // Chin
  const p36 = pts[36]; // Left eye outer
  const p45 = pts[45]; // Right eye outer

  // 1. Roll calculation (in-plane rotation around Z axis)
  const eyeDx = p45.x - p36.x;
  const eyeDy = p45.y - p36.y;
  const rollRad = Math.atan2(eyeDy, eyeDx);
  const rollDeg = Math.round((rollRad * 180) / Math.PI);

  // 2. Horizontal Yaw calculation
  // Distance from nose tip to jaw boundaries
  const distLeftJaw = Math.max(1, p30.x - p0.x);
  const distRightJaw = Math.max(1, p16.x - p30.x);
  const totalJawSpan = distLeftJaw + distRightJaw;

  // Raw yaw ratio: 0 is centered frontal, negative is nose shifted left, positive is nose shifted right
  let rawYawRatio = (distLeftJaw - distRightJaw) / totalJawSpan;

  // Account for mirrored video display (in selfie mode, turning your head left moves nose left on screen)
  if (isMirrored) {
    rawYawRatio = -rawYawRatio;
  }

  // Map ratio (-0.6 to +0.6) to approximate degrees (-55° to +55°) with symmetric rounding
  const yawDeg = Math.sign(rawYawRatio) * Math.round(Math.abs(rawYawRatio) * 75);

  // 3. Pitch calculation (vertical tilt up/down)
  const upperFaceHeight = Math.max(1, p30.y - p27.y); // Nose length
  const lowerFaceHeight = Math.max(1, p8.y - p30.y); // Nose to chin
  const pitchRatio = (upperFaceHeight - lowerFaceHeight * 0.5) / (upperFaceHeight + lowerFaceHeight);
  const pitchDeg = Math.round(pitchRatio * 60);

  // 4. Classification & Angle Sweet-Spots
  // Front: yaw between -12° and +12°
  // Left Profile sweet spot: -24° to -48°
  // Right Profile sweet spot: +24° to +48°
  // Overrotated: > 52° or < -52°
  let pose = 'unknown';
  let isFront = false;
  let isLeftProfile = false;
  let isRightProfile = false;
  let feedback = '';

  if (Math.abs(rollDeg) > 18) {
    feedback = 'Keep your head level (avoid tilting)';
  } else if (pitchDeg > 22) {
    feedback = 'Lower your chin slightly';
  } else if (pitchDeg < -22) {
    feedback = 'Raise your head slightly';
  } else if (Math.abs(yawDeg) <= 12) {
    pose = 'front';
    isFront = true;
    feedback = 'Great! Looking straight ahead';
  } else if (yawDeg <= -22 && yawDeg >= -50) {
    pose = 'left';
    isLeftProfile = true;
    feedback = `Left profile verified (${Math.abs(yawDeg)}°)`;
  } else if (yawDeg >= 22 && yawDeg <= 50) {
    pose = 'right';
    isRightProfile = true;
    feedback = `Right profile verified (${yawDeg}°)`;
  } else if (yawDeg < -50 || yawDeg > 50) {
    pose = 'overrotated';
    feedback = 'Turn slightly back towards center (angle too sharp)';
  } else {
    feedback = yawDeg < 0 ? 'Turn head a bit more to the left' : 'Turn head a bit more to the right';
  }

  return {
    yaw: yawDeg,
    pitch: pitchDeg,
    roll: rollDeg,
    yawRatio: rawYawRatio,
    pose,
    isFront,
    isLeftProfile,
    isRightProfile,
    feedback,
    confidence: Math.max(0, 1 - Math.abs(rollDeg) / 45),
  };
}

/**
 * Checks if the detected pose matches the expected target step ('front' | 'left' | 'right')
 */
export function isPoseMatchingTarget(detectedPose, targetStep) {
  if (!detectedPose) return false;
  if (targetStep === 'front') return detectedPose.isFront;
  if (targetStep === 'left') return detectedPose.isLeftProfile;
  if (targetStep === 'right') return detectedPose.isRightProfile;
  return false;
}
