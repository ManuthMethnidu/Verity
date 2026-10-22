/**
 * High-performance Real-Time Neural Face Detection & Recognition Loop.
 * Powered by face-api.js (@vladmandic/face-api):
 * - Multi-face TinyFaceDetector with 68-point facial landmarks
 * - 128-D deep neural face recognition descriptors (ResNet-34)
 * - Real-time Euclidean distance biometric matching against student roster
 * - Individual bounding boxes and floating nameplates rendered directly on each person's face
 */

import {
  loadFaceApiModels,
  detectAllFacesWithDescriptors,
  matchDescriptorToRoster,
} from './faceApiService.js';
import { FaceTracker } from './faceTracker.js';
import { evaluateLiveness } from './livenessService.js';

export class DetectorLoop {
  constructor({
    videoElement,
    canvasElement,
    roster = [],
    onVerifiedMatch = null,
    onStableFace = null,
    onMetricsUpdate = null,
    onSpoofAttempt = null,
    isMirrored = true,
    threshold = 0.55,
    livenessEnabled = true,
    livenessStrictness = 'standard',
  }) {
    this.video = videoElement;
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.roster = roster || [];
    this.onVerifiedMatch = onVerifiedMatch;
    this.onStableFace = onStableFace;
    this.onMetricsUpdate = onMetricsUpdate;
    this.onSpoofAttempt = onSpoofAttempt;
    this.isMirrored = Boolean(isMirrored);
    this.threshold = threshold;
    this.livenessEnabled = Boolean(livenessEnabled);
    this.livenessStrictness = livenessStrictness || 'standard';

    this.faceTracker = new FaceTracker({
      maxHistoryFrames: 30,
      maxTrackAgeMs: 1200,
      iouThreshold: 0.35,
    });

    this.isRunning = false;
    this.animationId = null;
    this.detectorReady = false;
    this.isDetecting = false;

    // Quality setting
    this.inputSize = 320;
    this.scoreThreshold = 0.45;

    // Active detected & matched faces
    this.currentFaces = [];
    this.lastDetectionTime = 0;

    // Student attendance log cooldown (prevent multiple logs within 5 seconds for the same student)
    this.studentCooldowns = new Map();
    this.COOLDOWN_MS = 5000;

    // Match overlay feedback banner (at top of screen)
    this.currentMatchFeedback = null;
    this.feedbackTimeout = null;

    // Performance metrics
    this.lastFrameTime = performance.now();
    this.fps = 0;
    this.frameCount = 0;
    this.lastFpsUpdate = performance.now();
    this.targetFps = 30;
  }

  setMirrored(mirrored) {
    this.isMirrored = Boolean(mirrored);
  }

  setRoster(roster) {
    this.roster = Array.isArray(roster) ? roster : [];
  }

  setThreshold(threshold) {
    this.threshold = Number(threshold) || 0.55;
  }

  setLivenessSettings({ enabled, strictness }) {
    if (enabled !== undefined) {
      this.livenessEnabled = Boolean(enabled);
    }
    if (strictness !== undefined) {
      this.livenessStrictness = strictness;
    }
  }

  /**
   * Initializes face-api neural network models (TinyFaceDetector, Landmarks, ResNet FaceRecognition)
   */
  async initDetector(quality = 'medium') {
    if (quality === 'low') {
      this.inputSize = 224;
      this.scoreThreshold = 0.40;
    } else if (quality === 'high') {
      this.inputSize = 416;
      this.scoreThreshold = 0.50;
    } else {
      this.inputSize = 320;
      this.scoreThreshold = 0.45;
    }

    try {
      await loadFaceApiModels();
      this.detectorReady = true;
      console.log('✅ Neural Face-API detector & 128-D recognizer initialized successfully');
    } catch (err) {
      console.error('Failed to load Face-API models:', err);
      this.detectorReady = false;
    }
  }

  /**
   * Starts tracking and recognition loop
   */
  start(targetFps = 30) {
    if (this.isRunning) return;
    this.isRunning = true;
    this.targetFps = targetFps;
    this.loop();
  }

  /**
   * Stops loop and cancels scheduled frames
   */
  stop() {
    this.isRunning = false;
    if (this.animationId) {
      if (typeof this.video.cancelVideoFrameCallback === 'function') {
        this.video.cancelVideoFrameCallback(this.animationId);
      } else {
        cancelAnimationFrame(this.animationId);
      }
      this.animationId = null;
    }
    this.clearCanvas();
  }

  clearCanvas() {
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  setMatchFeedback(feedback) {
    this.currentMatchFeedback = feedback;

    if (this.feedbackTimeout) clearTimeout(this.feedbackTimeout);
    this.feedbackTimeout = setTimeout(() => {
      this.currentMatchFeedback = null;
    }, 4000);
  }

  /**
   * Main render & animation frame loop
   */
  loop = () => {
    if (!this.isRunning) return;

    const now = performance.now();
    const frameDelta = now - this.lastFrameTime;
    this.lastFrameTime = now;

    // Calculate real-time FPS
    this.frameCount++;
    if (now - this.lastFpsUpdate >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdate));
      this.frameCount = 0;
      this.lastFpsUpdate = now;

      const frameBudgetMs = 1000 / this.targetFps;
      const budgetExceeded = frameDelta > frameBudgetMs + 10;

      if (this.onMetricsUpdate) {
        this.onMetricsUpdate({
          fps: this.fps,
          frameDeltaMs: Math.round(frameDelta),
          budgetExceeded,
        });
      }
    }

    // Process frame if video is ready
    if (this.video && this.video.readyState >= 2 && this.video.videoWidth > 0) {
      // 1. Sync canvas resolution with video dimensions
      const vWidth = this.video.videoWidth;
      const vHeight = this.video.videoHeight;
      if (this.canvas.width !== vWidth || this.canvas.height !== vHeight) {
        this.canvas.width = vWidth;
        this.canvas.height = vHeight;
      }

      // 2. Clear canvas for fresh frame
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      // 3. Trigger async detection cycle if not already running
      if (!this.isDetecting && this.detectorReady) {
        this.runFaceDetectionAsync(now);
      }

      // 4. Render bounding boxes and attached nameplates for each detected face
      this.renderFaces();

      // 5. Draw top confirmation banner if active
      this.drawTopFeedbackBanner();
    }

    // Schedule next frame with requestVideoFrameCallback if available
    if (typeof this.video.requestVideoFrameCallback === 'function') {
      this.animationId = this.video.requestVideoFrameCallback(this.loop);
    } else {
      this.animationId = requestAnimationFrame(this.loop);
    }
  };

  /**
   * Asynchronous face detection, temporal tracking, liveness verification, and biometric matching.
   * Runs in background without blocking 60fps canvas rendering!
   */
  async runFaceDetectionAsync(timestamp) {
    this.isDetecting = true;
    try {
      const detections = await detectAllFacesWithDescriptors(
        this.video,
        this.inputSize,
        this.scoreThreshold
      );

      // 1. Biometric match candidate descriptors against student roster
      const candidateDetections = detections.map((det) => {
        const matchResult = matchDescriptorToRoster(
          det.descriptor,
          this.roster,
          this.threshold
        );
        return {
          ...det,
          isMatch: Boolean(matchResult.match),
          student: matchResult.match,
          studentName: matchResult.match ? matchResult.match.name : null,
          studentCode: matchResult.match ? matchResult.match.studentIdCode : null,
          confidence: matchResult.confidence,
          distance: matchResult.distance,
        };
      });

      // 2. Feed candidates into spatial IoU temporal tracker
      const trackedItems = this.faceTracker.update(candidateDetections, timestamp);
      const processedFaces = [];

      for (const item of trackedItems) {
        const { track, detection } = item;

        // 3. Evaluate multi-signal passive liveness (EAR blinks, 3D pose variance, texture)
        const liveness = evaluateLiveness(track, {
          strictness: this.livenessStrictness,
          livenessEnabled: this.livenessEnabled,
        });
        track.liveness = liveness;

        // 4. Handle Spoofing / Presentation Attack Detection
        if (liveness.state === 'spoof_suspected') {
          if (!track.spoofAlertSent) {
            track.spoofAlertSent = true;
            if (this.onSpoofAttempt) {
              this.onSpoofAttempt({
                candidateName: track.studentName || 'Unregistered Subject',
                livenessScore: liveness.score,
                reason: liveness.reason,
                box: track.box,
              });
            }
            this.setMatchFeedback({
              success: false,
              isSpoof: true,
              name: track.studentName || 'Presentation Attack',
              message: 'Live human face required (static photo/screen detected)',
            });
          }
        }

        // 5. Handle Live & Verified Student Attendance
        if (detection.isMatch && detection.student && liveness.state === 'live') {
          const student = detection.student;
          const lastLogged = this.studentCooldowns.get(student.id) || 0;
          if (timestamp - lastLogged > this.COOLDOWN_MS) {
            this.studentCooldowns.set(student.id, timestamp);

            if (this.onVerifiedMatch) {
              this.onVerifiedMatch({
                student,
                confidence: detection.confidence,
                distance: detection.distance,
                box: track.box,
                livenessScore: liveness.score,
              });
            }

            this.setMatchFeedback({
              success: true,
              name: student.name,
              confidence: detection.confidence,
              livenessScore: liveness.score,
            });
          }
        }

        processedFaces.push({
          box: track.box,
          isMatch: detection.isMatch,
          student: detection.student,
          studentName: detection.studentName,
          studentCode: detection.studentCode,
          confidence: detection.confidence,
          distance: detection.distance,
          liveness,
          trackId: track.trackId,
        });
      }

      this.currentFaces = processedFaces;
      this.lastDetectionTime = timestamp;
    } catch (err) {
      console.warn('Face detection pass failed:', err);
    } finally {
      this.isDetecting = false;
    }
  }

  /**
   * Renders bounding boxes, liveness progress, and nameplate badges directly respective to EACH face
   */
  renderFaces() {
    const { ctx, canvas } = this;
    if (!this.currentFaces || this.currentFaces.length === 0) return;

    for (const face of this.currentFaces) {
      const { box, isMatch, studentName, confidence, liveness } = face;

      const isSpoof = liveness && liveness.state === 'spoof_suspected';
      const isLive = liveness && liveness.state === 'live';
      const isAnalyzing = liveness && liveness.state === 'analyzing';
      const progress = liveness?.progress || 0.0;

      // Handle mirroring transformation
      const boxW = box.width;
      const boxH = box.height;
      const boxX = this.isMirrored ? (canvas.width - box.x - boxW) : box.x;
      const boxY = box.y;

      const cornerLength = Math.min(boxW, boxH) * 0.22;
      const isRosterEmpty = !this.roster || this.roster.length === 0;

      // Dynamic theme color based on liveness + match state
      let themeColor = '#94a3b8';
      let strokeBg = 'rgba(148, 163, 184, 0.35)';

      if (isSpoof) {
        themeColor = '#ef4444'; // Crimson Alert
        strokeBg = 'rgba(239, 68, 68, 0.50)';
      } else if (isMatch && isLive) {
        themeColor = '#10b981'; // Emerald Verified
        strokeBg = 'rgba(16, 185, 129, 0.45)';
      } else if (isMatch && isAnalyzing) {
        themeColor = '#06b6d4'; // Cyan Liveness Check
        strokeBg = 'rgba(6, 182, 212, 0.45)';
      } else if (isRosterEmpty) {
        themeColor = '#f59e0b'; // Amber Warning
        strokeBg = 'rgba(245, 158, 11, 0.40)';
      } else if (!isMatch && isLive) {
        themeColor = '#f59e0b';
        strokeBg = 'rgba(245, 158, 11, 0.40)';
      }

      ctx.save();

      // 1. Semi-transparent bounding box outline
      ctx.strokeStyle = strokeBg;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(boxX, boxY, boxW, boxH);

      // 2. High-visibility corner brackets
      ctx.strokeStyle = themeColor;
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      // Top-Left
      ctx.moveTo(boxX, boxY + cornerLength);
      ctx.lineTo(boxX, boxY);
      ctx.lineTo(boxX + cornerLength, boxY);
      // Top-Right
      ctx.moveTo(boxX + boxW - cornerLength, boxY);
      ctx.lineTo(boxX + boxW, boxY);
      ctx.lineTo(boxX + boxW, boxY + cornerLength);
      // Bottom-Right
      ctx.moveTo(boxX + boxW, boxY + boxH - cornerLength);
      ctx.lineTo(boxX + boxW, boxY + boxH);
      ctx.lineTo(boxX + boxW - cornerLength, boxY + boxH);
      // Bottom-Left
      ctx.moveTo(boxX + cornerLength, boxY + boxH);
      ctx.lineTo(boxX, boxY + boxH);
      ctx.lineTo(boxX, boxY + boxH - cornerLength);
      ctx.stroke();

      // 3. Nameplate Badge attached directly to this person's face
      let badgeText = '';
      let badgeFill = 'rgba(15, 23, 42, 0.95)';

      if (isSpoof) {
        badgeText = '⚠️ SPOOF SUSPECTED • Live Face Required';
        badgeFill = 'rgba(127, 29, 29, 0.96)';
      } else if (isMatch && isLive && studentName) {
        const confPct = Math.round((confidence || 0.95) * 100);
        badgeText = `✓ ${studentName} • ${confPct}% (Live)`;
        badgeFill = 'rgba(6, 78, 59, 0.96)';
      } else if (isMatch && isAnalyzing && studentName) {
        const pct = Math.round(progress * 100);
        badgeText = `🔍 ${studentName} • Verifying Liveness (${pct}%)`;
        badgeFill = 'rgba(8, 47, 73, 0.96)';
      } else if (isRosterEmpty) {
        badgeText = '⚠️ Roster Empty • Enroll in Roster';
        badgeFill = 'rgba(120, 53, 15, 0.95)';
      } else if (!isMatch && isLive) {
        badgeText = '⚠️ Unrecognized Face (Live)';
        badgeFill = 'rgba(120, 53, 15, 0.95)';
      } else {
        badgeText = '🔍 Analyzing Candidate Face...';
        badgeFill = 'rgba(30, 41, 59, 0.95)';
      }

      ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const textWidth = ctx.measureText(badgeText).width;
      const badgeW = textWidth + 26;
      const badgeH = 28;
      const badgeX = Math.max(8, Math.min(canvas.width - badgeW - 8, boxX + (boxW - badgeW) / 2));
      const badgeY = boxY - 36 > 8 ? boxY - 36 : boxY + boxH + 8;

      // Badge pill background
      ctx.fillStyle = badgeFill;
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 14);
      ctx.fill();

      // Badge border
      ctx.strokeStyle = themeColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Status indicator dot
      ctx.fillStyle = themeColor;
      ctx.beginPath();
      ctx.arc(badgeX + 12, badgeY + badgeH / 2, 4, 0, Math.PI * 2);
      ctx.fill();

      // Badge text
      ctx.fillStyle = '#ffffff';
      ctx.fillText(badgeText, badgeX + 22, badgeY + 19);

      // 4. Progressive Liveness Progress Bar (for active verification phase)
      if (isAnalyzing && progress > 0) {
        const barW = Math.max(boxW * 0.7, 80);
        const barH = 5;
        const barX = boxX + (boxW - barW) / 2;
        const barY = boxY + boxH + 4;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
        ctx.beginPath();
        ctx.roundRect(barX, barY, barW, barH, 2.5);
        ctx.fill();

        ctx.fillStyle = themeColor;
        ctx.beginPath();
        ctx.roundRect(barX, barY, barW * progress, barH, 2.5);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  /**
   * Renders top notification banner for match feedback or spoof warning
   */
  drawTopFeedbackBanner() {
    if (!this.currentMatchFeedback) return;

    const { ctx, canvas } = this;
    const { success, isSpoof, name, confidence, message } = this.currentMatchFeedback;

    const bannerW = Math.min(canvas.width * 0.92, 480);
    const bannerH = 68;
    const bannerX = (canvas.width - bannerW) / 2;
    const bannerY = 20;

    ctx.save();
    ctx.fillStyle = isSpoof
      ? 'rgba(127, 29, 29, 0.97)'
      : success
      ? 'rgba(6, 78, 59, 0.96)'
      : 'rgba(30, 41, 59, 0.96)';
    ctx.beginPath();
    ctx.roundRect(bannerX, bannerY, bannerW, bannerH, 14);
    ctx.fill();

    ctx.strokeStyle = isSpoof ? '#ef4444' : success ? '#34d399' : '#94a3b8';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Title text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const titleText = isSpoof
      ? '⚠️ Presentation Attack Rejected'
      : success
      ? `✓ Attendance Logged: ${name}`
      : 'ℹ️ Face Recognition Update';
    ctx.fillText(titleText, bannerX + 18, bannerY + 28);

    // Subtitle text
    ctx.fillStyle = isSpoof ? '#fecaca' : success ? '#a7f3d0' : '#cbd5e1';
    ctx.font = '13px sans-serif';
    const subText = isSpoof
      ? 'Static photo/screen detected. Real biological presence required.'
      : success
      ? `Confidence: ${(confidence * 100).toFixed(1)}% • Live Biometric Verified`
      : message || 'Face processed';
    ctx.fillText(subText, bannerX + 18, bannerY + 50);

    ctx.restore();
  }
}
