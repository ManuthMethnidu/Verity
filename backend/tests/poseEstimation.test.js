import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { estimateHeadPose, isPoseMatchingTarget } from '../../frontend/src/vision/poseEstimation.js';

describe('Real-Time Facial Pose Estimation & Angle Classification', () => {
  // Helper to create synthetic 68-point landmarks
  function createSyntheticLandmarks(noseX = 160, noseY = 160) {
    const pts = [];
    for (let i = 0; i < 68; i++) {
      pts.push({ x: 160, y: 160 });
    }
    // Left jaw
    pts[0] = { x: 80, y: 160 };
    // Right jaw
    pts[16] = { x: 240, y: 160 };
    // Nose tip
    pts[30] = { x: noseX, y: noseY };
    // Nose bridge root
    pts[27] = { x: 160, y: 120 };
    // Chin
    pts[8] = { x: 160, y: 220 };
    // Left eye outer
    pts[36] = { x: 110, y: 130 };
    // Right eye outer
    pts[45] = { x: 210, y: 130 };
    return pts;
  }

  test('Correctly classifies frontal face when nose is centered', () => {
    // Nose at 160 is perfectly centered between 80 and 240
    const landmarks = createSyntheticLandmarks(160, 160);
    const pose = estimateHeadPose(landmarks, false);

    assert.strictEqual(pose.pose, 'front');
    assert.strictEqual(pose.isFront, true);
    assert.strictEqual(pose.isLeftProfile, false);
    assert.strictEqual(pose.isRightProfile, false);
    assert.ok(Math.abs(pose.yaw) <= 12, `Expected yaw <= 12, got ${pose.yaw}`);
    assert.strictEqual(isPoseMatchingTarget(pose, 'front'), true);
    assert.strictEqual(isPoseMatchingTarget(pose, 'left'), false);
    assert.strictEqual(isPoseMatchingTarget(pose, 'right'), false);
  });

  test('Correctly classifies left profile turn (~35°)', () => {
    // Nose shifted left towards 120
    const landmarks = createSyntheticLandmarks(120, 160);
    const pose = estimateHeadPose(landmarks, false);

    assert.strictEqual(pose.pose, 'left');
    assert.strictEqual(pose.isLeftProfile, true);
    assert.strictEqual(pose.isFront, false);
    assert.strictEqual(pose.isRightProfile, false);
    assert.ok(pose.yaw < -20 && pose.yaw > -50, `Expected yaw between -20 and -50, got ${pose.yaw}`);
    assert.strictEqual(isPoseMatchingTarget(pose, 'left'), true);
  });

  test('Correctly classifies right profile turn (~35°)', () => {
    // Nose shifted right towards 200
    const landmarks = createSyntheticLandmarks(200, 160);
    const pose = estimateHeadPose(landmarks, false);

    assert.strictEqual(pose.pose, 'right');
    assert.strictEqual(pose.isRightProfile, true);
    assert.strictEqual(pose.isFront, false);
    assert.strictEqual(pose.isLeftProfile, false);
    assert.ok(pose.yaw > 20 && pose.yaw < 50, `Expected yaw between +20 and +50, got ${pose.yaw}`);
    assert.strictEqual(isPoseMatchingTarget(pose, 'right'), true);
  });

  test('Detects over-rotation (>50°)', () => {
    // Extreme turn: nose at 90 (very close to left jaw 80)
    const landmarks = createSyntheticLandmarks(88, 160);
    const pose = estimateHeadPose(landmarks, false);

    assert.strictEqual(pose.pose, 'overrotated');
    assert.strictEqual(pose.isLeftProfile, false);
    assert.strictEqual(isPoseMatchingTarget(pose, 'left'), false);
  });

  test('Inverts yaw appropriately in mirrored mode', () => {
    const landmarks = createSyntheticLandmarks(120, 160);
    const unmirrored = estimateHeadPose(landmarks, false);
    const mirrored = estimateHeadPose(landmarks, true);

    assert.strictEqual(unmirrored.yaw, -mirrored.yaw);
  });
});
