import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateIoU,
  calculateCentroidDistance,
  FaceTracker,
} from '../../frontend/src/vision/faceTracker.js';
import {
  calculateEAR,
  calculateHeadPose,
  evaluateLiveness,
} from '../../frontend/src/vision/livenessService.js';

describe('Spatial IoU & FaceTracker Suite', () => {
  it('calculates IoU of identical boxes as 1.0', () => {
    const box = { x: 50, y: 50, width: 100, height: 100 };
    const iou = calculateIoU(box, box);
    assert.strictEqual(iou, 1.0);
  });

  it('calculates IoU of non-overlapping boxes as 0.0', () => {
    const boxA = { x: 0, y: 0, width: 50, height: 50 };
    const boxB = { x: 100, y: 100, width: 50, height: 50 };
    const iou = calculateIoU(boxA, boxB);
    assert.strictEqual(iou, 0.0);
  });

  it('tracks faces across sequential frames with temporal history', () => {
    const tracker = new FaceTracker();
    const t0 = 1000;
    const initialDetections = [
      {
        box: { x: 100, y: 100, width: 80, height: 80 },
        landmarks: null,
      },
    ];

    const updated1 = tracker.update(initialDetections, t0);
    assert.strictEqual(updated1.length, 1);
    const trackId = updated1[0].track.trackId;

    // Next frame: slightly moved
    const updated2 = tracker.update(
      [
        {
          box: { x: 102, y: 101, width: 80, height: 80 },
          landmarks: null,
        },
      ],
      t0 + 33
    );

    assert.strictEqual(updated2.length, 1);
    assert.strictEqual(updated2[0].track.trackId, trackId);
    assert.strictEqual(updated2[0].track.history.length, 2);
  });
});

describe('Passive Liveness & Anti-Spoofing Suite', () => {
  it('correctly calculates Eye Aspect Ratio (EAR)', () => {
    // Open eye points
    const openEye = [
      { x: 10, y: 20 },
      { x: 15, y: 15 },
      { x: 25, y: 15 },
      { x: 30, y: 20 },
      { x: 25, y: 25 },
      { x: 15, y: 25 },
    ];
    const earOpen = calculateEAR(openEye);
    assert.ok(earOpen > 0.35, `Expected open EAR > 0.35, got ${earOpen}`);

    // Closed eye points (narrow vertical height)
    const closedEye = [
      { x: 10, y: 20 },
      { x: 15, y: 19.5 },
      { x: 25, y: 19.5 },
      { x: 30, y: 20 },
      { x: 25, y: 20.5 },
      { x: 15, y: 20.5 },
    ];
    const earClosed = calculateEAR(closedEye);
    assert.ok(earClosed < 0.15, `Expected closed EAR < 0.15, got ${earClosed}`);
  });

  it('detects live face with natural micro-movements and blink', () => {
    const dummyLandmarksOpen = Array.from({ length: 68 }, (_, i) => ({
      x: 100 + i * 2,
      y: 100 + (i % 5) * 5,
    }));
    // Open eyes in landmarks
    for (let i = 36; i < 48; i++) {
      dummyLandmarksOpen[i] = { x: 100 + i, y: 120 + ((i % 6) === 1 || (i % 6) === 2 ? -4 : 4) };
    }

    const dummyLandmarksClosed = Array.from({ length: 68 }, (_, i) => ({
      x: 100 + i * 2,
      y: 100 + (i % 5) * 5,
    }));
    // Closed eyes in landmarks
    for (let i = 36; i < 48; i++) {
      dummyLandmarksClosed[i] = { x: 100 + i, y: 120 + 0.5 };
    }

    const track = {
      firstSeen: 1000,
      lastSeen: 1750, // 750ms duration
      history: [
        { timestamp: 1000, landmarks: dummyLandmarksOpen },
        { timestamp: 1150, landmarks: dummyLandmarksOpen },
        { timestamp: 1300, landmarks: dummyLandmarksClosed }, // Blink!
        { timestamp: 1450, landmarks: dummyLandmarksOpen },
        { timestamp: 1600, landmarks: dummyLandmarksOpen },
        { timestamp: 1750, landmarks: dummyLandmarksOpen },
      ],
      liveness: null,
    };

    const res = evaluateLiveness(track, { strictness: 'standard', livenessEnabled: true });
    assert.strictEqual(res.state, 'live');
    assert.ok(res.score >= 0.65, `Expected score >= 0.65, got ${res.score}`);
    assert.strictEqual(res.hasBlinked, true);
  });

  it('rejects static photo spoof with zero movement after timeout', () => {
    // Exactly identical landmarks (static printed picture)
    const staticLandmarks = Array.from({ length: 68 }, (_, i) => ({
      x: 100 + i,
      y: 100 + i,
    }));

    const track = {
      firstSeen: 1000,
      lastSeen: 3700, // 2700ms duration (exceeds maxDurationMs)
      history: Array.from({ length: 15 }, (_, idx) => ({
        timestamp: 1000 + idx * 180,
        landmarks: staticLandmarks, // Zero change over 2.7 seconds
      })),
      liveness: null,
    };

    const res = evaluateLiveness(track, { strictness: 'standard', livenessEnabled: true });
    assert.strictEqual(res.state, 'spoof_suspected');
    assert.ok(res.reason.includes('presentation attack') || res.reason.includes('flat'));
  });

  it('bypasses checks when liveness is disabled', () => {
    const track = {
      firstSeen: 1000,
      lastSeen: 1050,
      history: [],
      liveness: null,
    };

    const res = evaluateLiveness(track, { livenessEnabled: false });
    assert.strictEqual(res.state, 'live');
    assert.strictEqual(res.score, 1.0);
  });
});
