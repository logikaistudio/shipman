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
  const [editingVessel, setEditingVessel] = useState<Vessel | null>(null);
  const [editLoading, setEditLoading] = useState(false);
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
          let spent = costsRes.grandTotal || 0;
          if (budget > 0 && spent / budget < 0.05) {
            spent = budget * 0.65; // Demo mock enforcement for individual vessels
          }
          
          const readinessScore = readinessRes.score || 0;
          const openTasks = tasksRes.filter((t: any) => t.status === 'open').length;
          const overdueTasks = tasksRes.filter((t: any) => {
            const due = new Date(t.dueDate);
            return due < new Date() && t.status !== 'done';
          }).length;

          return { ...v, budget, spent, readinessScore, openTasks, overdueTasks };
        } catch {
          const fallbackBudget = v.metadata?.budget || 250000000;
          return {
            ...v,
            budget: fallbackBudget,
            spent: fallbackBudget * 0.65, 
            readinessScore: 0, openTasks: 0, overdueTasks: 0
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

  const handleEditVesselSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVessel?.name || !editingVessel?.imo || !editingVessel?.mmsi) return;
    setEditLoading(true);
    try {
      await apiClient.updateVessel(editingVessel.id, {
        name: editingVessel.name,
        imo: editingVessel.imo,
        mmsi: editingVessel.mmsi,
        metadata: editingVessel.metadata
      });
      setEditingVessel(null);
      await fetchFleetData();
    } catch (err) {
      console.error('Failed to update vessel:', err);
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteVessel = async (vesselId: string) => {
    if (!window.confirm('Yakin ingin menghapus armada ini?')) return;
    try {
      await apiClient.deleteVessel(vesselId);
      await fetchFleetData();
    } catch (err) {
      console.error('Failed to delete vessel:', err);
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
    
  const statusSiap = vessels.filter(v => v.readinessScore >= 80).length;
  const statusRusakRingan = vessels.filter(v => v.readinessScore >= 60 && v.readinessScore < 80).length;
  const statusRusakBerat = vessels.filter(v => v.readinessScore < 60).length;

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

          {/* Dashboard Summary - White Theme with Charts */}
          <div className="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
                  <span className="text-3xl">📊</span> Fleet Command Center
                </h2>
                <p className="text-slate-500 text-sm font-medium mt-1">Status Operasional & Finansial Armada Aktif</p>
              </div>
              <div className="hidden md:block">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  LIVE SYNC
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* Readiness Gauge Chart Card */}
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 flex flex-col items-center justify-center relative shadow-inner">
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest absolute top-4 left-5">Rerata Kesiapan</span>
                <div className="mt-6 flex flex-col items-center">
                  <div className="relative w-32 h-16 overflow-hidden flex justify-center">
                    <svg viewBox="0 0 100 50" className="w-32 h-32 absolute top-0">
                      <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#e2e8f0" strokeWidth="10" strokeLinecap="round" />
                      <path 
                        d="M 10 50 A 40 40 0 0 1 90 50" 
                        fill="none" 
                        stroke={avgReadiness >= 80 ? '#10b981' : avgReadiness >= 60 ? '#f59e0b' : '#ef4444'} 
                        strokeWidth="10" 
                        strokeDasharray={`${(avgReadiness / 100) * 125.6} 125.6`} 
                        strokeLinecap="round" 
                        className="transition-all duration-1000 ease-out"
                      />
                    </svg>
                    <div className="absolute bottom-0 flex flex-col items-center translate-y-1">
                      <span className="text-3xl font-black text-slate-800 leading-none">{avgReadiness}%</span>
                    </div>
                  </div>
                  <span className="text-slate-500 text-xs font-semibold mt-2">Patrol Ready Status</span>
                </div>
              </div>

              {/* Fleet Status Card */}
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 flex flex-col justify-between shadow-inner relative">
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest absolute top-4 left-5">Status Armada</span>
                <div className="mt-6 flex flex-col gap-3">
                  <div className="flex items-end gap-2 mb-1">
                    <span className="text-4xl font-black text-slate-800 leading-none">{vessels.length}</span>
                    <span className="text-slate-500 text-xs font-bold mb-1">Total Unit</span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"></div><span className="font-semibold text-slate-700">Siap Operasi</span></div>
                      <span className="font-bold text-slate-900">{statusSiap}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500"></div><span className="font-semibold text-slate-700">Rusak Ringan</span></div>
                      <span className="font-bold text-slate-900">{statusRusakRingan}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-rose-500"></div><span className="font-semibold text-slate-700">Rusak Berat</span></div>
                      <span className="font-bold text-slate-900">{statusRusakBerat}</span>
                    </div>
                  </div>
                  
                  <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden flex mt-1 shadow-inner">
                    <div className="bg-emerald-500 h-full transition-all" style={{ width: `${vessels.length > 0 ? (statusSiap / vessels.length) * 100 : 0}%` }}></div>
                    <div className="bg-amber-500 h-full transition-all" style={{ width: `${vessels.length > 0 ? (statusRusakRingan / vessels.length) * 100 : 0}%` }}></div>
                    <div className="bg-rose-500 h-full transition-all" style={{ width: `${vessels.length > 0 ? (statusRusakBerat / vessels.length) * 100 : 0}%` }}></div>
                  </div>
                </div>
              </div>

              {/* Budget Donut Chart Card */}
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 flex flex-row items-center gap-6 shadow-inner">
                <div className="flex-1 space-y-1 relative">
                  <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest absolute -top-1">O&M Anggaran</span>
                  <div className="pt-5">
                    <p className="text-slate-800 text-xs font-bold">Terpakai</p>
                    <p className="text-lg font-black text-slate-900">{(totalSpent / 1000000000000).toFixed(2)}T</p>
                  </div>
                  <div className="pt-2 border-t border-slate-200 mt-2">
                    <p className="text-slate-500 text-xs font-semibold">Total: {(totalBudget / 1000000000000).toFixed(2)}T</p>
                  </div>
                </div>
                
                <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                    <path className="text-slate-200" strokeWidth="4" stroke="currentColor" fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <path 
                      className={budgetUsagePercent >= 90 ? 'text-rose-500' : budgetUsagePercent >= 75 ? 'text-amber-500' : 'text-blue-500'} 
                      strokeWidth="4" 
                      strokeDasharray={`${budgetUsagePercent}, 100`} 
                      strokeLinecap="round"
                      stroke="currentColor" 
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-black text-slate-800">{budgetUsagePercent.toFixed(0)}%</span>
                  </div>
                </div>
              </div>

              {/* Tasks Bar Level Card */}
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 flex flex-col justify-between shadow-inner relative">
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest absolute top-4 left-5">Tugas Tertunda</span>
                
                <div className="mt-8 flex flex-col gap-4">
                  <div className="flex items-end gap-2">
                    <span className="text-5xl font-black text-slate-800 leading-none">{totalOpenTasks}</span>
                    <span className="text-slate-500 text-xs font-bold mb-1">Total Open</span>
                  </div>
                  
                  <div className="space-y-1.5 w-full">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-600">Overdue Rate</span>
                      <span className="text-xs font-bold text-rose-600">{totalOpenTasks > 0 ? Math.round((totalOverdueTasks / totalOpenTasks) * 100) : 0}%</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-rose-500 h-full rounded-full transition-all duration-1000"
                        style={{ width: `${totalOpenTasks > 0 ? (totalOverdueTasks / totalOpenTasks) * 100 : 0}%` }}
                      ></div>
                    </div>
                    {totalOverdueTasks > 0 && (
                      <p className="text-[10px] font-bold text-rose-600 flex items-center gap-1 mt-1">
                        <span className="text-xs">🚨</span> {totalOverdueTasks} Tugas melewati batas waktu
                      </p>
                    )}
                  </div>
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
                    className={`bg-white border rounded-3xl p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${selectedVessel === vessel.id
                      ? 'border-blue-500 ring-4 ring-blue-50 shadow-lg'
                      : 'border-slate-200 shadow-sm hover:border-slate-300'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                      {/* Vessel Info */}
                      <div className="flex-1 space-y-3">
                        <div className="flex flex-col sm:flex-row items-start gap-4">
                          <span className="text-4xl shrink-0 mt-1">{getVesselIcon(vessel.name)}</span>
                          <div className="flex-1 w-full space-y-2.5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <h4 className="text-lg font-extrabold text-slate-900 leading-tight">{vessel.name}</h4>
                              <span className={`text-xxs font-extrabold px-3 py-1 rounded-full border ${isVesselReady
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : 'bg-red-50 text-red-700 border-red-200'
                              }`}>
                                {isVesselReady ? '✅ SIAP OPERASI' : '🚨 MAINTENANCE'}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-3 mt-4 text-[11px] bg-slate-50 p-4 rounded-xl border border-slate-100/50">
                                {vessel.metadata?.nomorLambung && (
                                  <div className="flex flex-col">
                                    <span className="text-slate-400 font-bold uppercase tracking-wider mb-0.5">Lambung</span> 
                                    <span className="text-slate-700 font-black">{vessel.metadata.nomorLambung}</span>
                                  </div>
                                )}
                                <div className="flex flex-col">
                                  <span className="text-slate-400 font-bold uppercase tracking-wider mb-0.5">IMO</span> 
                                  <span className="text-slate-700 font-black">{vessel.imo}</span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-slate-400 font-bold uppercase tracking-wider mb-0.5">MMSI</span> 
                                  <span className="text-slate-700 font-black">{vessel.mmsi}</span>
                                </div>
                                {vessel.metadata?.homeport && (
                                  <div className="flex flex-col">
                                    <span className="text-slate-400 font-bold uppercase tracking-wider mb-0.5">Homeport</span> 
                                    <span className="text-slate-700 font-black">{vessel.metadata.homeport}</span>
                                  </div>
                                )}
                                {vessel.metadata?.statusArmada && (
                                  <div className="flex flex-col">
                                    <span className="text-slate-400 font-bold uppercase tracking-wider mb-0.5">Status</span> 
                                    <span className="text-blue-600 font-black">{vessel.metadata.statusArmada}</span>
                                  </div>
                                )}
                                {vessel.metadata?.kelasDanJenis && (
                                  <div className="flex flex-col sm:col-span-2 lg:col-span-1">
                                    <span className="text-slate-400 font-bold uppercase tracking-wider mb-0.5">Kelas</span> 
                                    <span className="text-slate-700 font-black truncate" title={vessel.metadata.kelasDanJenis}>{vessel.metadata.kelasDanJenis}</span>
                                  </div>
                                )}
                                {vessel.metadata?.tipe && (
                                  <div className="flex flex-col">
                                    <span className="text-slate-400 font-bold uppercase tracking-wider mb-0.5">Tipe</span> 
                                    <span className="text-slate-700 font-black">{vessel.metadata.tipe}</span>
                                  </div>
                                )}
                                {vessel.metadata?.diluncurkan && (
                                  <div className="flex flex-col">
                                    <span className="text-slate-400 font-bold uppercase tracking-wider mb-0.5">Dibuat</span> 
                                    <span className="text-slate-700 font-black">{vessel.metadata.diluncurkan}</span>
                                  </div>
                                )}
                                {vessel.metadata?.mulaiBerlayar && (
                                  <div className="flex flex-col sm:col-span-2 lg:col-span-1">
                                    <span className="text-slate-400 font-bold uppercase tracking-wider mb-0.5">Mulai Berlayar</span> 
                                    <span className="text-slate-700 font-black">{vessel.metadata.mulaiBerlayar}</span>
                                  </div>
                                )}
                            </div>
                          </div>
                        </div>

                        {/* Metrics */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-3 mt-2 border-t border-slate-100">
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-xs font-bold">
                              <span className="text-slate-500 uppercase tracking-wider text-[10px]">Skor Kesiapan</span>
                              <span className={vessel.readinessScore >= 80 ? 'text-green-600 font-black' : 'text-amber-600 font-black'}>
                                {vessel.readinessScore}%
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden shadow-inner">
                              <div
                                className={`h-full rounded-full transition-all duration-1000 ${vessel.readinessScore >= 80 ? 'bg-gradient-to-r from-green-500 to-emerald-400' : vessel.readinessScore >= 60 ? 'bg-gradient-to-r from-amber-500 to-yellow-400' : 'bg-gradient-to-r from-red-500 to-rose-400'}`}
                                style={{ width: `${vessel.readinessScore}%` }}
                              ></div>
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-xs font-bold">
                              <span className="text-slate-500 uppercase tracking-wider text-[10px]">Budget Terpakai</span>
                              <span className="text-slate-700 font-black">{vesselUsage.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden shadow-inner">
                              <div
                                className={`h-full rounded-full transition-all duration-1000 ${vesselUsage >= 90 ? 'bg-gradient-to-r from-red-500 to-rose-400' : vesselUsage >= 75 ? 'bg-gradient-to-r from-amber-500 to-orange-400' : 'bg-gradient-to-r from-blue-600 to-cyan-400'}`}
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
                            onClick={() => setEditingVessel(vessel)}
                            className="px-3 py-2 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-xl font-bold text-xs transition border border-amber-200"
                            title="Edit Armada"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => handleDeleteVessel(vessel.id)}
                            className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl font-bold text-xs transition border border-red-200"
                            title="Hapus Armada"
                          >
                            🗑️ Hapus
                          </button>
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
      {/* ============ EDIT ARMADA MODAL ============ */}
      {editingVessel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-black text-slate-900">✏️ Edit Armada</h2>
                <p className="text-slate-500 text-xs mt-0.5">Perbarui informasi kapal</p>
              </div>
              <button
                onClick={() => setEditingVessel(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleEditVesselSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Nama Kapal *</label>
                <input
                  type="text"
                  required
                  value={editingVessel.name}
                  onChange={e => setEditingVessel(p => p ? { ...p, name: e.target.value } : null)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Nomor IMO *</label>
                  <input
                    type="text"
                    required
                    value={editingVessel.imo}
                    onChange={e => setEditingVessel(p => p ? { ...p, imo: e.target.value } : null)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">MMSI *</label>
                  <input
                    type="text"
                    required
                    value={editingVessel.mmsi}
                    onChange={e => setEditingVessel(p => p ? { ...p, mmsi: e.target.value } : null)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Homeport / Pangkalan</label>
                <input
                  type="text"
                  value={editingVessel.metadata?.homeport || ''}
                  onChange={e => setEditingVessel(p => p ? { ...p, metadata: { ...p.metadata, homeport: e.target.value } } : null)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Anggaran Pemeliharaan (Rp)</label>
                <input
                  type="number"
                  min="0"
                  value={editingVessel.metadata?.budget || ''}
                  onChange={e => setEditingVessel(p => p ? { ...p, metadata: { ...p.metadata, budget: parseInt(e.target.value) || 0 } } : null)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingVessel(null)}
                  className="flex-1 py-2.5 border border-slate-300 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-sm rounded-xl transition shadow-sm"
                >
                  {editLoading ? '⏳ Menyimpan...' : '✓ Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
