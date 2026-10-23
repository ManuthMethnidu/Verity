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
  clearRosterTensorCache,
} from './faceApiService.js';

export class DetectorLoop {
  constructor({
    videoElement,
    canvasElement,
    roster = [],
    onVerifiedMatch = null,
    onStableFace = null,
    onMetricsUpdate = null,
    isMirrored = true,
    threshold = 0.55,
    batterySaver = false,
  }) {
    this.video = videoElement;
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.roster = roster || [];
    this.onVerifiedMatch = onVerifiedMatch;
    this.onStableFace = onStableFace;
    this.onMetricsUpdate = onMetricsUpdate;
    this.isMirrored = Boolean(isMirrored);
    this.threshold = threshold;
    this.batterySaver = Boolean(batterySaver);

    this.isMobileDevice =
      typeof navigator !== 'undefined' &&
      (/Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        (typeof window !== 'undefined' && window.innerWidth <= 768));

    this.isRunning = false;
    this.animationId = null;
    this.detectorReady = false;
    this.isDetecting = false;

    // Quality setting (optimized for mobile)
    this.inputSize = this.isMobileDevice ? 224 : 320;
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
    clearRosterTensorCache();
  }

  setThreshold(threshold) {
    this.threshold = Number(threshold) || 0.55;
  }

  /**
   * Initializes face-api neural network models (TinyFaceDetector, Landmarks, ResNet FaceRecognition)
   */
  async initDetector(quality = 'medium') {
    if (quality === 'low' || this.batterySaver) {
      this.inputSize = this.isMobileDevice ? 160 : 224;
      this.scoreThreshold = 0.40;
    } else if (quality === 'high') {
      this.inputSize = this.isMobileDevice ? 320 : 416;
      this.scoreThreshold = 0.50;
    } else {
      // Default / medium: 224 on mobile cuts neural FLOPs in half!
      this.inputSize = this.isMobileDevice ? 224 : 320;
      this.scoreThreshold = 0.45;
    }

    try {
      await loadFaceApiModels();
      this.detectorReady = true;
      console.log('[DetectorLoop] Neural Face-API detector & 128-D recognizer initialized successfully');
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

      // 3. Trigger async detection cycle if cadence threshold satisfied (keeps mobile GPU cool)
      const minInterval = this.batterySaver ? 220 : (this.isMobileDevice ? 90 : 50);
      if (!this.isDetecting && this.detectorReady && (now - this.lastDetectionTime >= minInterval)) {
        this.lastDetectionTime = now;
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
   * Asynchronous face detection and biometric matching.
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

      const processedFaces = [];

      for (const det of detections) {
        // Match 128-D descriptor against student roster
        const matchResult = matchDescriptorToRoster(
          det.descriptor,
          this.roster,
          this.threshold
        );

        const isMatch = Boolean(matchResult.match);
        const student = matchResult.match;
        const confidence = matchResult.confidence;
        const distance = matchResult.distance;
        const matchedAngle = matchResult.matchedAngle;

        processedFaces.push({
          box: det.box,
          isMatch,
          student,
          studentName: student ? student.name : null,
          studentCode: student ? student.studentIdCode : null,
          confidence,
          distance,
          matchedAngle,
        });

        // If recognized student, check cooldown and trigger verified attendance
        if (isMatch && student) {
          const lastLogged = this.studentCooldowns.get(student.id) || 0;
          if (timestamp - lastLogged > this.COOLDOWN_MS) {
            this.studentCooldowns.set(student.id, timestamp);

            // Trigger attendance logging callback
            if (this.onVerifiedMatch) {
              this.onVerifiedMatch({
                student,
                confidence,
                distance,
                matchedAngle,
                box: det.box,
              });
            }

            // Show top banner feedback
            this.setMatchFeedback({
              success: true,
              name: student.name,
              confidence,
            });
          }
        }
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
   * Renders bounding boxes and person nameplate directly respective to EACH face
   */
  renderFaces() {
    const { ctx, canvas } = this;
    if (!this.currentFaces || this.currentFaces.length === 0) return;

    for (const face of this.currentFaces) {
      const { box, isMatch, studentName, confidence } = face;

      // Handle mirroring transformation
      const boxW = box.width;
      const boxH = box.height;
      const boxX = this.isMirrored ? (canvas.width - box.x - boxW) : box.x;
      const boxY = box.y;

      const cornerLength = Math.min(boxW, boxH) * 0.22;
      const isRosterEmpty = !this.roster || this.roster.length === 0;
      const themeColor = isMatch ? '#10b981' : isRosterEmpty ? '#f59e0b' : '#ef4444';

      ctx.save();

      // 1. Semi-transparent bounding box outline
      ctx.strokeStyle = isMatch
        ? 'rgba(16, 185, 129, 0.45)'
        : isRosterEmpty
        ? 'rgba(245, 158, 11, 0.45)'
        : 'rgba(239, 68, 68, 0.40)';
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
      if (isMatch && studentName) {
        const confPct = Math.round((confidence || 0.95) * 100);
        badgeText = `${studentName} • ${confPct}%`;
      } else if (isRosterEmpty) {
        badgeText = 'Roster Empty • Enroll in Roster';
      } else {
        badgeText = 'Unrecognized Face';
      }

      ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const textWidth = ctx.measureText(badgeText).width;
      const badgeW = textWidth + 24;
      const badgeH = 30;
      const badgeX = Math.max(8, Math.min(canvas.width - badgeW - 8, boxX + (boxW - badgeW) / 2));
      const badgeY = boxY - 38 > 8 ? boxY - 38 : boxY + boxH + 10;

      // Badge pill background
      ctx.fillStyle = isMatch
        ? 'rgba(6, 78, 59, 0.95)'
        : isRosterEmpty
        ? 'rgba(120, 53, 15, 0.95)'
        : 'rgba(127, 29, 29, 0.95)';
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 15);
      ctx.fill();

      // Badge border
      ctx.strokeStyle = themeColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Glowing status dot
      ctx.fillStyle = themeColor;
      ctx.beginPath();
      ctx.arc(badgeX + 13, badgeY + badgeH / 2, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Name text
      ctx.fillStyle = '#ffffff';
      ctx.fillText(badgeText, badgeX + 24, badgeY + 20);

      ctx.restore();
    }
  }

  /**
   * Renders top notification banner for match feedback
   */
  drawTopFeedbackBanner() {
    if (!this.currentMatchFeedback) return;

    const { ctx, canvas } = this;
    const { success, name, confidence, message } = this.currentMatchFeedback;

    const bannerW = Math.min(canvas.width * 0.92, 460);
    const bannerH = 68;
    const bannerX = (canvas.width - bannerW) / 2;
    const bannerY = 20;

    ctx.save();
    ctx.fillStyle = success ? 'rgba(6, 78, 59, 0.96)' : 'rgba(127, 29, 29, 0.96)';
    ctx.beginPath();
    ctx.roundRect(bannerX, bannerY, bannerW, bannerH, 14);
    ctx.fill();

    ctx.strokeStyle = success ? '#34d399' : '#f87171';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Title / Verified name
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 17px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const titleText = success ? `Attendance Logged: ${name}` : 'Face Unrecognized';
    ctx.fillText(titleText, bannerX + 18, bannerY + 28);

    // Subtitle / confidence
    ctx.fillStyle = success ? '#a7f3d0' : '#fecaca';
    ctx.font = '13px sans-serif';
    const subText = success
      ? `Confidence: ${(confidence * 100).toFixed(1)}% • Real Biometrics Matched`
      : message || 'Face did not match any enrolled student roster';
    ctx.fillText(subText, bannerX + 18, bannerY + 50);

    ctx.restore();
  }
}
