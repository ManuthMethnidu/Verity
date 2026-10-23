import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  UploadSimple as Upload,
  Plus,
  Trash as Trash2,
  PencilSimple as Edit2,
  DownloadSimple as HardDriveDownload,
  CheckCircle,
  WarningCircle as AlertCircle,
  MagnifyingGlass as Search,
  FileCsv as FileSpreadsheet,
  Camera,
  ArrowClockwise as RefreshCw,
  Sparkle as Sparkles,
  FlipHorizontal,
  ArrowLeft,
  ArrowRight,
  ArrowCounterClockwise as RotateCcw,
  UserCheck,
  Check,
  Info,
} from '@phosphor-icons/react';
import { api } from '../auth/auth.js';
import { cacheRoster, getCachedRoster } from '../storage/attendanceStore.js';
import { CameraManager } from '../vision/cameraManager.js';
import {
  detectSingleFaceWithDescriptor,
  extractFaceThumbnail,
  loadFaceApiModels,
} from '../vision/faceApiService.js';
import { estimateHeadPose, isPoseMatchingTarget } from '../vision/poseEstimation.js';
import { GooeyDropdown } from '../components/ui/GooeyDropdown.tsx';
import { BiometricGuideOverlay } from '../components/ui/BiometricGuideOverlay.jsx';

export function RosterPage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cachedCount, setCachedCount] = useState(0);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [editStudent, setEditStudent] = useState(null);

  // Angle Steps Definition
  const ANGLE_STEPS = [
    {
      id: 'front',
      name: 'Frontal Portrait',
      shortName: 'Front',
      targetDeg: '0° Center',
      prompt: 'Look straight ahead at the camera',
    },
    {
      id: 'left',
      name: 'Left Profile',
      shortName: 'Left Profile',
      targetDeg: '~30° to 45° Left',
      prompt: 'Slowly turn your head to the left',
    },
    {
      id: 'right',
      name: 'Right Profile',
      shortName: 'Right Profile',
      targetDeg: '~30° to 45° Right',
      prompt: 'Slowly turn your head to the right',
    },
  ];

  // Enrollment Camera state
  const [enrollTab, setEnrollTab] = useState('camera'); // 'camera' | 'manual'
  const [enrollCameraActive, setEnrollCameraActive] = useState(false);
  const [enrollMirrored, setEnrollMirrored] = useState(true);
  const [capturedAngles, setCapturedAngles] = useState({
    front: null,  // { thumbnailUrl, embeddingVector, pose }
    left: null,   // { thumbnailUrl, embeddingVector, pose }
    right: null,  // { thumbnailUrl, embeddingVector, pose }
  });
  const [currentAngleStep, setCurrentAngleStep] = useState('front'); // 'front' | 'left' | 'right'
  const [livePose, setLivePose] = useState(null);
  const [holdProgress, setHoldProgress] = useState(0); // 0 to 100%
  const [isExtractingFace, setIsExtractingFace] = useState(false);
  const enrollVideoRef = useRef(null);
  const enrollCameraManagerRef = useRef(null);
  const holdCounterRef = useRef(0);
  const poseLoopIntervalRef = useRef(null);
  const isAutoSnappingRef = useRef(false);

  // Form states
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formImage, setFormImage] = useState('');
  const [notification, setNotification] = useState(null);

  const showNotice = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const playSnapSound = (isLast = false) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      if (isLast) {
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08);
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.16);
        osc.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.24);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.42);
        osc.start();
        osc.stop(ctx.currentTime + 0.42);
      } else {
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
        osc.start();
        osc.stop(ctx.currentTime + 0.28);
      }
    } catch {}
  };

  const fetchRoster = async () => {
    setLoading(true);
    try {
      const res = await api.get('/roster');
      setStudents(res.data);
      // Auto-update IndexedDB cache
      await cacheRoster(res.data);
      const cached = await getCachedRoster();
      setCachedCount(cached.length);
    } catch (err) {
      console.warn('Network fetch failed, attempting IndexedDB local cache:', err);
      const cached = await getCachedRoster();
      setStudents(cached);
      setCachedCount(cached.length);
      showNotice('Offline: Loaded roster from local IndexedDB cache', 'warning');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoster();
    return () => {
      stopEnrollCamera();
    };
  }, []);

  const handleManualCache = async () => {
    await cacheRoster(students);
    const cached = await getCachedRoster();
    setCachedCount(cached.length);
    showNotice(`Cached ${cached.length} student profiles into local IndexedDB for offline matching.`);
  };

  const exportRosterCSV = () => {
    if (!students || students.length === 0) {
      showNotice('No student records to export.', 'warning');
      return;
    }
    const headers = ['ID', 'Student Code', 'Name', 'Image URL', 'Enrolled Date'];
    const rows = students.map((s) => [
      s.id,
      s.studentIdCode || '',
      `"${s.name}"`,
      s.imageUrl || '',
      s.createdAt || '',
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `roster-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showNotice('Exported student roster as CSV.');
  };

  // Start enrollment webcam
  const startEnrollCamera = async () => {
    try {
      enrollCameraManagerRef.current = new CameraManager();
      await enrollCameraManagerRef.current.start(enrollVideoRef.current, {
        targetFps: 30,
        facingMode: 'user',
      });
      setEnrollCameraActive(true);
    } catch (err) {
      console.error('Enrollment camera error:', err);
      showNotice('Could not access camera for face enrollment: ' + err.message, 'error');
    }
  };

  const stopEnrollCamera = () => {
    if (poseLoopIntervalRef.current) {
      clearInterval(poseLoopIntervalRef.current);
      poseLoopIntervalRef.current = null;
    }
    if (enrollCameraManagerRef.current) {
      enrollCameraManagerRef.current.stop();
      enrollCameraManagerRef.current = null;
    }
    setEnrollCameraActive(false);
    setLivePose(null);
    setHoldProgress(0);
    holdCounterRef.current = 0;
  };

  // Real-time pose tracking & automatic 0.6s hold auto-snap
  const checkPoseFrame = async () => {
    if (
      !enrollVideoRef.current ||
      !enrollCameraActive ||
      isExtractingFace ||
      isAutoSnappingRef.current
    ) return;
    if (enrollVideoRef.current.readyState < 2 || enrollVideoRef.current.videoWidth === 0) return;

    try {
      const detection = await detectSingleFaceWithDescriptor(enrollVideoRef.current, 224, 0.4);
      if (!detection || !detection.landmarks) {
        setLivePose(null);
        holdCounterRef.current = 0;
        setHoldProgress(0);
        return;
      }

      const pose = estimateHeadPose(detection.landmarks, enrollMirrored);
      setLivePose(pose);

      const isTargetMatched = isPoseMatchingTarget(pose, currentAngleStep);
      if (isTargetMatched) {
        holdCounterRef.current += 1;
        // 6 ticks * 100ms = 600ms hold time
        const progress = Math.min(100, Math.round((holdCounterRef.current / 6) * 100));
        setHoldProgress(progress);

        if (holdCounterRef.current >= 6) {
          isAutoSnappingRef.current = true;
          holdCounterRef.current = 0;
          setHoldProgress(0);
          await snapCurrentAngle(detection);
          isAutoSnappingRef.current = false;
        }
      } else {
        holdCounterRef.current = 0;
        setHoldProgress(0);
      }
    } catch {}
  };

  useEffect(() => {
    if (enrollCameraActive && enrollTab === 'camera') {
      poseLoopIntervalRef.current = setInterval(checkPoseFrame, 100);
    } else {
      if (poseLoopIntervalRef.current) {
        clearInterval(poseLoopIntervalRef.current);
        poseLoopIntervalRef.current = null;
      }
      setLivePose(null);
      setHoldProgress(0);
      holdCounterRef.current = 0;
    }
    return () => {
      if (poseLoopIntervalRef.current) {
        clearInterval(poseLoopIntervalRef.current);
        poseLoopIntervalRef.current = null;
      }
    };
  }, [enrollCameraActive, enrollTab, currentAngleStep, enrollMirrored, isExtractingFace]);

  const snapCurrentAngle = async (existingDetection = null) => {
    if (!enrollVideoRef.current || !enrollCameraActive) return;
    setIsExtractingFace(true);
    try {
      let detection = existingDetection;
      if (!detection || !detection.descriptor) {
        detection = await detectSingleFaceWithDescriptor(enrollVideoRef.current, 320, 0.45);
      }
      if (!detection) {
        showNotice('No face detected. Please position face clearly in the camera.', 'warning');
        setIsExtractingFace(false);
        return;
      }

      const thumbUrl = extractFaceThumbnail(enrollVideoRef.current, detection.box);
      const pose = estimateHeadPose(detection.landmarks, enrollMirrored);

      const capturedData = {
        thumbnailUrl: thumbUrl,
        embeddingVector: detection.descriptor,
        pose,
      };

      setCapturedAngles((prev) => ({
        ...prev,
        [currentAngleStep]: capturedData,
      }));

      if (currentAngleStep === 'front') {
        playSnapSound(false);
        setCurrentAngleStep('left');
        showNotice('Frontal photo captured! Now slowly turn your head to the left (~30° to 45°).');
      } else if (currentAngleStep === 'left') {
        playSnapSound(false);
        setCurrentAngleStep('right');
        showNotice('Left profile captured! Now slowly turn your head to the right (~30° to 45°).');
      } else if (currentAngleStep === 'right') {
        playSnapSound(true);
        showNotice('All 3 angles captured! Face recognition profile is complete and ready.');
      }
    } catch (err) {
      console.error('Snap angle failed:', err);
      showNotice('Failed to capture angle: ' + err.message, 'error');
    } finally {
      setIsExtractingFace(false);
    }
  };

  const handleSlotUpload = (targetStep, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtractingFace(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target.result;
      const img = new Image();
      img.onload = async () => {
        try {
          const detection = await detectSingleFaceWithDescriptor(img, 320, 0.45);
          if (!detection) {
            showNotice(
              `No human face detected in uploaded photo for ${targetStep} profile.`,
              'warning'
            );
            setIsExtractingFace(false);
            return;
          }

          const thumbUrl = extractFaceThumbnail(img, detection.box);
          const pose = estimateHeadPose(detection.landmarks, false);

          setCapturedAngles((prev) => ({
            ...prev,
            [targetStep]: {
              thumbnailUrl: thumbUrl,
              embeddingVector: detection.descriptor,
              pose,
            },
          }));

          playSnapSound(targetStep === 'right');
          showNotice(`Extracted ${targetStep} profile photo successfully!`);
        } catch (err) {
          console.error('Photo face detection failed:', err);
          showNotice('Could not extract face profile from image: ' + err.message, 'error');
        } finally {
          setIsExtractingFace(false);
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();

    const { front, left, right } = capturedAngles;
    if (!front || !left || !right) {
      showNotice(
        'All 3 angles (Front, Left Profile, Right Profile) are strictly required for reliable face recognition.',
        'warning'
      );
      return;
    }

    try {
      // Concatenate 3 128-D vectors into one 384-element float array (3 x 128 = 384 floats)
      const combinedEmbedding = [
        ...front.embeddingVector,
        ...left.embeddingVector,
        ...right.embeddingVector,
      ];

      await api.post('/roster/batch', {
        students: [
          {
            name: formName,
            studentIdCode: formCode,
            imageUrl: front.thumbnailUrl,
            imageLeftUrl: left.thumbnailUrl,
            imageRightUrl: right.thumbnailUrl,
            embedding: combinedEmbedding,
          },
        ],
      });

      showNotice(`Student ${formName} enrolled with 3-angle face recognition profile.`);
      closeAddModal();
      fetchRoster();
    } catch (err) {
      showNotice(err.response?.data?.error || 'Failed to enroll student.', 'error');
    }
  };

  const closeAddModal = () => {
    stopEnrollCamera();
    setShowAddModal(false);
    setCapturedAngles({ front: null, left: null, right: null });
    setCurrentAngleStep('front');
    setLivePose(null);
    setHoldProgress(0);
    setEditStudent(null);
    setFormName('');
    setFormCode('');
    setFormImage('');
  };

  const openEditModal = (student) => {
    setEditStudent(student);
    setFormName(student.name);
    setFormCode(student.studentIdCode || '');
    setFormImage(student.imageUrl || '');

    const frontVec =
      student.embeddingVectors?.front ||
      (student.embeddingVector && student.embeddingVector.length >= 384
        ? student.embeddingVector.slice(0, 128)
        : student.embeddingVector);
    const leftVec =
      student.embeddingVectors?.left ||
      (student.embeddingVector && student.embeddingVector.length >= 384
        ? student.embeddingVector.slice(128, 256)
        : null);
    const rightVec =
      student.embeddingVectors?.right ||
      (student.embeddingVector && student.embeddingVector.length >= 384
        ? student.embeddingVector.slice(256, 384)
        : null);

    setCapturedAngles({
      front:
        student.imageUrl && frontVec
          ? { thumbnailUrl: student.imageUrl, embeddingVector: frontVec }
          : null,
      left:
        student.imageLeftUrl && leftVec
          ? { thumbnailUrl: student.imageLeftUrl, embeddingVector: leftVec }
          : null,
      right:
        student.imageRightUrl && rightVec
          ? { thumbnailUrl: student.imageRightUrl, embeddingVector: rightVec }
          : null,
    });

    if (!frontVec) setCurrentAngleStep('front');
    else if (!leftVec) setCurrentAngleStep('left');
    else if (!rightVec) setCurrentAngleStep('right');
    else setCurrentAngleStep('front');

    setShowAddModal(true);
    setEnrollTab('camera');
    setTimeout(() => startEnrollCamera(), 100);
  };

  const handleUpdateStudent = async (e) => {
    e.preventDefault();
    if (!editStudent) return;
    try {
      const payload = {
        name: formName,
        studentIdCode: formCode,
      };

      const { front, left, right } = capturedAngles;
      if (front && left && right) {
        payload.imageUrl = front.thumbnailUrl;
        payload.imageLeftUrl = left.thumbnailUrl;
        payload.imageRightUrl = right.thumbnailUrl;
        payload.embedding = [
          ...front.embeddingVector,
          ...left.embeddingVector,
          ...right.embeddingVector,
        ];
      } else if (formImage) {
        payload.imageUrl = formImage;
      }

      await api.put(`/roster/${editStudent.id}`, payload);
      showNotice(`Student ${formName} updated.`);
      closeAddModal();
      fetchRoster();
    } catch (err) {
      showNotice('Failed to update student.', 'error');
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Are you sure you want to remove ${name} from the roster?`)) return;
    try {
      await api.delete(`/roster/${id}`);
      showNotice(`Removed ${name} from roster.`);
      fetchRoster();
    } catch (err) {
      showNotice('Failed to delete student.', 'error');
    }
  };

  // Batch CSV/JSON file upload handler
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target.result;
      try {
        let parsed = [];
        if (file.name.endsWith('.json')) {
          parsed = JSON.parse(content);
        } else {
          // CSV parser: student_id,name,image_url
          const lines = content.split('\n');
          for (const line of lines) {
            const parts = line.split(',').map((s) => s.trim());
            if (parts.length >= 2 && parts[0] && parts[0].toLowerCase() !== 'student_id') {
              parsed.push({
                studentIdCode: parts[0],
                name: parts[1],
                imageUrl: parts[2] || null,
                embedding: null, // No fake mock embeddings! Real faces must be enrolled.
              });
            }
          }
        }

        if (parsed.length === 0) {
          throw new Error('No valid student rows found in file.');
        }

        await api.post('/roster/batch', { students: parsed });
        showNotice(
          `Batch upload completed: ${parsed.length} students enrolled. Please snap or upload photos to record real facial biometrics.`
        );
        setShowBatchModal(false);
        fetchRoster();
      } catch (err) {
        showNotice(`Upload error: ${err.message}`, 'error');
      }
    };
    reader.readAsText(file);
  };

  const handlePurgeAll = async () => {
    if (
      !confirm(
        'Warning: This will delete ALL students and attendance records from your database and wipe the local cache clean. Proceed?'
      )
    )
      return;
    try {
      await api.delete('/roster/purge/all');
      await cacheRoster([]);
      setStudents([]);
      setCachedCount(0);
      showNotice('All student data purged. Database and local cache are completely clean.');
    } catch (err) {
      showNotice('Failed to purge roster: ' + err.message, 'error');
    }
  };

  const filtered = students.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.studentIdCode && s.studentIdCode.toLowerCase().includes(search.toLowerCase()))
  );

  const rosterDropdownActions = [
    {
      id: 'enroll-student',
      label: 'Enroll Face with Camera',
      icon: <Camera size={18} strokeWidth={1.75} />,
      detail: 'Enroll student face profile',
      onSelect: () => {
        setFormName('');
        setFormCode('');
        setFormImage('');
        setCapturedFace(null);
        setEnrollTab('camera');
        setShowAddModal(true);
        setTimeout(() => startEnrollCamera(), 100);
      },
    },
    {
      id: 'batch-upload',
      label: 'Upload CSV / JSON',
      icon: <Upload size={18} strokeWidth={1.75} />,
      detail: 'Bulk roster import',
      onSelect: () => setShowBatchModal(true),
    },
    {
      id: 'export-roster',
      label: 'Export Student Roster',
      icon: <FileSpreadsheet size={18} strokeWidth={1.75} />,
      detail: 'Download .csv spreadsheet',
      onSelect: () => exportRosterCSV(),
    },
    {
      id: 'cache-offline',
      label: `Sync Offline Cache (${cachedCount})`,
      icon: <HardDriveDownload size={18} strokeWidth={1.75} />,
      detail: 'Update browser IndexedDB',
      onSelect: () => handleManualCache(),
    },
    {
      id: 'reload',
      label: 'Reload from Cloud',
      icon: <RefreshCw size={18} strokeWidth={1.75} />,
      detail: 'Re-fetch latest student roster',
      onSelect: () => fetchRoster(),
    },
    {
      id: 'purge-all',
      label: 'Purge Entire Roster',
      icon: <Trash2 size={18} strokeWidth={1.75} />,
      detail: 'Wipes all enrolled faces',
      divider: true,
      destructive: true,
      onSelect: () => handlePurgeAll(),
    },
  ];

  return (
    <div className="space-y-6 font-sans">
      {/* Notification Toast */}
      {notification && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 text-sm font-medium ${
            notification.type === 'error'
              ? 'bg-red-500/10 border-red-500/30 text-red-400'
              : notification.type === 'warning'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
          }`}
        >
          {notification.type === 'error' ? (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          ) : (
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <span>{notification.msg}</span>
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6 text-emerald-400" />
            <span>Student Roster</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage student enrollment and face recognition profiles for classroom check-in.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              setEditStudent(null);
              setFormName('');
              setFormCode('');
              setFormImage('');
              setCapturedAngles({ front: null, left: null, right: null });
              setCurrentAngleStep('front');
              setEnrollTab('camera');
              setShowAddModal(true);
              setTimeout(() => startEnrollCamera(), 100);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-full text-xs transition-all duration-200 active:scale-[0.98] shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Enroll Student</span>
          </button>

          <GooeyDropdown
            label="Roster Actions"
            actions={rosterDropdownActions}
            anchor="end"
            menuWidth={260}
            fill="#181818"
            ink="#f8fafc"
            danger="#ef4444"
          />
        </div>
      </div>

      {/* Search Bar & Active Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student name or ID code..."
            className="w-full pl-10 pr-4 py-2 bg-[#181818] border border-[#282828] rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition"
          />
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="px-3 py-1.5 rounded-xl bg-[#181818] border border-[#282828] text-slate-300 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Active (3 Angles):</span>
            <span className="text-emerald-400 font-bold">
              {
                students.filter(
                  (s) => s.isComplete || (s.embeddingVector && s.embeddingVector.length >= 384)
                ).length
              }
            </span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-[#181818] border border-[#282828] text-slate-400">
            Total: <span className="text-white font-bold">{students.length}</span>
          </div>
        </div>
      </div>

      {/* Roster Table */}
      <div className="bg-[#181818]/90 border border-[#282828] backdrop-blur-md rounded-2xl overflow-hidden shadow-xl ring-1 ring-white/[0.05]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#0d0d0d] text-xs font-medium text-slate-400 border-b border-[#282828]">
              <tr>
                <th className="px-6 py-3.5">Student</th>
                <th className="px-6 py-3.5">Student ID Code</th>
                <th className="px-6 py-3.5">Face Scan Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#242424]">
              {loading ? (
                <tr>
                  <td colSpan="4" className="text-center py-12 text-slate-500">
                    Loading roster...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center py-12 text-slate-500">
                    No students found. Click "Enroll Student" to snap a face and save to roster.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => {
                  const has3Angles =
                    s.isComplete ||
                    s.angleCount === 3 ||
                    (s.embeddingVector && s.embeddingVector.length >= 384);

                  return (
                    <tr key={s.id} className="hover:bg-white/[0.03] transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#222222] border border-[#333333] overflow-hidden flex items-center justify-center flex-shrink-0">
                            {s.imageUrl ? (
                              <img
                                src={s.imageUrl}
                                alt={s.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Users className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                          <span className="font-semibold text-white">{s.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-emerald-400 font-mono text-xs">
                        {s.studentIdCode || '—'}
                      </td>
                      <td className="px-6 py-4">
                        {has3Angles ? (
                          <div className="flex items-center gap-2.5">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <CheckCircle className="w-3 h-3" />
                              <span>3 Angles Verified</span>
                            </span>
                            <div className="flex -space-x-1.5 items-center">
                              {s.imageUrl && (
                                <img
                                  src={s.imageUrl}
                                  alt="Front"
                                  title="Frontal Portrait"
                                  className="w-5 h-5 rounded-full object-cover border border-[#181818] ring-1 ring-emerald-500/50"
                                />
                              )}
                              {s.imageLeftUrl && (
                                <img
                                  src={s.imageLeftUrl}
                                  alt="Left"
                                  title="Left Profile (~35°)"
                                  className="w-5 h-5 rounded-full object-cover border border-[#181818] ring-1 ring-emerald-500/50"
                                />
                              )}
                              {s.imageRightUrl && (
                                <img
                                  src={s.imageRightUrl}
                                  alt="Right"
                                  title="Right Profile (~35°)"
                                  className="w-5 h-5 rounded-full object-cover border border-[#181818] ring-1 ring-emerald-500/50"
                                />
                              )}
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openEditModal(s)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition cursor-pointer"
                            title="Click to complete 3 angles"
                          >
                            <AlertCircle className="w-3 h-3" />
                            <span>Incomplete ({s.angleCount || 0}/3) • Inactive</span>
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(s)}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-[#242424] rounded-lg transition"
                            title="Edit Student Face Profile"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(s.id, s.name)}
                            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                            title="Delete Student"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Student Multi-Angle Enrollment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-xl bg-[#161616] border border-[#282828] rounded-2xl p-6 shadow-2xl my-6">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#282828]">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={closeAddModal}
                  className="p-1.5 -ml-1 text-slate-400 hover:text-white hover:bg-[#242424] rounded-xl transition cursor-pointer"
                  title="Close"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                    <span>{editStudent ? 'Face Verification & Update' : 'Face Verification'}</span>
                  </h2>
                  <p className="text-xs text-slate-400">Position your face within the frame</p>
                </div>
              </div>

              <div className="flex bg-[#0d0d0d] p-1 rounded-xl text-xs font-semibold border border-[#282828]">
                <button
                  type="button"
                  onClick={() => {
                    setEnrollTab('camera');
                    startEnrollCamera();
                  }}
                  className={`px-3 py-1 rounded-lg transition ${
                    enrollTab === 'camera'
                      ? 'bg-[#222222] text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Live Camera
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEnrollTab('manual');
                    stopEnrollCamera();
                  }}
                  className={`px-3 py-1 rounded-lg transition ${
                    enrollTab === 'manual'
                      ? 'bg-[#222222] text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Manual Upload
                </button>
              </div>
            </div>

            {/* 3-Angle Step Tabs */}
            <div className="grid grid-cols-3 gap-2 p-1.5 bg-[#0d0d0d] rounded-xl border border-[#282828] mb-3.5">
              {ANGLE_STEPS.map((step) => {
                const isCaptured = Boolean(capturedAngles[step.id]);
                const isActive = currentAngleStep === step.id;
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setCurrentAngleStep(step.id)}
                    className={`flex items-center gap-2 p-2 rounded-lg text-left transition relative ${
                      isActive
                        ? 'bg-[#222222] text-white ring-1 ring-emerald-500/60 shadow-sm'
                        : isCaptured
                        ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                        : 'bg-[#161616] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {isCaptured ? (
                      <div className="w-7 h-7 rounded-md overflow-hidden border border-emerald-500 flex-shrink-0">
                        <img
                          src={capturedAngles[step.id].thumbnailUrl}
                          alt={step.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div
                        className={`w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${
                          isActive
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-[#222222] text-slate-400'
                        }`}
                      >
                        {step.id === 'front' ? '1' : step.id === 'left' ? '2' : '3'}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-[12px] font-bold truncate flex items-center gap-1">
                        <span>{step.shortName}</span>
                        {isCaptured && <Check className="w-3 h-3 text-emerald-400 inline" />}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {step.targetDeg}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <form
              onSubmit={editStudent ? handleUpdateStudent : handleAddStudent}
              className="space-y-4"
            >
              {enrollTab === 'camera' && (
                <div className="space-y-3">
                  {/* Circular Face Verification Viewport (Meta / Yoti / Apple Face ID style) */}
                  <div className="relative flex flex-col items-center justify-center py-2">
                    {/* Radial Ticks + Camera Frame Container */}
                    <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
                      {/* Radiating Ticks SVG Ring (wrapping directly around circular frame) */}
                      <BiometricGuideOverlay
                        step={currentAngleStep}
                        livePose={livePose}
                        holdProgress={holdProgress}
                        capturedAngles={capturedAngles}
                        isMirrored={enrollMirrored}
                      />

                      {/* Circular Camera Mask Viewport */}
                      <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-full overflow-hidden border-4 border-[#282828] bg-[#0d0d0d] shadow-2xl relative z-10 flex items-center justify-center ring-2 ring-emerald-500/20">
                        {enrollCameraActive ? (
                          <video
                            ref={enrollVideoRef}
                            className={`w-full h-full object-cover scale-110 ${
                              enrollMirrored ? 'scale-x-[-1.1]' : ''
                            }`}
                          />
                        ) : (
                          <div className="w-full h-full bg-[#161616] flex items-center justify-center text-slate-500">
                            <Camera className="w-10 h-10 animate-pulse text-slate-400" />
                          </div>
                        )}
                      </div>

                      {/* Mirror button on camera overlay */}
                      <button
                        type="button"
                        onClick={() => setEnrollMirrored(!enrollMirrored)}
                        className="absolute bottom-2 right-2 z-20 p-2 bg-[#181818] hover:bg-[#222222] text-slate-300 rounded-full border border-[#333333] text-xs flex items-center justify-center shadow-lg backdrop-blur-md cursor-pointer transition hover:scale-105"
                        title="Toggle camera mirror reflection"
                      >
                        <FlipHorizontal className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Instruction Card below Circle (directly matching the user's uploaded image!) */}
                    <div className="w-full max-w-md mt-3 p-3 rounded-2xl bg-[#0d0d0d]/90 border border-[#282828] flex items-center gap-3 text-xs shadow-sm">
                      <div className="w-7 h-7 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 flex-shrink-0">
                        <Info className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <p className="text-slate-200 font-medium">
                          {currentAngleStep === 'front' && 'Position your face within the frame and look straight ahead.'}
                          {currentAngleStep === 'left' && 'Move your head slowly to the left. Follow the green ticks.'}
                          {currentAngleStep === 'right' && 'Move your head slowly to the right. Follow the green ticks.'}
                          {capturedAngles.front && capturedAngles.left && capturedAngles.right && 'All angles verified! All green ticks completed.'}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Make sure your face is bright and easy to see. Holds for 0.6s to auto-capture.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Manual Snap & Retake Bar */}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={isExtractingFace}
                      onClick={() => snapCurrentAngle()}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-sm transition-all duration-200 active:scale-95 shadow-sm cursor-pointer"
                    >
                      {isExtractingFace ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Extracting Biometrics...</span>
                        </>
                      ) : (
                        <>
                          <Camera className="w-4 h-4" />
                          <span>
                            Manual Snap (
                            {ANGLE_STEPS.find((s) => s.id === currentAngleStep)?.shortName})
                          </span>
                        </>
                      )}
                    </button>

                    {capturedAngles[currentAngleStep] && (
                      <button
                        type="button"
                        onClick={() => {
                          setCapturedAngles((prev) => ({
                            ...prev,
                            [currentAngleStep]: null,
                          }));
                          showNotice(
                            `Reset ${currentAngleStep} angle. Position your face to retake.`
                          );
                        }}
                        className="px-3.5 py-2.5 bg-[#222222] hover:bg-[#2a2a2a] text-slate-300 text-xs font-semibold rounded-xl border border-[#333333] flex items-center gap-1.5 transition cursor-pointer"
                        title="Retake this angle"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Retake</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {enrollTab === 'manual' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-400">
                    Upload 3 reference portrait photos for each required angle.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {ANGLE_STEPS.map((step) => {
                      const captured = capturedAngles[step.id];
                      return (
                        <div
                          key={step.id}
                          className="p-3.5 rounded-xl border border-[#282828] bg-[#0d0d0d] text-center flex flex-col items-center justify-between min-h-[160px]"
                        >
                          <div className="w-full">
                            <div className="text-xs font-bold text-white mb-0.5">
                              {step.name}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono mb-2">
                              {step.targetDeg}
                            </div>
                          </div>

                          {captured ? (
                            <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-emerald-500 shadow-sm my-1">
                              <img
                                src={captured.thumbnailUrl}
                                alt={step.name}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute top-1 right-1 w-3 h-3 bg-emerald-400 rounded-full border border-[#0d0d0d]" />
                            </div>
                          ) : (
                            <div className="w-16 h-16 rounded-xl border border-dashed border-[#333333] flex items-center justify-center text-slate-500 my-1">
                              <Upload className="w-5 h-5 text-slate-400" />
                            </div>
                          )}

                          <label className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-[#222222] hover:bg-[#2a2a2a] text-slate-200 border border-[#333333] rounded-lg text-xs font-semibold cursor-pointer transition">
                            <span>{captured ? 'Replace' : 'Upload'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleSlotUpload(step.id, e)}
                            />
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Status Banner */}
              {capturedAngles.front && capturedAngles.left && capturedAngles.right ? (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-400">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    <span>All 3 Angles Captured (384 Biometric Dimensions Ready)</span>
                  </div>
                  <div className="flex -space-x-2">
                    <img
                      src={capturedAngles.front.thumbnailUrl}
                      alt="Front"
                      className="w-6 h-6 rounded-full object-cover border border-[#181818] ring-1 ring-emerald-500"
                    />
                    <img
                      src={capturedAngles.left.thumbnailUrl}
                      alt="Left"
                      className="w-6 h-6 rounded-full object-cover border border-[#181818] ring-1 ring-emerald-500"
                    />
                    <img
                      src={capturedAngles.right.thumbnailUrl}
                      alt="Right"
                      className="w-6 h-6 rounded-full object-cover border border-[#181818] ring-1 ring-emerald-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2 text-xs text-amber-400">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>
                    Missing angles:{' '}
                    {[
                      !capturedAngles.front && 'Frontal',
                      !capturedAngles.left && 'Left Profile',
                      !capturedAngles.right && 'Right Profile',
                    ]
                      .filter(Boolean)
                      .join(', ')}
                    . All 3 are strictly required for active recognition.
                  </span>
                </div>
              )}

              {/* Student Metadata Fields */}
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Student Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Liam Parker"
                    className="w-full px-3.5 py-2 bg-[#0d0d0d] border border-[#282828] rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Student ID Code
                  </label>
                  <input
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="e.g. STU-2041"
                    className="w-full px-3.5 py-2 bg-[#0d0d0d] border border-[#282828] rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#282828] flex flex-col gap-2">
                <button
                  type="submit"
                  disabled={
                    !capturedAngles.front || !capturedAngles.left || !capturedAngles.right
                  }
                  className={`w-full py-3.5 font-bold rounded-2xl text-sm transition-all duration-200 shadow-lg flex items-center justify-center gap-2 cursor-pointer ${
                    capturedAngles.front && capturedAngles.left && capturedAngles.right
                      ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/25 active:scale-[0.99]'
                      : 'bg-[#222222] text-slate-500 cursor-not-allowed opacity-60'
                  }`}
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>
                    {capturedAngles.front && capturedAngles.left && capturedAngles.right
                      ? editStudent
                        ? 'Done • Save Changes'
                        : 'Done • Save & Enroll in Roster'
                      : 'Done (Complete 3 Angles to Save)'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={closeAddModal}
                  className="w-full py-1.5 text-xs text-slate-400 hover:text-white cursor-pointer transition text-center"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batch Upload Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg bg-[#161616] border border-[#282828] rounded-2xl p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-2">Upload Student Roster Batch</h2>
            <p className="text-xs text-slate-400 mb-4">
              Select a CSV file formatted as <code className="text-emerald-400 font-mono">student_id,name,image_url</code>{' '}
              or JSON array of students with face profiles.
            </p>

            <div className="border-2 border-dashed border-[#333333] hover:border-emerald-500/50 rounded-2xl p-8 text-center cursor-pointer transition bg-[#0d0d0d]">
              <input
                type="file"
                accept=".csv,.json"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <FileSpreadsheet className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                <span className="block text-sm font-semibold text-white">
                  Click to select CSV or JSON file
                </span>
                <span className="block text-xs text-slate-500 mt-1">
                  Supported formats: .csv, .json (up to 4MB)
                </span>
              </label>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowBatchModal(false)}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
