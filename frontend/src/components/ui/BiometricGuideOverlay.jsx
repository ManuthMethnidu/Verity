import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Info, AlertCircle, Sparkles } from 'lucide-react';

/**
 * Radial Ticks Biometric Circle Guide (Meta / Yoti / Apple Face ID style).
 * Renders 64 radiating tick-marks around the circular camera frame.
 * Ticks illuminate in vibrant emerald as the user turns to each angle and completes the circle.
 */
// Precompute static radial tick coordinates once (viewBox 0 0 320 320, center 160 160)
const TOTAL_TICKS = 64;
const BASE_TICKS = Array.from({ length: TOTAL_TICKS }, (_, i) => {
  const angleDeg = (i * 360) / TOTAL_TICKS - 90;
  const angleRad = (angleDeg * Math.PI) / 180;
  const rInner = 118;
  const rOuter = 136;
  return {
    index: i,
    x1: 160 + rInner * Math.cos(angleRad),
    y1: 160 + rInner * Math.sin(angleRad),
    x2: 160 + rOuter * Math.cos(angleRad),
    y2: 160 + rOuter * Math.sin(angleRad),
    angleDeg,
  };
});

/**
 * Radial Ticks Biometric Circle Guide (Meta / Yoti / Apple Face ID style).
 * Renders 64 radiating tick-marks around the circular camera frame.
 * Optimized with precomputed coordinates & grouped GPU filter rasterization.
 */
export function BiometricGuideOverlay({
  step = 'front', // 'front' | 'left' | 'right'
  livePose = null,
  holdProgress = 0,
  capturedAngles = { front: null, left: null, right: null },
  isMirrored = true,
}) {
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

  const isFrontTick = (idx) => idx >= 54 || idx <= 10;
  const isRightTick = (idx) => idx >= 10 && idx <= 26;
  const isBottomTick = (idx) => idx >= 26 && idx <= 38;
  const isLeftTick = (idx) => idx >= 38 && idx <= 54;

  const ticks = BASE_TICKS.map((base) => {
    const i = base.index;
    let isLit = false;
    let isActiveSector = false;

    if (allCompleted) {
      isLit = true;
    } else {
      if (hasFront && isFrontTick(i)) isLit = true;
      if (hasLeft && isLeftTick(i)) isLit = true;
      if (hasRight && isRightTick(i)) isLit = true;

      // When bottom ticks connect after front, left, or right are captured
      if (hasLeft && hasRight && isBottomTick(i)) isLit = true;

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
      ...base,
      isLit,
      isActiveSector,
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
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Group unlit / base ticks without filter */}
        <g strokeLinecap="round">
          {ticks
            .filter((t) => !t.isLit)
            .map((tick) => {
              const strokeColor = tick.isActiveSector
                ? isTargetMatched
                  ? '#34d399'
                  : 'rgba(16, 185, 129, 0.45)'
                : 'rgba(148, 163, 184, 0.25)';
              const strokeW = tick.isActiveSector ? 3 : 2.5;

              return (
                <line
                  key={tick.index}
                  x1={tick.x1}
                  y1={tick.y1}
                  x2={tick.x2}
                  y2={tick.y2}
                  stroke={strokeColor}
                  strokeWidth={strokeW}
                  className="transition-colors duration-150"
                />
              );
            })}
        </g>

        {/* Group illuminated ticks under single GPU filter pass */}
        <g filter="url(#tick-glow)" stroke="#10b981" strokeWidth="3.5" strokeLinecap="round">
          {ticks
            .filter((t) => t.isLit)
            .map((tick) => (
              <line
                key={tick.index}
                x1={tick.x1}
                y1={tick.y1}
                x2={tick.x2}
                y2={tick.y2}
                className="transition-colors duration-150"
              />
            ))}
        </g>
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
