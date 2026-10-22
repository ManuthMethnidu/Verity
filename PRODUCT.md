# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary Users:** Classroom teachers, lecturers, and institutional proctors operating roll-call check-in directly from mobile smartphones and handheld tablets during class periods.
- **Secondary Users:** School and academic department administrators managing student rosters, tenant configuration, compliance policies, and attendance reporting.

## Product Purpose

Verity enables autonomous, near-instantaneous classroom attendance verification using on-device neural facial recognition. It exists to eliminate manual roll calls, prevent proxy check-ins, and maintain attendance logging even under unstable or absent institutional network conditions. Success is defined as sub-second student face verification (<50ms inference latency) with zero UI freezing, offline continuity, and frictionless mobile one-handed operation.

## Positioning

Unlike cloud-dependent biometric platforms that stream raw video feeds to centralized servers (introducing severe latency, privacy vulnerabilities, and bandwidth congestion), Verity executes BlazeFace detection and 128-D vector extraction directly on the client device via WebGL2/WASM-SIMD. Reference 128-D embedding vectors sync securely across the tenant cloud so a student enrolled once roams seamlessly across every teacher's handheld scanner on campus, while raw camera imagery remains strictly ephemeral on-device.

## Operating Context

- **Physical Scene:** Mobile web application held in hand by teachers at classroom doorways or walking down lecture aisles during roll call.
- **Environmental Constraints:** Variable classroom lighting, noisy corridors, handheld camera jitter, battery depletion concerns during multi-period teaching schedules, and spotty institutional Wi-Fi.
- **Workflow:** 
  1. Teacher authenticates into institutional tenant portal on smartphone.
  2. Local student roster and 128-D reference embeddings download to client IndexedDB storage.
  3. Front or back camera scans faces in real time; on 5 consecutive stable frames, the cosine matcher verifies identity against the local roster.
  4. Attendance event is recorded immediately into offline IndexedDB queue, marked with device token and confidence score, and background-synced to server.

## Capabilities and Constraints

- **On-Device Edge Vision:** MediaPipe BlazeFace detection running on requestVideoFrameCallback, with 128-D embedding vector extraction offloaded to Web Workers via ONNX Runtime Web / Face-API.
- **Camera Management:** Clamped 640x480 resolution to safeguard mobile frame budgets; toggleable front/back facing camera; horizontal reflection mirror toggle.
- **Hybrid Biometric Roaming:** Reference 128-D neural embeddings sync to the central PostgreSQL/SQLite database; raw video frames are never archived or transmitted.
- **Offline-First Synchronization:** Full roster cached in IndexedDB; verified attendance events queue locally and auto-sync to `/api/attendance` upon network reconnection.
- **Multi-Tenant Administration:** Dedicated tenant isolation (`/api/attendance/feed/:tenantId`) with institution-specific rosters, credentials, and real-time JSON/CSV exports.
- **Power & Thermal Budgeting:** Built-in Battery Saver mode clamping target FPS to 30 to prevent mobile thermal throttling.

## Brand Commitments

- **Brand Name:** VERITY
- **Tagline:** Multi-Tenant Biometric Platform
- **Visual Identity Foundations:** Deep Slate (`#090D16`), Precision Emerald (`#10B981`), frosted glassmorphism (`backdrop-blur-md`), and high-contrast solid action CTAs.
- **Typography:** Geist (clean sans for UI and headings) paired with Geist Mono for biometric telemetry, FPS, confidence percentages, and student IDs.

## Evidence on Hand

- Fully functional monorepo with Express backend (`backend/src`), Prisma ORM (`backend/prisma/schema.prisma`), and React 19 frontend (`frontend/src`).
- Verified cosine similarity unit test suite (`backend/tests/matcher.test.js` passing 6/6 tests).
- Complete OpenAPI 3.0 REST specification (`api.yaml`) and PostgreSQL production DDL schema (`schema.sql`).
- Benchmark harness (`scripts/benchmark.js`) asserting latency and frame budget compliance.

## Product Principles

1. **Edge-First Biometric Privacy:** Raw camera video frames are processed transiently in memory and never leave the handheld client.
2. **Offline Resilience Over Network Reliability:** A teacher must never be prevented from taking attendance due to institutional Wi-Fi drops or captive portal timeouts.
3. **Respect Mobile Frame & Battery Budgets:** Maintain smooth UI responsiveness and prevent device heating during continuous camera sessions.
4. **Instant Trust & Verifiable Proof:** Every attendance log must capture timestamp, device origin, and mathematical confidence score for transparent auditability.

## Accessibility & Inclusion

- Multi-scale face anchor density (Low, Medium, High detector delegates) to reliably accommodate diverse student facial structures, lighting conditions, and camera angles.
- High-contrast visual cues (AA/AAA compliant status badges and audio feedback pings) confirming identification without requiring the teacher to squint at micro-text.
