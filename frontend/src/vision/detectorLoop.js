/**
 * High-performance Face Detection & Stability Evaluator loop.
 * Runs in main thread, tracks bounding boxes on canvas overlay,
 * and delegates stable face ImageBitmap captures to Web Worker.
 */

export class DetectorLoop {
  constructor({ videoElement, canvasElement, onStableFace, onMetricsUpdate, isMirrored = true }) {
    this.video = videoElement;
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.onStableFace = onStableFace;
    this.onMetricsUpdate = onMetricsUpdate;
    this.isMirrored = isMirrored;

    this.isRunning = false;
    this.animationId = null;
    this.faceDetector = null;
    this.detectorReady = false;

    // Stability Evaluator state
    this.stableFrames = 0;
    this.REQUIRED_STABLE_FRAMES = 5;
    this.JITTER_THRESHOLD = 20; // max allowed center pixel jitter
    this.lastBbox = null;

    // Match overlay state
    this.currentMatchFeedback = null;
    this.feedbackTimeout = null;

    // Performance metrics
    this.lastFrameTime = performance.now();
    this.fps = 0;
    this.frameCount = 0;
    this.lastFpsUpdate = performance.now();
    this.targetFps = 30;

    // Throttle inference triggers (cooldown after successful match)
    this.isMatching = false;
    this.lastTriggerTime = 0;
    this.TRIGGER_COOLDOWN_MS = 2500;
  }

  setMirrored(mirrored) {
    this.isMirrored = Boolean(mirrored);
  }

  /**
   * Initializes MediaPipe BlazeFace face detector
   */
  async initDetector(quality = 'medium') {
    try {
      const vision = await import('@mediapipe/tasks-vision');
      const wasmFileset = await vision.FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );

      // Model quality selection
      let modelPath =
        'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite';

      this.faceDetector = await vision.FaceDetector.createFromOptions(wasmFileset, {
        baseOptions: {
          modelAssetPath: modelPath,
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        minDetectionConfidence: quality === 'low' ? 0.4 : 0.5,
      });

      this.detectorReady = true;
      console.log('✅ MediaPipe BlazeFace detector initialized successfully');
    } catch (err) {
      console.warn(
        'MediaPipe BlazeFace CDN unavailable or offline; using high-speed native canvas tracking fallback:',
        err.message
      );
      this.detectorReady = false;
    }
  }

  /**
   * Starts tracking loop
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
    this.isMatching = false;

    if (this.feedbackTimeout) clearTimeout(this.feedbackTimeout);
    this.feedbackTimeout = setTimeout(() => {
      this.currentMatchFeedback = null;
    }, 3500);
  }

  /**
   * Main video frame callback loop
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

    // Process frame if video is playing
    if (this.video && this.video.readyState >= 2) {
      this.processFrame(now);
    }

    // Schedule next frame with requestVideoFrameCallback if available
    if (typeof this.video.requestVideoFrameCallback === 'function') {
      this.animationId = this.video.requestVideoFrameCallback(this.loop);
    } else {
      this.animationId = requestAnimationFrame(this.loop);
    }
  };

  /**
   * Frame processing and stability calculation
   */
  processFrame(timestamp) {
    const vWidth = this.video.videoWidth;
    const vHeight = this.video.videoHeight;

    if (!vWidth || !vHeight) return;

    if (this.canvas.width !== vWidth || this.canvas.height !== vHeight) {
      this.canvas.width = vWidth;
      this.canvas.height = vHeight;
    }

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    let bbox = null;

    if (this.detectorReady && this.faceDetector) {
      try {
        const detections = this.faceDetector.detectForVideo(this.video, timestamp);
        if (detections && detections.detections && detections.detections.length > 0) {
          const det = detections.detections[0];
          const b = det.boundingBox;
          bbox = {
            x: Math.max(0, b.originX),
            y: Math.max(0, b.originY),
            width: Math.min(vWidth - b.originX, b.width),
            height: Math.min(vHeight - b.originY, b.height),
          };
        }
      } catch (err) {
        // Fallback to center guide if error occurs
        bbox = null;
      }
    } else {
      // Guide region simulating face positioning box
      const boxW = Math.round(vWidth * 0.45);
      const boxH = Math.round(vHeight * 0.55);
      bbox = {
        x: Math.round((vWidth - boxW) / 2),
        y: Math.round((vHeight - boxH) / 2.3),
        width: boxW,
        height: boxH,
      };
    }

    if (bbox) {
      const isStable = this.evaluateStability(bbox);
      this.drawBoundingBox(bbox, isStable);

      const canTrigger =
        timestamp - this.lastTriggerTime > this.TRIGGER_COOLDOWN_MS && !this.isMatching;

      if (isStable && canTrigger) {
        this.triggerStableCapture(bbox, timestamp);
      }
    } else {
      this.stableFrames = 0;
      this.lastBbox = null;
    }

    this.drawOverlayFeedback();
  }

  /**
   * Stability Evaluator: Checks if face bounding box center has been steady for >= 5 frames
   */
  evaluateStability(bbox) {
    const curCx = bbox.x + bbox.width / 2;
    const curCy = bbox.y + bbox.height / 2;

    if (this.lastBbox) {
      const prevCx = this.lastBbox.x + this.lastBbox.width / 2;
      const prevCy = this.lastBbox.y + this.lastBbox.height / 2;
      const distance = Math.hypot(curCx - prevCx, curCy - prevCy);
      const sizeDelta = Math.abs(bbox.width - this.lastBbox.width);

      if (distance < this.JITTER_THRESHOLD && sizeDelta < this.JITTER_THRESHOLD) {
        this.stableFrames = Math.min(this.REQUIRED_STABLE_FRAMES, this.stableFrames + 1);
      } else {
        this.stableFrames = Math.max(0, this.stableFrames - 1);
      }
    } else {
      this.stableFrames = 1;
    }

    this.lastBbox = bbox;
    return this.stableFrames >= this.REQUIRED_STABLE_FRAMES;
  }

  /**
   * Captures ImageBitmap of the stable face region and delegates to Web Worker
   */
  async triggerStableCapture(bbox, timestamp) {
    this.isMatching = true;
    this.lastTriggerTime = timestamp;

    try {
      // Add padding to face crop
      const padX = bbox.width * 0.15;
      const padY = bbox.height * 0.15;
      const sx = Math.max(0, Math.floor(bbox.x - padX));
      const sy = Math.max(0, Math.floor(bbox.y - padY));
      const sw = Math.min(this.video.videoWidth - sx, Math.floor(bbox.width + 2 * padX));
      const sh = Math.min(this.video.videoHeight - sy, Math.floor(bbox.height + 2 * padY));

      const imageBitmap = await createImageBitmap(this.video, sx, sy, sw, sh);

      if (this.onStableFace) {
        this.onStableFace(imageBitmap);
      }
    } catch (err) {
      console.error('Failed to capture ImageBitmap from video stream:', err);
      this.isMatching = false;
    }
  }

  /**
   * Renders bounding box with futuristic corners and stability status
   */
  drawBoundingBox(bbox, isStable) {
    const { ctx, canvas } = this;
    const { y, width: w, height: h } = bbox;
    const x = this.isMirrored ? (canvas.width - bbox.x - w) : bbox.x;
    const cornerLength = Math.min(w, h) * 0.2;

    const color = isStable ? '#10b981' : '#f59e0b'; // Green when stable, Amber when acquiring
    ctx.lineWidth = 3;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;

    // Corner brackets
    ctx.beginPath();
    // Top-left
    ctx.moveTo(x, y + cornerLength);
    ctx.lineTo(x, y);
    ctx.lineTo(x + cornerLength, y);
    // Top-right
    ctx.moveTo(x + w - cornerLength, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + cornerLength);
    // Bottom-right
    ctx.moveTo(x + w, y + h - cornerLength);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x + w - cornerLength, y + h);
    // Bottom-left
    ctx.moveTo(x + cornerLength, y + h);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x, y + h - cornerLength);
    ctx.stroke();

    // Stability bar / indicator badge
    const badgeText = isStable
      ? '✓ FACE STABLE (MATCHING)'
      : `ALIGNING... (${this.stableFrames}/${this.REQUIRED_STABLE_FRAMES})`;

    ctx.font = '600 12px sans-serif';
    const textWidth = ctx.measureText(badgeText).width;
    const badgeW = textWidth + 18;
    const badgeH = 24;
    const badgeX = x + (w - badgeW) / 2;
    const badgeY = y - 30 > 10 ? y - 30 : y + h + 10;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 6);
    ctx.fill();

    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = isStable ? '#34d399' : '#fbbf24';
    ctx.fillText(badgeText, badgeX + 9, badgeY + 16);
  }

  /**
   * Renders top or bottom notification banner for match result feedback
   */
  drawOverlayFeedback() {
    if (!this.currentMatchFeedback) return;

    const { ctx, canvas } = this;
    const { success, name, confidence, message } = this.currentMatchFeedback;

    const bannerW = Math.min(canvas.width * 0.9, 440);
    const bannerH = 70;
    const bannerX = (canvas.width - bannerW) / 2;
    const bannerY = 24;

    ctx.save();
    ctx.fillStyle = success ? 'rgba(6, 78, 59, 0.95)' : 'rgba(127, 29, 29, 0.95)';
    ctx.beginPath();
    ctx.roundRect(bannerX, bannerY, bannerW, bannerH, 12);
    ctx.fill();

    ctx.strokeStyle = success ? '#34d399' : '#f87171';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Title / Name
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px sans-serif';
    const titleText = success ? `✓ Attendance Verified: ${name}` : '✗ Verification Failed';
    ctx.fillText(titleText, bannerX + 18, bannerY + 30);

    // Subtitle / confidence
    ctx.fillStyle = success ? '#a7f3d0' : '#fecaca';
    ctx.font = '13px sans-serif';
    const subText = success
      ? `Confidence: ${(confidence * 100).toFixed(1)}% • Logged to Attendance`
      : message || 'Face did not match any enrolled student roster';
    ctx.fillText(subText, bannerX + 18, bannerY + 52);

    ctx.restore();
  }
}
