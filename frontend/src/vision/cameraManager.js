/**
 * CameraManager handles camera stream acquisition, resolution clamping,
 * frame-rate negotiation, device enumeration, and clean teardown.
 */

export class CameraManager {
  constructor() {
    this.stream = null;
    this.videoElement = null;
    this.facingMode = 'user';
    this.currentDeviceId = null;
  }

  /**
   * Initializes front-facing camera with target FPS & max 640x480 resolution
   * @param {HTMLVideoElement} videoElement
   * @param {object} options - { targetFps, batterySaver, deviceId, facingMode }
   */
  async start(videoElement, options = {}) {
    if (!videoElement) {
      throw new Error('Video element is required to start camera stream.');
    }
    this.stop(); // Clean up existing stream

    this.videoElement = videoElement;
    if (options.facingMode) this.facingMode = options.facingMode;
    if (options.deviceId) this.currentDeviceId = options.deviceId;

    // Frame rate negotiation: battery saver clamps FPS to <= 30
    let requestedFps = options.targetFps || 30;
    if (options.batterySaver && requestedFps > 30) {
      requestedFps = 30;
    }

    const videoConstraints = {
      width: { ideal: 640, max: 640 },
      height: { ideal: 480, max: 480 },
      frameRate: { ideal: requestedFps, max: requestedFps },
    };

    if (this.currentDeviceId) {
      videoConstraints.deviceId = { exact: this.currentDeviceId };
    } else {
      videoConstraints.facingMode = { ideal: this.facingMode };
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: false,
      });

      this.videoElement.srcObject = this.stream;
      this.videoElement.setAttribute('playsinline', 'true');
      this.videoElement.muted = true;

      await new Promise((resolve) => {
        if (this.videoElement.readyState >= 2) {
          resolve();
        } else {
          const timeout = setTimeout(resolve, 1500);
          this.videoElement.onloadedmetadata = () => {
            clearTimeout(timeout);
            resolve();
          };
        }
      });

      try {
        await this.videoElement.play();
      } catch (playErr) {
        console.warn('Video element play() caught (autoplay policy or already playing):', playErr);
      }

      const track = this.stream.getVideoTracks()[0];
      const settings = track ? track.getSettings() : {};

      return {
        success: true,
        stream: this.stream,
        width: settings.width || this.videoElement.videoWidth || 640,
        height: settings.height || this.videoElement.videoHeight || 480,
        fps: settings.frameRate || requestedFps,
        deviceId: settings.deviceId || 'front-cam',
      };
    } catch (err) {
      console.error('CameraManager failed to start camera:', err);
      throw err;
    }
  }

  /**
   * Stops camera stream and releases media tracks
   */
  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }
  }

  /**
   * Toggles between front ('user') and back ('environment') camera
   */
  async toggleFacingMode(options = {}) {
    this.facingMode = this.facingMode === 'user' ? 'environment' : 'user';
    this.currentDeviceId = null;
    if (this.videoElement) {
      return this.start(this.videoElement, { ...options, facingMode: this.facingMode });
    }
  }

  /**
   * Returns list of connected video input devices
   */
  static async getDevices() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        return [];
      }
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter((d) => d.kind === 'videoinput');
    } catch (err) {
      console.warn('Could not enumerate video devices:', err);
      return [];
    }
  }
}
