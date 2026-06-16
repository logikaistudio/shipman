import React, { useEffect, useState } from 'react';
import { useAuth } from '../utils/authContext';
import { VesselDetailModal } from './VesselDetailModal';
import apiClient from '../utils/apiClient';

interface Vessel {
  id: string;
  name: string;
  imo: string;
  mmsi: string;
  metadata?: any;
  budget: number;
  spent: number;
  readinessScore: number;
  openTasks: number;
  overdueTasks: number;
}

interface VesselSelectorProps {
  onVesselSelected: (vesselId: string) => void;
  onLogout: () => void;
}

export const VesselSelector: React.FC<VesselSelectorProps> = ({ onVesselSelected, onLogout }) => {
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVessel, setSelectedVessel] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', imo: '', mmsi: '', homeport: '', budget: '' });
  const [addLoading, setAddLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchFleetData();
  }, []);

  // ---- fetch using apiClient (has mock fallback) ----
  const fetchFleetData = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getVessels();

      const enriched = await Promise.all(data.map(async (v: any) => {
        try {
          const [costsRes, readinessRes, tasksRes] = await Promise.all([
            apiClient.getCosts(v.id, '2026-06'),
            apiClient.getReadiness(v.id),
            apiClient.getTasks(v.id)
          ]);

          const budget = v.metadata?.budget || 250000000;
          const spent = costsRes.grandTotal || 0;
          const readinessScore = readinessRes.score || 0;
          const openTasks = tasksRes.filter((t: any) => t.status === 'open').length;
          const overdueTasks = tasksRes.filter((t: any) => {
            const due = new Date(t.dueDate);
            return due < new Date() && t.status !== 'done';
          }).length;

          return { ...v, budget, spent, readinessScore, openTasks, overdueTasks };
        } catch {
          return {
            ...v,
            budget: v.metadata?.budget || 250000000,
            spent: 0, readinessScore: 0, openTasks: 0, overdueTasks: 0
          };
        }
      }));

      setVessels(enriched);
      if (enriched.length > 0 && !selectedVessel) setSelectedVessel(enriched[0].id);
    } catch (err) {
      console.error('Failed to fetch vessels:', err);
    } finally {
      setLoading(false);
    }
  };

  // ---- handlers (MUST be before return) ----
  const handleSelectVessel = (vesselId: string) => {
    setSelectedVessel(vesselId);
    setIsDetailOpen(true);
  };

  const handleAddVessel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name || !addForm.imo || !addForm.mmsi) return;
    setAddLoading(true);
    try {
      await apiClient.createVessel({
        name: addForm.name,
        imo: addForm.imo,
        mmsi: addForm.mmsi,
        metadata: {
          homeport: addForm.homeport,
          budget: parseInt(addForm.budget) || 100000000,
          commissioned: new Date().getFullYear()
        }
      });
      setAddForm({ name: '', imo: '', mmsi: '', homeport: '', budget: '' });
      setIsAddModalOpen(false);
      await fetchFleetData();
    } catch (err) {
      console.error('Failed to add vessel:', err);
    } finally {
      setAddLoading(false);
    }
  };

  const getVesselIcon = (name: string) => {
    if (name.toLowerCase().includes('hang')) return '⚓';
    if (name.toLowerCase().includes('teluk')) return '🌊';
    if (name.toLowerCase().includes('kri')) return '🛡️';
    return '🚢';
  };

  // Fleet-wide aggregations
  const totalBudget = vessels.reduce((sum, v) => sum + v.budget, 0);
  const totalSpent = vessels.reduce((sum, v) => sum + v.spent, 0);
  const avgReadiness = vessels.length > 0
    ? Math.round(vessels.reduce((sum, v) => sum + v.readinessScore, 0) / vessels.length)
    : 0;
  const totalOpenTasks = vessels.reduce((sum, v) => sum + v.openTasks, 0);
  const totalOverdueTasks = vessels.reduce((sum, v) => sum + v.overdueTasks, 0);
  const budgetUsagePercent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20">
      {/* Premium Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-3xl">⚓</span>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                SHIPMAN <span className="text-xs bg-blue-600 text-white font-semibold py-0.5 px-2 rounded-full">HQ FLEET</span>
              </h1>
              <p className="text-slate-500 text-xs mt-0.5 font-medium">Komando Armada / Fleet Command</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-slate-800 text-sm font-bold">{user?.name}</p>
              <p className="text-slate-500 text-xs capitalize font-semibold">{user?.role}</p>
            </div>
            <button
              onClick={onLogout}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-xs transition border border-slate-200"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-slate-500 text-sm font-semibold">Menghubungkan ke Pusat Data Armada...</span>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">

          {/* Dashboard Summary */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <span>📊</span> Fleet Condition Summary
              </h2>
              <p className="text-slate-500 text-xs font-semibold">Kondisi armada militer aktif per Juni 2026</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
                <span className="text-slate-550 text-xs font-bold uppercase tracking-wider">Rerata Kesiapan</span>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className={`text-2xl font-black ${avgReadiness >= 80 ? 'text-green-600' : avgReadiness >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                    {avgReadiness}%
                  </span>
                  <span className="text-slate-400 text-xxs font-semibold">Patrol Ready</span>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between col-span-1 md:col-span-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-550 text-xs font-bold uppercase tracking-wider">Anggaran Terpakai</span>
                  <span className="text-slate-700 text-xs font-bold">
                    Rp {totalSpent.toLocaleString('id-ID')} / Rp {totalBudget.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="mt-2 space-y-1">
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${budgetUsagePercent >= 90 ? 'bg-red-500' : budgetUsagePercent >= 75 ? 'bg-amber-500' : 'bg-blue-500'}`}
                      style={{ width: `${Math.min(budgetUsagePercent, 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xxs text-slate-500 font-semibold">
                    <span>{budgetUsagePercent.toFixed(1)}% terpakai</span>
                    <span>Sisa: Rp {(totalBudget - totalSpent).toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
                <span className="text-slate-550 text-xs font-bold uppercase tracking-wider">Pemeliharaan Tertunda</span>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-2xl font-black text-slate-800">{totalOpenTasks}</span>
                  {totalOverdueTasks > 0 && (
                    <span className="text-xs font-bold text-red-700 flex items-center bg-red-50 py-0.5 px-2 rounded-full border border-red-200">
                      🚨 {totalOverdueTasks}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Vessel Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Pilih Kapal untuk Detail O&M ({vessels.length} armada)
              </h3>
              <button
                id="btn-tambah-armada"
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-sm hover:shadow-md"
              >
                <span className="text-base">＋</span>
                <span>Tambah Armada</span>
              </button>
            </div>

            <div className="grid gap-4">
              {vessels.map((vessel) => {
                const isVesselReady = vessel.readinessScore >= 80 && vessel.overdueTasks === 0;
                const vesselUsage = vessel.budget > 0 ? (vessel.spent / vessel.budget) * 100 : 0;

                return (
                  <div
                    key={vessel.id}
                    className={`bg-white border rounded-2xl p-5 transition hover:shadow-md ${selectedVessel === vessel.id
                      ? 'border-blue-500 ring-2 ring-blue-200 shadow-md'
                      : 'border-slate-200 shadow-sm hover:border-slate-300'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                      {/* Vessel Info */}
                      <div className="flex-1 space-y-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-3xl">{getVesselIcon(vessel.name)}</span>
                          <div className="flex-1">
                            <h4 className="text-lg font-extrabold text-slate-900">{vessel.name}</h4>
                            <div className="flex gap-2 text-xxs text-slate-500 mt-0.5 font-medium">
                              <span>IMO: {vessel.imo}</span>
                              <span>•</span>
                              <span>MMSI: {vessel.mmsi}</span>
                              {vessel.metadata?.homeport && (
                                <>
                                  <span>•</span>
                                  <span>Homeport: {vessel.metadata.homeport}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <span className={`text-xxs font-extrabold px-3 py-1 rounded-full border ${isVesselReady
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                          }`}>
                            {isVesselReady ? '✅ SIAP OPERASI' : '🚨 MAINTENANCE'}
                          </span>
                        </div>

                        {/* Metrics */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs font-bold">
                              <span className="text-slate-500">Skor Kesiapan:</span>
                              <span className={vessel.readinessScore >= 80 ? 'text-green-600' : 'text-amber-600'}>
                                {vessel.readinessScore}%
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full">
                              <div
                                className={`h-1.5 rounded-full ${vessel.readinessScore >= 80 ? 'bg-green-500' : vessel.readinessScore >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                                style={{ width: `${vessel.readinessScore}%` }}
                              ></div>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs font-bold">
                              <span className="text-slate-500">Budget Terpakai:</span>
                              <span className="text-slate-700">{vesselUsage.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full">
                              <div
                                className={`h-1.5 rounded-full ${vesselUsage >= 90 ? 'bg-red-500' : vesselUsage >= 75 ? 'bg-amber-500' : 'bg-blue-500'}`}
                                style={{ width: `${Math.min(vesselUsage, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Stats + Buttons */}
                      <div className="flex flex-row md:flex-col items-center gap-3 w-full md:w-auto border-t border-slate-100 md:border-t-0 pt-3 md:pt-0">
                        <div className="text-center md:text-right flex-1 md:flex-none">
                          <span className="text-slate-400 text-xxs font-bold uppercase block tracking-wider">Tugas O&M</span>
                          <span className="text-slate-800 text-sm font-extrabold">{vessel.openTasks} Aktif</span>
                          {vessel.overdueTasks > 0 && (
                            <span className="text-xs text-red-600 font-bold block">({vessel.overdueTasks} Overdue)</span>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          <button
                            id={`btn-detail-${vessel.id}`}
                            onClick={() => handleSelectVessel(vessel.id)}
                            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition border border-slate-200"
                          >
                            📋 Detail
                          </button>
                          <button
                            id={`btn-dashboard-${vessel.id}`}
                            onClick={() => onVesselSelected(vessel.id)}
                            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition shadow-sm"
                          >
                            O&M →
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {vessels.length === 0 && (
                <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-2xl">
                  <p className="text-4xl mb-3">🚢</p>
                  <p className="text-slate-500 font-bold text-sm">Belum ada armada terdaftar</p>
                  <p className="text-slate-400 text-xs mt-1">Klik "Tambah Armada" untuk mendaftarkan kapal baru</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Vessel Detail Modal */}
      {selectedVessel && (
        <VesselDetailModal
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          vesselId={selectedVessel}
          vesselName={vessels.find(v => v.id === selectedVessel)?.name || ''}
          onUpdateSuccess={fetchFleetData}
        />
      )}

      {/* ============ TAMBAH ARMADA MODAL ============ */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-black text-slate-900">🚢 Daftarkan Armada Baru</h2>
                <p className="text-slate-500 text-xs mt-0.5">Tambahkan kapal ke sistem monitoring O&M</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAddVessel} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Nama Kapal *</label>
                <input
                  id="input-vessel-name"
                  type="text"
                  required
                  value={addForm.name}
                  onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="KRI Hang Tuah"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Nomor IMO *</label>
                  <input
                    id="input-vessel-imo"
                    type="text"
                    required
                    value={addForm.imo}
                    onChange={e => setAddForm(p => ({ ...p, imo: e.target.value }))}
                    placeholder="1234567"
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">MMSI *</label>
                  <input
                    id="input-vessel-mmsi"
                    type="text"
                    required
                    value={addForm.mmsi}
                    onChange={e => setAddForm(p => ({ ...p, mmsi: e.target.value }))}
                    placeholder="5120140"
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Homeport / Pangkalan</label>
                <input
                  id="input-vessel-homeport"
                  type="text"
                  value={addForm.homeport}
                  onChange={e => setAddForm(p => ({ ...p, homeport: e.target.value }))}
                  placeholder="Jakarta"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Anggaran Pemeliharaan (Rp)</label>
                <input
                  id="input-vessel-budget"
                  type="number"
                  min="0"
                  value={addForm.budget}
                  onChange={e => setAddForm(p => ({ ...p, budget: e.target.value }))}
                  placeholder="100000000"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-300 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  id="btn-simpan-armada"
                  type="submit"
                  disabled={addLoading}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-sm rounded-xl transition shadow-sm"
                >
                  {addLoading ? '⏳ Menyimpan...' : '✓ Daftarkan Kapal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
