/**
 * Multi-Face Spatial IoU & Centroid Temporal Tracker.
 * Maintains track identities and temporal history buffers across consecutive video frames.
 */

/**
 * Calculates Intersection over Union (IoU) of two bounding boxes { x, y, width, height }
 */
export function calculateIoU(boxA, boxB) {
  const xA = Math.max(boxA.x, boxB.x);
  const yA = Math.max(boxA.y, boxB.y);
  const xB = Math.min(boxA.x + boxA.width, boxB.x + boxB.width);
  const yB = Math.min(boxA.y + boxA.height, boxB.y + boxB.height);

  const interWidth = Math.max(0, xB - xA);
  const interHeight = Math.max(0, yB - yA);
  const interArea = interWidth * interHeight;

  const areaA = boxA.width * boxA.height;
  const areaB = boxB.width * boxB.height;
  const unionArea = areaA + areaB - interArea;

  if (unionArea <= 0) return 0;
  return interArea / unionArea;
}

/**
 * Calculates normalized centroid Euclidean distance between two bounding boxes
 */
export function calculateCentroidDistance(boxA, boxB) {
  const cAx = boxA.x + boxA.width / 2;
  const cAy = boxA.y + boxA.height / 2;
  const cBx = boxB.x + boxB.width / 2;
  const cBy = boxB.y + boxB.height / 2;

  const dx = cAx - cBx;
  const dy = cAy - cBy;
  return Math.sqrt(dx * dx + dy * dy);
}

export class FaceTracker {
  constructor({ maxHistoryFrames = 30, maxTrackAgeMs = 1200, iouThreshold = 0.35 } = {}) {
    this.maxHistoryFrames = maxHistoryFrames;
    this.maxTrackAgeMs = maxTrackAgeMs;
    this.iouThreshold = iouThreshold;
    this.tracks = new Map();
    this.nextTrackId = 1;
  }

  /**
   * Updates tracks with current frame detections.
   * @param {Array} detections - List of { box, landmarks, descriptor, student, ... }
   * @param {number} timestamp - Current performance.now() or Date.now()
   * @returns {Array} List of matched track items with their current detection and history
   */
  update(detections = [], timestamp = performance.now()) {
    // 1. Purge stale tracks that have not been seen recently
    for (const [trackId, track] of this.tracks.entries()) {
      if (timestamp - track.lastSeen > this.maxTrackAgeMs) {
        this.tracks.delete(trackId);
      }
    }

    const unmatchedDetections = [...detections];
    const updatedTracks = [];

    // 2. Associate detections with existing tracks using IoU & centroid proximity
    for (const [trackId, track] of this.tracks.entries()) {
      let bestMatchIndex = -1;
      let highestIoU = -1;

      for (let i = 0; i < unmatchedDetections.length; i++) {
        const det = unmatchedDetections[i];
        const iou = calculateIoU(track.box, det.box);

        if (iou > highestIoU && iou >= this.iouThreshold) {
          highestIoU = iou;
          bestMatchIndex = i;
        }
      }

      // Fallback: If IoU is low due to quick movement or scale change, check centroid proximity
      if (bestMatchIndex === -1 && unmatchedDetections.length > 0) {
        let minDistance = Infinity;
        const maxCentroidDist = Math.max(track.box.width, track.box.height) * 0.8;

        for (let i = 0; i < unmatchedDetections.length; i++) {
          const det = unmatchedDetections[i];
          const dist = calculateCentroidDistance(track.box, det.box);
          if (dist < minDistance && dist <= maxCentroidDist) {
            minDistance = dist;
            bestMatchIndex = i;
          }
        }
      }

      if (bestMatchIndex !== -1) {
        const matchedDet = unmatchedDetections.splice(bestMatchIndex, 1)[0];
        track.box = matchedDet.box;
        track.lastSeen = timestamp;
        track.student = matchedDet.student || track.student;
        track.studentName = matchedDet.studentName || track.studentName;

        // Record history snapshot
        track.history.push({
          timestamp,
          box: matchedDet.box,
          landmarks: matchedDet.landmarks,
        });

        if (track.history.length > this.maxHistoryFrames) {
          track.history.shift();
        }

        updatedTracks.push({ track, detection: matchedDet });
      }
    }

    // 3. Create new tracks for remaining unmatched detections
    for (const det of unmatchedDetections) {
      const trackId = `face_track_${this.nextTrackId++}`;
      const newTrack = {
        trackId,
        firstSeen: timestamp,
        lastSeen: timestamp,
        box: det.box,
        student: det.student || null,
        studentName: det.studentName || null,
        history: [
          {
            timestamp,
            box: det.box,
            landmarks: det.landmarks,
          },
        ],
        liveness: {
          state: 'analyzing', // 'analyzing' | 'live' | 'spoof_suspected'
          score: 0.0,
          progress: 0.0,
          reason: null,
          hasBlinked: false,
          verifiedAt: null,
          alertSent: false,
        },
      };

      this.tracks.set(trackId, newTrack);
      updatedTracks.push({ track: newTrack, detection: det });
    }

    return updatedTracks;
  }

  getTrack(trackId) {
    return this.tracks.get(trackId);
  }

  clear() {
    this.tracks.clear();
  }
}
