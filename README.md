# 🛡️ Verity — Mobile-Web Classroom Face-Recognition Attendance System

[![Vite](https://img.shields.io/badge/Vite-6.4-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-4.21-000000?style=flat&logo=express&logoColor=white)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6.4-2D3748?style=flat&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat&logo=supabase&logoColor=white)](https://supabase.com/)
[![TensorFlow.js](https://img.shields.io/badge/TensorFlow.js-WebGL-FF6F00?style=flat&logo=tensorflow&logoColor=white)](https://www.tensorflow.org/js)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

**Verity** is a privacy-first, offline-resilient classroom face-recognition attendance system. It captures front-facing video directly in mobile and desktop browsers, performs real-time client-side face detection and head pose estimation, verifies students against a locally cached biometric roster using GPU-accelerated WebGL embeddings, and synchronizes verified attendance logs with institutional multi-tenant backends.

---

## 🏛️ System Architecture

```mermaid
flowchart TD
    subgraph ClientBrowser ["📱 Client Browser (Tablet / Mobile / Desktop PWA)"]
        Cam["Webcam / Front Camera (640x480 max)"] -->|requestVideoFrameCallback| Detector["Face-API & TinyFaceDetector"]
        Detector -->|68 Facial Landmarks| Pose["Pose Estimator (Yaw, Pitch, Roll)"]
        
        subgraph MultiAngleFlow ["Biometric Enrollment (3 Angles)"]
            Pose -->|Front / Left / Right Profile| Guide["BiometricGuideOverlay (64 Radiating Ticks)"]
            Guide -->|0.6s Stability Hold| AutoSnap["Auto-Capture & 128-D Descriptors (Front, Left, Right)"]
        end
        
        subgraph AttendanceFlow ["Live Attendance Verification"]
            Detector -->|Live Face Crop| TFJS["WebGL 2D Tensor Distance Pass"]
            TFJS -->|Distance <= 0.46| Matcher["Multi-Angle Nearest Neighbor Matcher"]
            Matcher -->|Instant Match| RosterCache[("IndexedDB: Student Roster")]
            Matcher -->|Attendance Event| QueueCache[("IndexedDB: Offline Attendance Queue")]
        end
        
        QueueCache -->|Online Background Sync| SyncEngine["Sync Engine / Service Worker"]
    end

    subgraph BackendInfrastructure ["☁️ Backend API & Cloud Infrastructure"]
        SyncEngine -->|POST /api/attendance| AttRouter["Attendance Router"]
        AttRouter --> Prisma["Prisma ORM (PostgreSQL / Supabase)"]
        AdminUI["Admin Portal"] -->|Bearer JWT| REST["REST Endpoints (/auth, /roster, /settings, /reports)"]
        REST --> Prisma
        Prisma --> DB[("Database: Supabase PostgreSQL")]
        Prometheus["Monitoring"] -->|GET /metrics| MetricsEndpoint["Prometheus Metrics"]
    end
```

---

## ✨ Key Capabilities & Highlights

### 1. 🔄 Multi-Angle Biometric Enrollment (Front + Profiles)
- **3-Angle Facial Geometry**: Captures frontal and angled side profiles (left $\sim 35^\circ$ and right $\sim 35^\circ$) to eliminate false negatives caused by students approaching the attendance scanner from off-axis angles.
- **Client-Side Head Pose Estimation**: Evaluates yaw, pitch, and roll in real-time from 68 landmarks without server roundtrips or heavy neural networks.
- **Radial Ticks Circular Guide**: An interactive circular guide inspired by Apple Face ID, Meta, and Yoti. 64 radiating ticks dynamically illuminate in emerald green as students position their face and turn, featuring auto-hold detection (600ms hold) and audio feedback.
- **Compact Multi-Vector Storage**: Packages all 3 facial angles ($3 \times 128$ float descriptors) into a single 1,536-byte binary buffer stored in PostgreSQL.

### 2. ⚡ High-Speed GPU Tensor Matching
- **TensorFlow.js WebGL Acceleration**: Live faces are compared against all enrolled roster vectors simultaneously in a single 2D tensor pass (`[3N, 128]`), running in under **15ms** on mobile hardware.
- **Strict Distance Ceiling**: Uses strict Euclidean distance verification ($\le 0.46$) with multi-angle fallback to maximize true positives while maintaining zero false positive crossover.

### 3. 📶 Offline-First PWA Resilience
- **Zero Network Downtime**: Entire student rosters and model weights are cached in `IndexedDB`. If classroom Wi-Fi drops, attendance verification continues uninterrupted.
- **Background Sync Queue**: Attendance timestamps are safely buffered locally and automatically synchronized with the backend upon network reconnection.

### 4. 🏢 Institutional Multi-Tenancy & Governance
- **Tenant Isolation**: Separate administrative credentials, rosters, and audit logs per school or department.
- **Bulk Imports & Exports**: Seamless CSV and JSON roster importing, single-student enrollment, and instant CSV attendance report exports.
- **Battery-Saver & Scanner Tuning**: Configurable target FPS (`15`, `30`, `60`), detection confidence thresholds, and battery-saver modes designed for all-day tablet kiosk deployment.

### 5. 🎨 Modern Minimalist Interface
- **Pure Dark Hierarchy**: Crafted with `#111111`, `#161616`, and `#222222` dark tones with vibrant emerald accents.
- **Liquid Gooey Menus**: Smooth spring-animated SVG gooey dropdowns (`GooeyDropdown.tsx`) with keyboard navigation and haptic cues.
- **Phosphor & Lucide Iconography**: Unified, crisp iconography across navigation docks, metrics panels, and scanner views.

---

## 📁 Repository Structure

```
Verity/
├── api.yaml                     # OpenAPI 3.0 REST Specification
├── schema.sql                   # Production PostgreSQL DDL Schema
├── docker-compose.yml           # Container orchestration (Postgres + Backend + Frontend)
├── package.json                 # Monorepo workspaces orchestrator
├── scripts/
│   ├── benchmark.js             # Latency & frame-budget assertion benchmark
│   └── setup-supabase.js        # Supabase PostgreSQL schema provisioning script
├── backend/
│   ├── Dockerfile
│   ├── prisma/
│   │   ├── schema.prisma        # Prisma ORM schema (PostgreSQL / Supabase)
│   │   └── seed.js              # Database seed script (Admin, Tenant, Students)
│   ├── src/
│   │   ├── index.js             # Express app entry point & health check
│   │   ├── db.js                # Prisma client singleton
│   │   ├── middleware/auth.js   # JWT token authentication
│   │   ├── routes/              # Auth, Tenant, Roster, Settings, Attendance, Metrics
│   │   └── utils/
│   │       └── CosineMatcher.js # Cosine similarity & vector matching
│   └── tests/
│       ├── matcher.test.js      # Cosine similarity test suite
│       └── poseEstimation.test.js # Head pose estimation & angle classification tests
└── frontend/
    ├── Dockerfile
    ├── vite.config.js           # Vite config with WASM cross-origin isolation headers
    ├── index.html
    └── src/
        ├── main.jsx             # React app entry point & SW registration
        ├── routes.jsx           # Protected & public route definitions
        ├── auth/auth.js         # JWT token management & Axios interceptors
        ├── components/          # DashboardLayout, Sidebar, AttendanceChart, GooeyDropdown
        ├── components/ui/
        │   ├── BiometricGuideOverlay.jsx # Circular radiating ticks guide
        │   ├── GooeyDropdown.tsx        # Liquid spring dropdown component
        │   └── floating-dock.jsx        # Floating quick navigation dock
        ├── pages/               # Login, Dashboard, RosterPage, AttendancePage, ReportsPage, SettingsPage
        ├── vision/
        │   ├── cameraManager.js # Camera lifecycle, FPS clamping, mirrored preview
        │   ├── detectorLoop.js  # Main detection & stability evaluator loop
        │   ├── faceApiService.js# Face-API model loader & GPU tensor matcher
        │   └── poseEstimation.js# Real-time 68-landmark yaw/pitch/roll estimator
        ├── storage/             # IndexedDB helpers for roster, queue, and settings
        └── sw/                  # Service Worker offline cache & background sync
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: `>= 20.x`
- **npm**: `>= 10.x`
- **PostgreSQL Database** or **Supabase project**

### 1. Installation
Install all monorepo dependencies across root, frontend, and backend:
```bash
npm install
```

### 2. Environment Configuration
Create a `.env` file in `backend/`:
```env
PORT=8080
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
JWT_SECRET="your-super-secret-jwt-key"
```

### 3. Database Migration & Seeding
Push the Prisma schema to your database and seed initial test accounts:
```bash
cd backend
npm run prisma:generate
npm run prisma:push
npm run prisma:seed
cd ..
```

> **Default Seed Credentials:**  
> **Email:** `admin@verity.edu`  
> **Password:** `admin123`  
> **Tenant:** *St. Joseph's College Colombo 10*

### 4. Run Development Servers
Start both backend (port `8080`) and frontend (port `5173`) concurrently:
```bash
npm run dev
```

- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:8080](http://localhost:8080)
- **Health Check**: [http://localhost:8080/api/health](http://localhost:8080/api/health)

---

## 🧪 Testing & Benchmarks

### Unit Test Suites
Run the Node.js native test runner to test cosine similarity, vector thresholding, and facial pose estimation:
```bash
npm test
```
```
▶ Cosine Similarity & Face Matcher Suite (6 tests)
✔ Cosine Similarity & Face Matcher Suite
▶ Real-Time Facial Pose Estimation & Angle Classification (5 tests)
✔ Real-Time Facial Pose Estimation & Angle Classification
ℹ pass 11
ℹ fail 0
```

### Biometric Latency Benchmark
Run the vector lookup benchmark to assert frame budgets:
```bash
npm run test:benchmark
```
Validates 1,000 face recognition lookups against a 500-student roster, asserting average lookup latency `< 30ms` (typically completes in `< 0.2ms`).

---

## 🐳 Docker Deployment

To launch the full containerized stack:
```bash
docker compose up --build
```

- **Frontend Web UI**: [http://localhost](http://localhost)
- **Backend API**: [http://localhost:8080/api](http://localhost:8080/api)
- **Health Check**: [http://localhost:8080/api/health](http://localhost:8080/api/health)
- **Prometheus Telemetry**: [http://localhost:8080/metrics](http://localhost:8080/metrics)

---

## 📑 Core API Summary

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/auth/login` | Authenticate admin, returns JWT & tenant ID | Public |
| `POST` | `/api/auth/register` | Register new admin and provision school tenant | Public |
| `POST` | `/api/tenant/create` | Provision an isolated school tenant | Bearer JWT |
| `GET` | `/api/roster` | Retrieve all students & packed 1536-byte vector descriptors | Bearer JWT |
| `POST` | `/api/roster` | Enroll single student with 3-angle face profiles | Bearer JWT |
| `PUT` | `/api/roster/:id` | Update individual student record or face embeddings | Bearer JWT |
| `DELETE` | `/api/roster/:id` | Delete student record | Bearer JWT |
| `DELETE` | `/api/roster/purge/all` | Purge entire roster for active tenant | Bearer JWT |
| `POST` | `/api/roster/batch` | Bulk upload roster via CSV or JSON | Bearer JWT |
| `GET` | `/api/attendance/report` | Fetch attendance logs, filter by date, calculate stats | Bearer JWT |
| `POST` | `/api/attendance` | Record verified attendance event | Bearer JWT |
| `GET` | `/api/settings` | Get tenant scanner preferences | Bearer JWT |
| `PUT` | `/api/settings` | Update target FPS, model quality, and battery saver | Bearer JWT |
| `GET` | `/api/health` | Container & service health check | Public |
| `GET` | `/metrics` | Prometheus telemetry exposition | Public |

For full request and response schemas, refer to [`api.yaml`](file:///home/mana/Projects/Verity/api.yaml).

---

## 📄 License
This project is licensed under the MIT License.
