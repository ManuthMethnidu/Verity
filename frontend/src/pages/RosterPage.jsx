import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  Upload,
  Plus,
  Trash2,
  Edit2,
  HardDriveDownload,
  CheckCircle,
  AlertCircle,
  Search,
  FileSpreadsheet,
  Camera,
  RefreshCw,
  Sparkles,
  FlipHorizontal,
} from 'lucide-react';
import { api } from '../auth/auth.js';
import { cacheRoster, getCachedRoster } from '../storage/attendanceStore.js';
import { CameraManager } from '../vision/cameraManager.js';
import {
  detectSingleFaceWithDescriptor,
  extractFaceThumbnail,
  loadFaceApiModels,
} from '../vision/faceApiService.js';
import { GooeyDropdown } from '../components/ui/GooeyDropdown.tsx';

export function RosterPage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cachedCount, setCachedCount] = useState(0);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [editStudent, setEditStudent] = useState(null);

  // Enrollment Camera state
  const [enrollTab, setEnrollTab] = useState('camera'); // 'camera' | 'manual'
  const [enrollCameraActive, setEnrollCameraActive] = useState(false);
  const [enrollMirrored, setEnrollMirrored] = useState(true);
  const [capturedFace, setCapturedFace] = useState(null); // { thumbnailUrl, embeddingVector }
  const [isExtractingFace, setIsExtractingFace] = useState(false);
  const enrollVideoRef = useRef(null);
  const enrollCameraManagerRef = useRef(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formImage, setFormImage] = useState('');
  const [notification, setNotification] = useState(null);

  const showNotice = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
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
    if (enrollCameraManagerRef.current) {
      enrollCameraManagerRef.current.stop();
      enrollCameraManagerRef.current = null;
    }
    setEnrollCameraActive(false);
  };

  const handleSnapFace = async () => {
    if (!enrollVideoRef.current || !enrollCameraActive) return;
    setIsExtractingFace(true);
    try {
      const detection = await detectSingleFaceWithDescriptor(enrollVideoRef.current);
      if (!detection) {
        showNotice(
          'No face detected! Please ensure your face is well-lit and looking directly at the camera.',
          'warning'
        );
        setIsExtractingFace(false);
        return;
      }

      const thumbUrl = extractFaceThumbnail(enrollVideoRef.current, detection.box);
      const result = {
        thumbnailUrl: thumbUrl,
        embeddingVector: detection.descriptor,
      };

      setCapturedFace(result);
      setFormImage(thumbUrl);
      showNotice('Face verified! Face recognition profile successfully created.');
    } catch (err) {
      console.error('Snap face failed:', err);
      showNotice('Failed to capture face profile: ' + err.message, 'error');
    } finally {
      setIsExtractingFace(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsExtractingFace(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target.result;
      const img = new Image();
      img.onload = async () => {
        try {
          const detection = await detectSingleFaceWithDescriptor(img);
          if (!detection) {
            showNotice(
              'No human face detected in uploaded photo. Please upload a clear portrait photo.',
              'warning'
            );
            setIsExtractingFace(false);
            return;
          }

          const thumbUrl = extractFaceThumbnail(img, detection.box);
          const result = {
            thumbnailUrl: thumbUrl,
            embeddingVector: detection.descriptor,
          };

          setCapturedFace(result);
          setFormImage(thumbUrl);
          showNotice('Photo processed! Face recognition profile created.');
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
    if (!capturedFace || !capturedFace.embeddingVector) {
      showNotice(
        'Please capture a face from camera or upload a student portrait photo before saving.',
        'warning'
      );
      return;
    }

    try {
      const embedding = capturedFace.embeddingVector;
      const imageUrl = capturedFace.thumbnailUrl || formImage || null;

      await api.post('/roster/batch', {
        students: [
          {
            name: formName,
            studentIdCode: formCode,
            imageUrl,
            embedding,
          },
        ],
      });

      showNotice(`Student ${formName} enrolled with active face recognition profile.`);
      closeAddModal();
      fetchRoster();
    } catch (err) {
      showNotice(err.response?.data?.error || 'Failed to enroll student.', 'error');
    }
  };

  const closeAddModal = () => {
    stopEnrollCamera();
    setShowAddModal(false);
    setCapturedFace(null);
    setFormName('');
    setFormCode('');
    setFormImage('');
  };

  const handleUpdateStudent = async (e) => {
    e.preventDefault();
    if (!editStudent) return;
    try {
      await api.put(`/roster/${editStudent.id}`, {
        name: formName,
        studentIdCode: formCode,
        imageUrl: formImage || null,
      });
      showNotice(`Student ${formName} updated.`);
      setEditStudent(null);
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
              setFormName('');
              setFormCode('');
              setFormImage('');
              setCapturedFace(null);
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
            fill="#0f172a"
            ink="#f8fafc"
            danger="#ef4444"
          />
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by student name or ID code..."
          className="w-full pl-10 pr-4 py-2 bg-slate-900/80 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition"
        />
      </div>

      {/* Roster Table */}
      <div className="bg-slate-900/60 border border-slate-800/80 backdrop-blur-md rounded-2xl overflow-hidden shadow-xl ring-1 ring-white/[0.05]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/60 text-xs font-medium text-slate-400 border-b border-slate-800/80">
              <tr>
                <th className="px-6 py-3.5">Student</th>
                <th className="px-6 py-3.5">Student ID Code</th>
                <th className="px-6 py-3.5">Face Scan Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
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
                filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/20 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700/80 overflow-hidden flex items-center justify-center flex-shrink-0">
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
                      {s.embedding || s.embeddingVector ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle className="w-3 h-3" />
                          <span>Face Scan Enrolled</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <AlertCircle className="w-3 h-3" />
                          <span>Pending Capture</span>
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditStudent(s);
                            setFormName(s.name);
                            setFormCode(s.studentIdCode || '');
                            setFormImage(s.imageUrl || '');
                          }}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                          title="Edit Student"
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Enroll Student Modal with Live Camera Snap */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl my-6">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Camera className="w-5 h-5 text-emerald-400" />
                <span>Enroll Student Face</span>
              </h2>
              <div className="flex bg-slate-950 p-1 rounded-xl text-xs font-semibold border border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setEnrollTab('camera');
                    startEnrollCamera();
                  }}
                  className={`px-3 py-1 rounded-lg transition ${
                    enrollTab === 'camera'
                      ? 'bg-slate-800 text-white shadow-sm'
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
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Manual Form
                </button>
              </div>
            </div>

            <form onSubmit={handleAddStudent} className="space-y-4">
              {enrollTab === 'camera' && (
                <div className="space-y-3">
                  {/* Live Camera Viewport */}
                  <div className="relative w-full aspect-[4/3] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
                    <video
                      ref={enrollVideoRef}
                      className={`w-full h-full object-cover ${
                        enrollMirrored ? 'scale-x-[-1]' : ''
                      }`}
                    />

                    {/* Face Target Guide Oval */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="w-44 h-56 border-2 border-dashed border-emerald-400/60 rounded-[50%] flex items-center justify-center">
                        <span className="text-xs text-emerald-400 font-semibold bg-slate-950/80 px-2.5 py-0.5 rounded-full">
                          Position Face Here
                        </span>
                      </div>
                    </div>

                    {/* Mirror button on camera overlay */}
                    <button
                      type="button"
                      onClick={() => setEnrollMirrored(!enrollMirrored)}
                      className="absolute top-3 right-3 p-2 bg-slate-900/80 hover:bg-slate-900 text-slate-300 rounded-lg border border-slate-700 text-xs flex items-center gap-1.5"
                    >
                      <FlipHorizontal className="w-3.5 h-3.5" />
                      <span>{enrollMirrored ? 'Mirrored' : 'Normal'}</span>
                    </button>
                  </div>

                  {/* Snap and Preview Bar */}
                  <div className="flex items-center justify-between gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      disabled={isExtractingFace}
                      onClick={handleSnapFace}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-sm transition-all duration-200 active:scale-95 shadow-sm"
                    >
                      {isExtractingFace ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Extracting Neural Biometrics...</span>
                        </>
                      ) : (
                        <>
                          <Camera className="w-4 h-4" />
                          <span>Snap Face & Extract Biometrics</span>
                        </>
                      )}
                    </button>

                    {capturedFace && (
                      <div className="w-12 h-12 rounded-lg border border-emerald-500 overflow-hidden flex-shrink-0 relative">
                        <img
                          src={capturedFace.thumbnailUrl}
                          alt="Captured face"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border border-slate-900" />
                      </div>
                    )}
                  </div>

                  {capturedFace && (
                    <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 flex-shrink-0" />
                      <span>
                        Face Profile Confirmed ({capturedFace.embeddingVector.length} biometric points)
                      </span>
                    </div>
                  )}
                </div>
              )}

              {enrollTab === 'manual' && (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl border border-dashed border-slate-700 bg-slate-950/50 text-center space-y-2">
                    <div className="flex justify-center">
                      <Upload className="w-8 h-8 text-emerald-400" />
                    </div>
                    <p className="text-xs text-slate-300 font-medium">
                      Upload a student portrait photo to generate a face profile
                    </p>
                    <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold cursor-pointer transition">
                      <span>Choose Portrait Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhotoUpload}
                      />
                    </label>
                  </div>

                  {capturedFace && (
                    <div className="flex items-center gap-3 p-3 bg-slate-950/60 rounded-xl border border-emerald-500/40">
                      <img
                        src={capturedFace.thumbnailUrl}
                        alt="Enrolled portrait"
                        className="w-12 h-12 rounded-lg object-cover border border-emerald-500"
                      />
                      <div className="text-xs">
                        <div className="font-semibold text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Face Extracted Successfully</span>
                        </div>
                        <div className="text-slate-400 mt-0.5">
                          Face recognition profile ready for enrollment
                        </div>
                      </div>
                    </div>
                  )}
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
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition"
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
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition"
                  />
                </div>

                {enrollTab === 'manual' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                      Photo URL (Optional)
                    </label>
                    <input
                      type="url"
                      value={formImage}
                      onChange={(e) => setFormImage(e.target.value)}
                      placeholder="https://cdn.verity.internal/photos/student.jpg"
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={closeAddModal}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-sm transition-all duration-200 active:scale-[0.98] shadow-sm"
                >
                  Save & Enroll in Roster
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {editStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-4">Edit Student</h2>
            <form onSubmit={handleUpdateStudent} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition"
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
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Photo URL</label>
                <input
                  type="url"
                  value={formImage}
                  onChange={(e) => setFormImage(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditStudent(null)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-sm transition-all duration-200 active:scale-[0.98] shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batch Upload Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-2">Upload Student Roster Batch</h2>
            <p className="text-xs text-slate-400 mb-4">
              Select a CSV file formatted as <code className="text-emerald-400 font-mono">student_id,name,image_url</code>{' '}
              or JSON array of students with face profiles.
            </p>

            <div className="border-2 border-dashed border-slate-700 hover:border-emerald-500/50 rounded-2xl p-8 text-center cursor-pointer transition bg-slate-950/50">
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
