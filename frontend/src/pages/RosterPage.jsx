import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { api } from '../auth/auth.js';
import { cacheRoster, getCachedRoster } from '../storage/attendanceStore.js';

export function RosterPage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cachedCount, setCachedCount] = useState(0);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [editStudent, setEditStudent] = useState(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formImage, setFormImage] = useState('');
  const [batchJson, setBatchJson] = useState('');
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
  }, []);

  const handleManualCache = async () => {
    await cacheRoster(students);
    const cached = await getCachedRoster();
    setCachedCount(cached.length);
    showNotice(`Cached ${cached.length} student profiles into local IndexedDB for offline matching.`);
  };

  // Helper to generate normalized 128-D vector
  const createMockEmbedding = (name) => {
    const vec = new Float32Array(128);
    let norm = 0;
    const seed = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    for (let i = 0; i < 128; i++) {
      const val = Math.sin(seed * 77 + i * 23);
      vec[i] = val;
      norm += val * val;
    }
    norm = Math.sqrt(norm);
    for (let i = 0; i < 128; i++) vec[i] /= norm;
    return Array.from(vec);
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    try {
      const embedding = createMockEmbedding(formName);
      await api.post('/roster/batch', {
        students: [
          {
            name: formName,
            studentIdCode: formCode,
            imageUrl: formImage || null,
            embedding,
          },
        ],
      });
      showNotice(`Student ${formName} added successfully.`);
      setShowAddModal(false);
      setFormName('');
      setFormCode('');
      setFormImage('');
      fetchRoster();
    } catch (err) {
      showNotice(err.response?.data?.error || 'Failed to add student.', 'error');
    }
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
                embedding: createMockEmbedding(parts[1]),
              });
            }
          }
        }

        if (parsed.length === 0) {
          throw new Error('No valid student rows found in file.');
        }

        await api.post('/roster/batch', { students: parsed });
        showNotice(`Batch upload completed: ${parsed.length} students processed.`);
        setShowBatchModal(false);
        fetchRoster();
      } catch (err) {
        showNotice(`Upload error: ${err.message}`, 'error');
      }
    };
    reader.readAsText(file);
  };

  const filtered = students.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.studentIdCode && s.studentIdCode.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
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
          <h1 className="text-2xl font-bold text-white tracking-tight">Student Roster</h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage student enrollment and 128-D facial feature embeddings for offline matching.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleManualCache}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition"
            title="Ensure roster is cached in browser IndexedDB"
          >
            <HardDriveDownload className="w-3.5 h-3.5 text-emerald-400" />
            <span>Cache Offline ({cachedCount})</span>
          </button>
          <button
            onClick={() => setShowBatchModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload CSV/JSON</span>
          </button>
          <button
            onClick={() => {
              setFormName('');
              setFormCode('');
              setFormImage('');
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold rounded-xl text-xs transition shadow-lg shadow-emerald-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add Student</span>
          </button>
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
          className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
        />
      </div>

      {/* Roster Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-800/60 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-6 py-3.5">Student</th>
                <th className="px-6 py-3.5">Student ID Code</th>
                <th className="px-6 py-3.5">Embedding Status</th>
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
                    No students found. Click "Add Student" or "Upload CSV/JSON" to enroll students.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center">
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
                    <td className="px-6 py-4 text-slate-300 font-mono text-xs">
                      {s.studentIdCode || '—'}
                    </td>
                    <td className="px-6 py-4">
                      {s.embedding || s.embeddingVector ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle className="w-3 h-3" />
                          <span>128-D Vector Ready</span>
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

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-4">Enroll New Student</h2>
            <form onSubmit={handleAddStudent} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Liam Parker"
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Photo URL (Optional)
                </label>
                <input
                  type="url"
                  value={formImage}
                  onChange={(e) => setFormImage(e.target.value)}
                  placeholder="https://example.com/photo.jpg"
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold rounded-xl text-sm transition"
                >
                  Enroll Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {editStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
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
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Photo URL</label>
                <input
                  type="url"
                  value={formImage}
                  onChange={(e) => setFormImage(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditStudent(null)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold rounded-xl text-sm transition"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-2">Upload Student Roster Batch</h2>
            <p className="text-xs text-slate-400 mb-4">
              Select a CSV file formatted as <code className="text-emerald-400">student_id,name,image_url</code>{' '}
              or JSON array of students with embeddings.
            </p>

            <div className="border-2 border-dashed border-slate-700 hover:border-emerald-500/50 rounded-2xl p-8 text-center cursor-pointer transition bg-slate-800/40">
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
