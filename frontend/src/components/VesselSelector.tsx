import React, { useEffect, useState } from 'react';
import { useAuth } from '../utils/authContext';
import { VesselDetailModal } from './VesselDetailModal';

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
  const { user } = useAuth();

  useEffect(() => {
    fetchFleetData();
  }, []);

  const fetchFleetData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/vessels');
      const data = await response.json();

      // Fetch additional O&M info for each vessel concurrently
      const enriched = await Promise.all(data.map(async (v: any) => {
        try {
          const [costsRes, readinessRes, tasksRes] = await Promise.all([
            fetch(`/api/v1/vessels/${v.id}/costs?period=2026-06`).then(r => r.json()),
            fetch(`/api/v1/vessels/${v.id}/readiness`).then(r => r.json()),
            fetch(`/api/v1/tasks?vesselId=${v.id}`).then(r => r.json())
          ]);

          const budget = v.metadata?.budget || 10000;
          const spent = costsRes.grandTotal || 0;
          const readinessScore = readinessRes.score || 0;
          const openTasks = tasksRes.filter((t: any) => t.status === 'open').length;
          const overdueTasks = tasksRes.filter((t: any) => {
            const due = new Date(t.dueDate);
            return due < new Date() && t.status !== 'done';
          }).length;

          return {
            ...v,
            budget,
            spent,
            readinessScore,
            openTasks,
            overdueTasks
          };
        } catch (err) {
          console.error(`Failed to load details for ${v.name}:`, err);
          return {
            ...v,
            budget: v.metadata?.budget || 10000,
            spent: 0,
            readinessScore: 0,
            openTasks: 0,
            overdueTasks: 0
          };
        }
      }));

      setVessels(enriched);
      if (enriched.length > 0) {
        setSelectedVessel(enriched[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch vessels:', err);
    } finally {
      setLoading(false);
    }
  };

  const getVesselIcon = (name: string) => {
    if (name.toLowerCase().includes('hang')) return '⚓';
    if (name.toLowerCase().includes('teluk')) return '🌊';
    return '🚢';
  };

  // Fleet wide aggregations
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
          
          {/* Dashboard Summary Panel (Commander Dashboard) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <span>📊</span> Fleet Condition Summary
              </h2>
              <p className="text-slate-500 text-xs font-semibold">Kondisi armada militer aktif per Juni 2026</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Avg Readiness */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
                <span className="text-slate-550 text-xs font-bold uppercase tracking-wider">Rerata Kesiapan</span>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className={`text-2xl font-black ${
                    avgReadiness >= 80 ? 'text-green-600' : avgReadiness >= 60 ? 'text-amber-600' : 'text-red-600'
                  }`}>{avgReadiness}%</span>
                  <span className="text-slate-400 text-xxs font-semibold">Patrol Ready</span>
                </div>
              </div>

              {/* Total Cost */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between col-span-1 md:col-span-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-550 text-xs font-bold uppercase tracking-wider">Anggaran Terpakai</span>
                  <span className="text-slate-700 text-xs font-bold">Rp {totalSpent.toLocaleString('id-ID')} / Rp {totalBudget.toLocaleString('id-ID')}</span>
                </div>
                <div className="mt-2 space-y-1">
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-500 ${
                        budgetUsagePercent >= 90 ? 'bg-red-500' : budgetUsagePercent >= 75 ? 'bg-amber-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min(budgetUsagePercent, 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xxs text-slate-500 font-semibold">
                    <span>{budgetUsagePercent.toFixed(1)}% terpakai</span>
                    <span>Sisa: Rp {(totalBudget - totalSpent).toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>

              {/* Tasks Counter */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
                <span className="text-slate-550 text-xs font-bold uppercase tracking-wider">Pemeliharaan Tertunda</span>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-2xl font-black text-slate-800">{totalOpenTasks}</span>
                  {totalOverdueTasks > 0 && (
                    <span className="text-xs font-bold text-red-700 flex items-center bg-red-50 py-0.5 px-2 rounded-full border border-red-200">
                      🚨 {totalOverdueTasks} Overdue
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Vessel Grid list */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Pilih Kapal untuk Detail O&M</h3>
            
            <div className="grid gap-5">
              {vessels.map((vessel) => {
                const isVesselReady = vessel.readinessScore >= 80 && vessel.overdueTasks === 0;
                const vesselUsage = vessel.budget > 0 ? (vessel.spent / vessel.budget) * 100 : 0;
                
                return (
                  <div
                    key={vessel.id}
                    onClick={() => handleSelectVessel(vessel.id)}
                    className={`bg-white border rounded-2xl p-5 cursor-pointer transition transform hover:scale-[1.01] hover:border-slate-300 ${
                      selectedVessel === vessel.id
                        ? 'border-blue-600 ring-2 ring-blue-500 shadow-md'
                        : 'border-slate-200/80 shadow-sm'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row gap-5 items-start md:items-center justify-between">
                      {/* Vessel Details */}
                      <div className="flex-1 space-y-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-3xl">{getVesselIcon(vessel.name)}</span>
                          <div>
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
                          <span className={`ml-auto md:ml-2 text-xxs font-extrabold px-3 py-1 rounded-full border ${
                            isVesselReady 
                              ? 'bg-green-50 text-green-700 border-green-200' 
                              : 'bg-red-50 text-red-700 border-red-200'
                          }`}>
                            {isVesselReady ? '✅ SIAP OPERASI (READY)' : '🚨 PEMELIHARAAN (MAINTENANCE)'}
                          </span>
                        </div>

                        {/* Metrics Bar */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                          {/* Readiness status */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs font-bold">
                              <span className="text-slate-500">Skor Kesiapan:</span>
                              <span className={vessel.readinessScore >= 80 ? 'text-green-600' : 'text-amber-600'}>
                                {vessel.readinessScore}%
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full border border-slate-200/50">
                              <div 
                                className={`h-1.5 rounded-full ${
                                  vessel.readinessScore >= 80 ? 'bg-green-500' : vessel.readinessScore >= 60 ? 'bg-amber-500' : 'bg-red-500'
                                  }`}
                                style={{ width: `${vessel.readinessScore}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* Budget status */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs font-bold">
                              <span className="text-slate-500">Budget Terpakai:</span>
                              <span className="text-slate-700">Rp {vessel.spent.toLocaleString('id-ID')} / Rp {vessel.budget.toLocaleString('id-ID')}</span>
                            </div>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full border border-slate-200/50">
                              <div 
                                className={`h-1.5 rounded-full ${
                                  vesselUsage >= 90 ? 'bg-red-500' : vesselUsage >= 75 ? 'bg-amber-500' : 'bg-blue-500'
                                }`}
                                style={{ width: `${Math.min(vesselUsage, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right checklist stats */}
                      <div className="flex items-center gap-4 w-full md:w-auto border-t border-slate-100 md:border-t-0 pt-3 md:pt-0 justify-between">
                        <div className="text-right">
                          <span className="text-slate-400 text-xxs font-bold uppercase block tracking-wider">Tugas O&M</span>
                          <span className="text-slate-800 text-sm font-extrabold">{vessel.openTasks} Aktif</span>
                          {vessel.overdueTasks > 0 && (
                            <span className="text-xs text-red-650 font-black ml-2">({vessel.overdueTasks} Overdue)</span>
                          )}
                        </div>
                        
                        {selectedVessel === vessel.id && (
                          <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold text-white shadow">
                            ✓
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Button */}
          {selectedVessel && (
            <button
              onClick={() => onVesselSelected(selectedVessel)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition text-md shadow hover:shadow-md flex items-center justify-center gap-2 border border-blue-600"
            >
              <span>Lanjutkan ke Dashboard Kapal</span>
              <span>→</span>
            </button>
          )}

          {/* Detailed Vessel Modal */}
          {selectedVessel && (
            <VesselDetailModal
              isOpen={isDetailOpen}
              onClose={() => setIsDetailOpen(false)}
              vesselId={selectedVessel}
              vesselName={vessels.find(v => v.id === selectedVessel)?.name || ''}
              onUpdateSuccess={fetchFleetData}
            />
          )}
        </div>
      )}
    </div>
  );

  const handleSelectVessel = (vesselId: string) => {
    setSelectedVessel(vesselId);
    setIsDetailOpen(true);
  };
};
