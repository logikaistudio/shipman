import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface TaskReadiness {
  taskId: string;
  name: string;
  description: string;
  status: string;
  systemType: string;
  defectCount: number;
  defects: string[];
  isReady: boolean;
}

interface ReadinessData {
  vesselId: string;
  timestamp: string;
  score: number;
  perSystem: Array<{
    system: string;
    score: number;
    criticalOpen: number;
  }>;
  perTask: TaskReadiness[];
  criticalOpenItems: any[];
  missionProfile: string;
}

interface ReadinessDashboardProps {
  vesselId: string;
  onNavigateToTasks?: () => void;
}

export const ReadinessDashboard: React.FC<ReadinessDashboardProps> = ({ vesselId, onNavigateToTasks }) => {
  const [readiness, setReadiness] = useState<ReadinessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [missionProfile, setMissionProfile] = useState('patrol');

  useEffect(() => {
    fetchReadiness();
  }, [vesselId, missionProfile]);

  const fetchReadiness = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `/api/v1/vessels/${vesselId}/readiness?missionProfile=${missionProfile}`
      );
      setReadiness(response.data);
    } catch (error) {
      console.error('Error fetching readiness:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreBadgeClass = (score: number) => {
    if (score >= 80) return 'score-badge score-high';
    if (score >= 60) return 'score-badge score-medium';
    return 'score-badge score-low';
  };

  const getTaskStatusIcon = (task: TaskReadiness) => {
    if (task.status === 'done' && task.defectCount === 0) return '✅';
    if (task.status === 'done' && task.defectCount > 0) return '⚠️';
    return '⭕';
  };

  const getTaskStatusLabel = (task: TaskReadiness) => {
    if (task.status === 'done' && task.defectCount === 0) return 'SIAP';
    if (task.status === 'done' && task.defectCount > 0) return 'ADA KERUSAKAN';
    return 'BELUM DIISI';
  };

  const getTaskStatusBadgeStyle = (task: TaskReadiness) => {
    if (task.status === 'done' && task.defectCount === 0)
      return 'bg-green-100 text-green-800 border-green-300';
    if (task.status === 'done' && task.defectCount > 0)
      return 'bg-red-100 text-red-800 border-red-300';
    return 'bg-yellow-100 text-yellow-800 border-yellow-300';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-2">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm text-gray-500 font-medium">Memuat Data Kesiapan...</span>
      </div>
    );
  }

  if (!readiness) {
    return <div className="text-center text-red-600">Failed to load readiness data</div>;
  }

  const readyCount = readiness.perTask?.filter(t => t.isReady).length || 0;
  const defectCount = readiness.perTask?.filter(t => t.status === 'done' && t.defectCount > 0).length || 0;
  const pendingCount = readiness.perTask?.filter(t => t.status !== 'done').length || 0;
  const totalTasks = readiness.perTask?.length || 0;

  return (
    <div className="space-y-6 p-4 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="card">
        <h1 className="text-2xl font-bold mb-2">📊 Kesiapan Kapal</h1>
        <div className="flex justify-between items-center">
          <div>
            <p className="text-gray-600 text-sm">Profil Misi</p>
            <select
              value={missionProfile}
              onChange={(e) => setMissionProfile(e.target.value)}
              className="mt-2 px-3 py-2 border rounded-md text-sm"
            >
              <option value="patrol">Patroli</option>
              <option value="combat">Tempur</option>
              <option value="escort">Pengawalan</option>
              <option value="transit">Transit</option>
            </select>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Skor Keseluruhan</p>
            <div className={getScoreBadgeClass(readiness.score)}>
              {readiness.score}%
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
          <span className="text-2xl font-black text-green-700">{readyCount}</span>
          <p className="text-xxs font-bold text-green-600 mt-1 uppercase">Siap</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
          <span className="text-2xl font-black text-red-700">{defectCount}</span>
          <p className="text-xxs font-bold text-red-600 mt-1 uppercase">Rusak / Defek</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-center">
          <span className="text-2xl font-black text-yellow-700">{pendingCount}</span>
          <p className="text-xxs font-bold text-yellow-600 mt-1 uppercase">Belum Diisi</p>
        </div>
      </div>

      {/* Per-Task System Status (11 O&M Systems) */}
      {readiness.perTask && readiness.perTask.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span>🔧</span> Status Sistem O&M ({readyCount}/{totalTasks} Siap)
          </h2>
          <div className="space-y-2">
            {readiness.perTask.map((task, idx) => (
              <div
                key={task.taskId}
                className={`p-3.5 rounded-xl border transition-all ${
                  task.isReady
                    ? 'bg-green-50/50 border-green-200'
                    : task.status === 'done' && task.defectCount > 0
                    ? 'bg-red-50/40 border-red-200'
                    : 'bg-yellow-50/40 border-yellow-200'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-lg flex-shrink-0">{getTaskStatusIcon(task)}</span>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-gray-900 truncate">
                        {idx + 1}. {task.name}
                      </p>
                      <p className="text-xxs text-gray-500 truncate">{task.description}</p>
                    </div>
                  </div>
                  <span className={`text-xxs font-extrabold px-2.5 py-1 rounded-full border whitespace-nowrap ${getTaskStatusBadgeStyle(task)}`}>
                    {getTaskStatusLabel(task)}
                  </span>
                </div>

                {/* Show defects if any */}
                {task.defects && task.defects.length > 0 && (
                  <div className="mt-2 pl-9 space-y-1">
                    {task.defects.map((defect, dIdx) => (
                      <div key={dIdx} className="flex items-center gap-1.5">
                        <span className="text-red-500 text-xs">🚨</span>
                        <span className="text-xs text-red-700 font-semibold">{defect}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Blocker Items List */}
      {readiness.criticalOpenItems && readiness.criticalOpenItems.length > 0 && (
        <div className="card border-red-200 bg-red-50/20">
          <h2 className="text-xl font-bold text-red-900 mb-4 flex items-center gap-2">
            <span>⚠️</span> Kerusakan Kritis (Blockers)
          </h2>
          <div className="space-y-3">
            {readiness.criticalOpenItems.map((log: any) => {
              const defects = log.responses.filter((r: any) => {
                const { itemId, value } = r;
                if (value === 'tidak siap' || value === 'tidak_siap' || value === false) return true;
                if (itemId === 'hsd-current') {
                  const hsdFull = parseFloat(log.responses.find((x: any) => x.itemId === 'hsd-full')?.value || '30000');
                  if (parseFloat(value) < hsdFull * 0.5) return true;
                }
                if (itemId === 'at-current') {
                  const atFull = parseFloat(log.responses.find((x: any) => x.itemId === 'at-full')?.value || '6000');
                  if (parseFloat(value) < atFull * 0.6) return true;
                }
                return false;
              });

              return defects.map((defect: any, dIdx: number) => {
                let defectLabel = '';
                const { itemId, value } = defect;
                if (value === 'tidak siap' || value === 'tidak_siap') {
                  defectLabel = `${itemId.toUpperCase().replace('-STATUS', '')} dalam kondisi Tidak Siap`;
                } else if (value === false) {
                  defectLabel = `${itemId.toUpperCase()} tidak berfungsi / rusak`;
                } else if (itemId === 'hsd-current') {
                  const hsdFull = parseFloat(log.responses.find((x: any) => x.itemId === 'hsd-full')?.value || '30000');
                  defectLabel = `Volume HSD Rendah: ${parseFloat(value).toLocaleString('id-ID')}L (${((parseFloat(value)/hsdFull)*100).toFixed(1)}%)`;
                } else if (itemId === 'at-current') {
                  const atFull = parseFloat(log.responses.find((x: any) => x.itemId === 'at-full')?.value || '6000');
                  defectLabel = `Volume Air Tawar Rendah: ${parseFloat(value).toLocaleString('id-ID')}L (${((parseFloat(value)/atFull)*100).toFixed(1)}%)`;
                }

                return (
                  <div key={`${log.id}-${dIdx}`} className="p-3.5 bg-white rounded-xl border border-red-200 shadow-sm flex items-start gap-2.5">
                    <span className="text-red-500 font-bold">🚨</span>
                    <div>
                      <p className="font-extrabold text-xxs text-red-900 uppercase tracking-wider">Komponen: {log.taskName || log.taskId}</p>
                      <p className="text-xs text-gray-800 font-semibold mt-1">{defectLabel}</p>
                    </div>
                  </div>
                );
              });
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4">Aksi</h2>
        <div className="space-y-2">
          {readiness.score >= 80 ? (
            <button className="btn-primary w-full">
              ✅ Deklarasi Kesiapan Kapal
            </button>
          ) : (
            <button className="btn-secondary w-full cursor-not-allowed opacity-50">
              Selesaikan Pemeliharaan Terlebih Dahulu (Skor: {readiness.score}%)
            </button>
          )}
          <button
            className="btn-secondary w-full"
            onClick={() => onNavigateToTasks && onNavigateToTasks()}
          >
            📋 Lihat & Isi Tugas Pemeliharaan
          </button>
        </div>
      </div>

      {/* Last Updated */}
      <p className="text-sm text-gray-500 text-center">
        Terakhir diperbarui: {new Date(readiness.timestamp).toLocaleString('id-ID')}
      </p>
    </div>
  );
};
