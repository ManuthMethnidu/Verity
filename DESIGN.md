---
name: Verity Biometrics
description: Autonomous on-device facial recognition attendance platform
colors:
  canvas: "#090d16"
  surface: "#0f172a"
  surface-elevated: "#1e293b"
  border-subtle: "#1e293b"
  border-glass: "rgba(255, 255, 255, 0.08)"
  primary: "#10b981"
  primary-hover: "#059669"
  primary-surface: "rgba(16, 185, 129, 0.1)"
  text-primary: "#f8fafc"
  text-muted: "#94a3b8"
  text-faint: "#64748b"
  danger: "#ef4444"
  warning: "#f59e0b"
typography:
  display:
    fontFamily: "Geist, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Geist, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Geist, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Geist, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Geist Mono, ui-monospace, SFMono-Regular, monospace"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.025em"
rounded:
  sm: "0.5rem"
  md: "0.75rem"
  lg: "1rem"
  xl: "1.25rem"
  full: "9999px"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.canvas}"
    rounded: "{rounded.md}"
    padding: "0.625rem 1.25rem"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.surface-elevated}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
---

# Design System: Verity Biometrics

## Overview

**Creative North Star: "The Biometric Terminal"**

Verity embodies the clarity, restraint, and operational focus of an enterprise biometric terminal. Designed specifically for teachers navigating fast-paced classroom roll calls on handheld mobile devices, the visual language prioritizes immediate cognitive parsing over decorative noise. The interface presents a deep obsidian slate canvas layered with frosted titanium cards, hairline boundaries, and specular edge lighting, establishing an atmosphere of cryptographic security and technical precision.

Every layout balances dense computational telemetry (neural stability counts, FPS budgets, 128-D vector distances) with generous touch targets (min 44px). The design rejects saturated neon themes, gratuitous particle animations, and distracting decorative glows in favor of understated utility. Information density is calibrated so teachers can confirm student identity from three feet away with a single glance.

**Key Characteristics:**
- **Atmospheric Obsidian Canvas:** Deep `#090D16` slate with ambient radial lighting eliminating flat UI fatigue.
- **Frosted Titanium Surfaces:** Glassmorphic translucent containers (`bg-slate-900/60`, `backdrop-blur-md`) with specular hairline rims (`ring-1 ring-white/[0.05]`).
- **Precision Signal Emerald:** High-contrast emerald accents used strictly as functional confirmation indicators and primary call-to-actions.
- **Bifurcated Typography:** Geist for tight, geometric UI typography paired with Geist Mono for technical biometric telemetry.

## Colors

The palette pairs an imposing obsidian dark foundation with high-visibility signal emerald, creating an undeniable visual hierarchy where user attention is drawn immediately to live verification feedback.

### Primary
- **Signal Emerald** (`#10B981`): The authoritative heartbeat of the system. Reserved strictly for verified facial matches, active camera engine telemetry badges, and primary interactive CTAs.

### Secondary
- **Teal / Slate Accent** (`#0D9488` / `#1E293B`): Used for secondary status pills, supporting system delegates, and inactive interactive cards.

### Neutral
- **Obsidian Slate (Canvas)** (`#090D16`): The non-reflective dark canvas background that minimizes screen battery drain on OLED mobile devices.
- **Frosted Titanium (Surface)** (`#0F172A` / `rgba(15, 23, 42, 0.6)`): Elevated card containers with backdrop blur.
- **Hairline Border** (`rgba(255, 255, 255, 0.08)` / `border-slate-800`): 1px geometric structural definition.
- **Crisp White (Primary Text)** (`#F8FAFC`): High-contrast readability for headings and student names.
- **Muted Slate (Secondary Text)** (`#94A3B8`): Subtext, labels, and contextual explanations.
- **Telemetry Faint** (`#64748B`): Inactive metrics and table delimiters.

### Named Rules
**The Signal Rarity Rule.** Signal Emerald is strictly rationed: it must cover ≤10% of any viewport. When emerald flashes or glows, it signifies verified identity or primary action; diluting it into general card backgrounds or passive illustrations destroys its operational urgency.

## Typography

**Display Font:** Geist Sans (fallback `-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif`)  
**Body Font:** Geist Sans (fallback `-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif`)  
**Telemetry/Mono Font:** Geist Mono (fallback `ui-monospace, SFMono-Regular, monospace`)

**Character:** A high-precision pairing uniting contemporary Swiss-style geometric sans letterforms with monospaced engineering telemetry.

### Hierarchy
- **Display** (Extra Bold 800, `2.25rem` / `36px`, letter-spacing `-0.025em`, line-height `1.15`): Product title (VERITY), hero banners, modal titles.
- **Headline** (Bold 700, `1.5rem` / `24px`, letter-spacing `-0.02em`, line-height `1.25`): Page titles, section headers.
- **Title** (Semi-Bold 600, `1.125rem` / `18px`, letter-spacing `-0.01em`, line-height `1.35`): Card titles, modal subheads, student names in cards.
- **Body** (Regular 400, `0.875rem` / `14px`, normal letter-spacing, line-height `1.5`): Explanatory copy, table cells, form labels. Max line length 65ch.
- **Label / Telemetry** (Medium 500, `0.75rem` / `12px`, letter-spacing `0.025em`, line-height `1.4`): FPS counts, latency in milliseconds, 128-D confidence percentages, student ID codes, device hashes.

### Named Rules
**The Telemetry Mono Rule.** Any value generated by or supplied to a machine model—including confidence scores, FPS rates, millisecond latency, student IDs, timestamps, and API hashes—must be rendered in Geist Mono. Human names and editorial instructions must render in Geist Sans.

## Layout

- **Spatial Model:** 8pt base grid (`spacing.xs: 4px`, `spacing.sm: 8px`, `spacing.md: 16px`, `spacing.lg: 24px`, `spacing.xl: 32px`).
- **Container Architecture:** Centered max-width constraints (`max-w-7xl` for full operational views, `max-w-3xl` for settings, `max-w-md` for authentication cards).
- **Navigation Layout:** Persistent sticky top frosted glass header (`h-16`) paired with a floating bottom quick-action dock (`FloatingDock` desktop, `PillNav` mobile) positioned at `bottom-5`.
- **Rhythm & Padding:** Generous vertical breathing room (`pb-36` on main viewports to prevent dock clipping; `p-6` to `p-8` inside primary cards).

## Elevation & Depth

Verity conveys depth through tonal layering, frosted glassmorphism, and specular perimeter highlights rather than heavy muddy drop shadows.

### Shadow Vocabulary
- **Subtle Surface** (`shadow-sm` / `0 1px 2px 0 rgba(0, 0, 0, 0.05)`): Standard resting card elevation.
- **Dock Elevation** (`shadow-[0_20px_50px_rgba(0,0,0,0.65)]`): Floating bottom quick dock and modal dialogs.
- **Active Accent Glow** (`shadow-[0_0_12px_rgba(16,185,129,0.25)]`): Active navigation pill and camera tracking confirmation box.

### Named Rules
**The Specular Highlight Rule.** Translucent glass cards must feature a 1px inner specular top rim (`ring-1 ring-inset ring-white/[0.05]`). This simulates light striking precision-milled glass edges, differentiating overlapping layers without muddy ambient drop shadows.

## Shapes

- **Corner Radii:**
  - Outer cards and dialogs: `rounded-2xl` (`1rem` / `16px`)
  - Buttons, inputs, and list rows: `rounded-xl` (`0.75rem` / `12px`)
  - Badges and status pills: `rounded-full` (`9999px`)
- **Borders:** Clean hairline strokes (`1px solid rgba(255,255,255,0.08)` or `border-slate-800/80`). Thick borders (>2px) are banned except for dashed drop zones.

## Components

### Buttons
- **Shape:** `rounded-xl` (`12px`)
- **Primary:** Solid Signal Emerald fill (`bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-5 py-2.5 shadow-sm active:scale-[0.98] transition-all duration-200`).
- **Secondary / Ghost:** Dark slate surface with hairline border (`bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 font-semibold px-4 py-2.5 transition-all`).
- **Danger:** Subdued red translucent surface (`bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30`).

### Cards / Containers
- **Corner Style:** `rounded-2xl` (`16px`)
- **Background:** `bg-slate-900/60` with `backdrop-blur-md`
- **Border:** `border border-slate-800/80` with `ring-1 ring-white/[0.05]`
- **Internal Padding:** `p-5` to `p-6`

### Inputs / Fields
- **Style:** Deep slate fill (`bg-slate-950/70 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500`).
- **Focus:** Sharp emerald focus ring (`focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20`).

### Navigation
- **Header:** Sticky top `h-16`, `bg-[#090d16]/85 backdrop-blur-md border-b border-slate-800/80`.
- **Dock:** Floating bottom dock centered with `lucide-react` icons and spring hover magnification.

### Telemetry Badge (Signature Component)
- **Style:** `rounded-full px-2.5 py-0.5 text-xs font-mono font-medium`. Green pulse animation indicator (`animate-ping`) when live edge vision loop is processing frames.

## Do's and Don'ts

### Do:
- **Do** format all confidence scores (`95.4%`), latency numbers (`32 ms`), and student IDs in `font-mono`.
- **Do** provide smooth active touch compression feedback (`active:scale-[0.98]`) on all interactive buttons.
- **Do** maintain high contrast between text (`text-slate-100` / `text-white`) and dark surfaces (`#090D16` / `#0F172A`).
- **Do** preserve camera viewport aspect ratios (4:3 on mobile portrait, 16:9 on landscape/desktop) to prevent aspect stretching.
- **Do** ensure all tap targets on mobile measure at least 44px in height or width.

### Don't:
- **Don't** use neon green text for large paragraphs or standard card backgrounds; reserve emerald for verified status and primary actions.
- **Don't** use harsh solid `#000000` pitch black; always use obsidian slate `#090D16`.
- **Don't** place loud multi-colored rainbow gradients across cards or buttons.
- **Don't** drop below 12px font size for any critical biometric or attendance metadata.
- **Don't** use retro pixelated icons in production navigation; standardize on clean vector line icons from `lucide-react`.
