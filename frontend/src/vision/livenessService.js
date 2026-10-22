/**
 * Real-Time Passive Liveness & Anti-Spoofing Detection Engine.
 * Evaluates facial biometrics using 68-point facial landmarks:
 * 1. Eye Aspect Ratio (EAR) blink tracking
 * 2. 3D Head Pose angle and micro-movement variance
 * 3. Temporal consistency and presentation attack rejection
 */

function distance(p1, p2) {
  if (!p1 || !p2) return 0;
  const dx = (p1._x !== undefined ? p1._x : p1.x) - (p2._x !== undefined ? p2._x : p2.x);
  const dy = (p1._y !== undefined ? p1._y : p1.y) - (p2._y !== undefined ? p2._y : p2.y);
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculates Eye Aspect Ratio (EAR) for a 6-point eye landmark set [p1, p2, p3, p4, p5, p6]
 */
export function calculateEAR(eyePoints) {
  if (!eyePoints || eyePoints.length < 6) return 0.3;
  const p1 = eyePoints[0];
  const p2 = eyePoints[1];
  const p3 = eyePoints[2];
  const p4 = eyePoints[3];
  const p5 = eyePoints[4];
  const p6 = eyePoints[5];

  const vertical1 = distance(p2, p6);
  const vertical2 = distance(p3, p5);
  const horizontal = distance(p1, p4);

  if (horizontal <= 0.0001) return 0.3;
  return (vertical1 + vertical2) / (2.0 * horizontal);
}

/**
 * Extracts average EAR for left and right eyes from 68 facial landmarks
 */
export function getFaceEAR(landmarks) {
  if (!landmarks) return 0.3;

  // vladmandic/face-api landmarks has either positions array or getLeftEye()/getRightEye()
  let leftEye;
  let rightEye;

  if (typeof landmarks.getLeftEye === 'function') {
    leftEye = landmarks.getLeftEye();
    rightEye = landmarks.getRightEye();
  } else if (landmarks.positions && landmarks.positions.length >= 68) {
    leftEye = landmarks.positions.slice(36, 42);
    rightEye = landmarks.positions.slice(42, 48);
  } else if (Array.isArray(landmarks) && landmarks.length >= 68) {
    leftEye = landmarks.slice(36, 42);
    rightEye = landmarks.slice(42, 48);
  } else {
    return 0.3;
  }

  const leftEAR = calculateEAR(leftEye);
  const rightEAR = calculateEAR(rightEye);
  return (leftEAR + rightEAR) / 2.0;
}

/**
 * Computes 3D head pose perspective approximations (yaw, pitch, roll) from 68 landmarks
 */
export function calculateHeadPose(landmarks) {
  if (!landmarks) return { yaw: 1.0, pitch: 1.0, roll: 0.0 };

  let pts = landmarks.positions || landmarks;
  if (typeof landmarks.getPositions === 'function') {
    pts = landmarks.getPositions();
  }
  if (!pts || pts.length < 68) {
    return { yaw: 1.0, pitch: 1.0, roll: 0.0 };
  }

  const noseTip = pts[30];
  const chin = pts[8];
  const leftEyeOuter = pts[36];
  const rightEyeOuter = pts[45];

  const distNoseToLeftEye = distance(noseTip, leftEyeOuter);
  const distNoseToRightEye = distance(noseTip, rightEyeOuter);
  const yawRatio = distNoseToLeftEye / (distNoseToRightEye + 0.0001);

  const eyeMidpoint = {
    x: ((leftEyeOuter._x || leftEyeOuter.x) + (rightEyeOuter._x || rightEyeOuter.x)) / 2,
    y: ((leftEyeOuter._y || leftEyeOuter.y) + (rightEyeOuter._y || rightEyeOuter.y)) / 2,
  };
  const distNoseToEyes = distance(noseTip, eyeMidpoint);
  const distNoseToChin = distance(noseTip, chin);
  const pitchRatio = distNoseToEyes / (distNoseToChin + 0.0001);

  const dx = (rightEyeOuter._x || rightEyeOuter.x) - (leftEyeOuter._x || leftEyeOuter.x);
  const dy = (rightEyeOuter._y || rightEyeOuter.y) - (leftEyeOuter._y || leftEyeOuter.y);
  const rollAngle = Math.atan2(dy, dx);

  return {
    yaw: Number(yawRatio.toFixed(4)),
    pitch: Number(pitchRatio.toFixed(4)),
    roll: Number(rollAngle.toFixed(4)),
  };
}

/**
 * Calculates statistical variance of an array of numbers
 */
function calculateVariance(values) {
  if (!values || values.length <= 1) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
  return squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Evaluates a tracked face over its accumulated temporal history.
 * @param {Object} track - Face tracker object with history buffer
 * @param {Object} options - Configuration options
 * @returns {Object} Updated liveness state { state, score, progress, reason }
 */
export function evaluateLiveness(track, { strictness = 'standard', livenessEnabled = true } = {}) {
  if (!livenessEnabled) {
    // If disabled in tenant settings, bypass checks immediately
    return {
      state: 'live',
      score: 1.0,
      progress: 1.0,
      reason: 'Liveness bypass (disabled)',
      hasBlinked: true,
    };
  }

  const { history, firstSeen, lastSeen } = track;
  const durationMs = lastSeen - firstSeen;
  const sampleCount = history.length;

  const minDurationMs = strictness === 'high' ? 800 : 600;
  const maxDurationMs = 2500;
  const requiredScore = strictness === 'high' ? 0.78 : 0.65;

  // If track already achieved 'live' status, maintain it
  if (track.liveness && track.liveness.state === 'live') {
    return track.liveness;
  }

  if (sampleCount < 4 || durationMs < 200) {
    return {
      state: 'analyzing',
      score: 0.2,
      progress: Math.min(0.3, durationMs / minDurationMs),
      reason: 'Gathering initial frames...',
      hasBlinked: false,
    };
  }

  // 1. Analyze Eye Aspect Ratio (EAR) across history
  const earValues = [];
  const yawValues = [];
  const pitchValues = [];
  const rollValues = [];

  for (const snap of history) {
    if (snap.landmarks) {
      earValues.push(getFaceEAR(snap.landmarks));
      const pose = calculateHeadPose(snap.landmarks);
      yawValues.push(pose.yaw);
      pitchValues.push(pose.pitch);
      rollValues.push(pose.roll);
    }
  }

  // Calculate EAR variance and blink dip
  const minEAR = Math.min(...earValues);
  const maxEAR = Math.max(...earValues);
  const earDelta = maxEAR - minEAR;
  const earVariance = calculateVariance(earValues);

  // A natural blink typically dips EAR below 0.22 or creates a dynamic swing >= 0.065
  const hasBlinked = minEAR < 0.22 || earDelta >= 0.065;
  const blinkScore = hasBlinked ? 0.45 : Math.min(0.25, earVariance * 250);

  // 2. Analyze Head Pose & 3D micro-movement variance
  const yawVariance = calculateVariance(yawValues);
  const pitchVariance = calculateVariance(pitchValues);
  const rollVariance = calculateVariance(rollValues);
  const totalPoseVariance = yawVariance + pitchVariance + rollVariance;

  // Real human heads have continuous subtle micro-tremors and natural adjustments.
  // Flat printed paper has virtually zero variance (< 0.00008).
  let motionScore = 0;
  if (totalPoseVariance >= 0.0003) {
    motionScore = 0.35;
  } else if (totalPoseVariance >= 0.0001) {
    motionScore = 0.22;
  } else {
    // Very rigid / static face
    motionScore = 0.05;
  }

  // 3. Natural landmark consistency & dynamism
  let dynamismScore = 0.15;
  if (sampleCount >= 8 && totalPoseVariance > 0.0001) {
    dynamismScore = 0.20;
  }

  const compositeScore = Math.min(1.0, Number((blinkScore + motionScore + dynamismScore).toFixed(3)));

  // Determine state
  const progress = Math.min(1.0, durationMs / minDurationMs);

  if (compositeScore >= requiredScore && durationMs >= minDurationMs) {
    return {
      state: 'live',
      score: compositeScore,
      progress: 1.0,
      reason: 'Live biological face confirmed',
      hasBlinked,
    };
  }

  // Presentation attack check:
  // If in front of camera for over maxDurationMs with virtually zero variance and no blinks
  if (durationMs >= maxDurationMs && totalPoseVariance < 0.00015 && !hasBlinked) {
    return {
      state: 'spoof_suspected',
      score: compositeScore,
      progress: 1.0,
      reason: 'Static presentation attack detected (flat image / no micro-movement)',
      hasBlinked: false,
    };
  }

  return {
    state: 'analyzing',
    score: compositeScore,
    progress,
    reason: hasBlinked ? 'Verifying micro-movement...' : 'Verifying liveness...',
    hasBlinked,
  };
}
