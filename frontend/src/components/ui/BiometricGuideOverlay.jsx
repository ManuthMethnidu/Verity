import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Info, AlertCircle, Sparkles } from 'lucide-react';

/**
 * Radial Ticks Biometric Circle Guide (Meta / Yoti / Apple Face ID style).
 * Renders 64 radiating tick-marks around the circular camera frame.
 * Ticks illuminate in vibrant emerald as the user turns to each angle and completes the circle.
 */
export function BiometricGuideOverlay({
  step = 'front', // 'front' | 'left' | 'right'
  livePose = null,
  holdProgress = 0,
  capturedAngles = { front: null, left: null, right: null },
  isMirrored = true,
}) {
  const TOTAL_TICKS = 64;

  const hasFront = Boolean(capturedAngles.front);
  const hasLeft = Boolean(capturedAngles.left);
  const hasRight = Boolean(capturedAngles.right);
  const allCompleted = hasFront && hasLeft && hasRight;

  const isTargetMatched =
    livePose &&
    ((step === 'front' && livePose.isFront) ||
      (step === 'left' && livePose.isLeftProfile) ||
      (step === 'right' && livePose.isRightProfile));

  const isOverrotated = livePose && livePose.pose === 'overrotated';

  // Sector mappings for 64 ticks (index 0 is at 12 o'clock, clockwise):
  // Top / Front: indices 54..63 and 0..10 (approx 21 ticks)
  // Right Profile: indices 10..26 (approx 17 ticks on right, ~3 o'clock)
  // Bottom: indices 26..38 (approx 13 ticks at 6 o'clock)
  // Left Profile: indices 38..54 (approx 17 ticks on left, ~9 o'clock)
  const isFrontTick = (idx) => idx >= 54 || idx <= 10;
  const isRightTick = (idx) => idx >= 10 && idx <= 26;
  const isBottomTick = (idx) => idx >= 26 && idx <= 38;
  const isLeftTick = (idx) => idx >= 38 && idx <= 54;

  // Generate radial tick coordinates
  // viewBox="0 0 320 320", center at (160, 160)
  // Inner radius: 114, Outer radius: 130 (length 16px)
  const ticks = Array.from({ length: TOTAL_TICKS }, (_, i) => {
    const angleDeg = (i * 360) / TOTAL_TICKS - 90; // 0 deg is top center
    const angleRad = (angleDeg * Math.PI) / 180;
    const rInner = 118;
    const rOuter = 136;

    const x1 = 160 + rInner * Math.cos(angleRad);
    const y1 = 160 + rInner * Math.sin(angleRad);
    const x2 = 160 + rOuter * Math.cos(angleRad);
    const y2 = 160 + rOuter * Math.sin(angleRad);

    // Determine if this tick is illuminated
    let isLit = false;
    let isActiveSector = false;

    if (allCompleted) {
      isLit = true;
    } else {
      if (hasFront && isFrontTick(i)) isLit = true;
      if (hasLeft && isLeftTick(i)) isLit = true;
      if (hasRight && isRightTick(i)) isLit = true;

      // When bottom ticks connect after front, left, or right are captured
      if ((hasLeft && hasRight) && isBottomTick(i)) isLit = true;

      // Active step sector highlighting
      if (step === 'front' && isFrontTick(i)) {
        isActiveSector = true;
        if (isTargetMatched) isLit = true;
      } else if (step === 'left' && isLeftTick(i)) {
        isActiveSector = true;
        if (isTargetMatched) isLit = true;
      } else if (step === 'right' && isRightTick(i)) {
        isActiveSector = true;
        if (isTargetMatched) isLit = true;
      }
    }

    return {
      index: i,
      x1,
      y1,
      x2,
      y2,
      isLit,
      isActiveSector,
      angleDeg,
    };
  });

  return (
    <div className="absolute inset-0 pointer-events-none select-none flex items-center justify-center">
      {/* SVG Radiating Ticks Ring */}
      <svg
        className="w-full h-full overflow-visible"
        viewBox="0 0 320 320"
        fill="none"
      >
        <defs>
          <filter id="tick-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Render all 64 radiating ticks */}
        {ticks.map((tick) => {
          let strokeColor = 'rgba(148, 163, 184, 0.25)'; // Faint gray by default
          let strokeW = 2.5;
          let filter = undefined;

          if (tick.isLit) {
            strokeColor = '#10b981'; // Vibrant emerald green
            strokeW = 3.5;
            filter = 'url(#tick-glow)';
          } else if (tick.isActiveSector) {
            // Pulse active target sector in amber/emerald to visually guide user
            strokeColor = isTargetMatched ? '#34d399' : 'rgba(16, 185, 129, 0.45)';
            strokeW = 3;
          }

          return (
            <line
              key={tick.index}
              x1={tick.x1}
              y1={tick.y1}
              x2={tick.x2}
              y2={tick.y2}
              stroke={strokeColor}
              strokeWidth={strokeW}
              strokeLinecap="round"
              filter={filter}
              className="transition-colors duration-200"
            />
          );
        })}
      </svg>

      {/* Target Gate Arc Indicator (sweeps towards left/right) */}
      {!allCompleted && !isTargetMatched && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {step === 'left' && (
            <motion.div
              className="absolute left-1 sm:left-2 flex items-center text-emerald-400 drop-shadow-[0_0_12px_rgba(16,185,129,0.9)]"
              animate={{ x: [6, -8, 6], opacity: [0.4, 1, 0.4] }}
              transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
            >
              <svg width="28" height="40" viewBox="0 0 28 40" fill="none">
                <path d="M 22 6 L 8 20 L 22 34" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M 28 10 L 16 20 L 28 30" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
              </svg>
            </motion.div>
          )}

          {step === 'right' && (
            <motion.div
              className="absolute right-1 sm:right-2 flex items-center text-emerald-400 drop-shadow-[0_0_12px_rgba(16,185,129,0.9)]"
              animate={{ x: [-6, 8, -6], opacity: [0.4, 1, 0.4] }}
              transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
            >
              <svg width="28" height="40" viewBox="0 0 28 40" fill="none">
                <path d="M 6 6 L 20 20 L 6 34" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M 0 10 L 12 20 L 0 30" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
              </svg>
            </motion.div>
          )}
        </div>
      )}

      {/* Center Lock Status Pill / Warning Badge */}
      <div className="absolute z-20 flex flex-col items-center pointer-events-none">
        <AnimatePresence mode="wait">
          {isTargetMatched && !allCompleted ? (
            <motion.div
              key="locked"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-emerald-950/90 border border-emerald-400 px-3.5 py-1 rounded-full backdrop-blur-md shadow-[0_0_20px_rgba(16,185,129,0.5)] flex items-center gap-1.5"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-[11px] font-bold text-emerald-300 font-mono tracking-wider">
                HOLD STILL {holdProgress > 0 ? `(${holdProgress}%)` : ''}
              </span>
            </motion.div>
          ) : isOverrotated ? (
            <motion.div
              key="overrotated"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-rose-950/90 border border-rose-500/80 px-3 py-1 rounded-full backdrop-blur-md shadow-[0_0_20px_rgba(244,63,94,0.5)] flex items-center gap-1.5"
            >
              <AlertCircle className="w-3 h-3 text-rose-400" />
              <span className="text-[10px] font-bold text-rose-300 font-mono">
                TURN SLIGHTLY BACK
              </span>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {/* Screen Shutter Flash on Auto-Snap Capture */}
      {holdProgress >= 95 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="absolute inset-0 bg-white rounded-full pointer-events-none z-30"
        />
      )}
    </div>
  );
}
