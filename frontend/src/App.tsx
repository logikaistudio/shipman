import React, { useEffect, useState } from 'react';
import { ReadinessDashboard } from './components/ReadinessDashboard';
import { CostsScreen } from './components/CostsScreen';
import { TasksScreen } from './components/TasksScreen';
import { LoginScreen } from './components/LoginScreen';
import { VesselSelector } from './components/VesselSelector';
import { AuthProvider, useAuth } from './utils/authContext';
import syncQueue from './utils/syncQueue';
import './index.css';

interface VesselStats {
  readinessScore: number;
  isReady: boolean;
  overdueCount: number;
  budgetPercent: number;
}

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'readiness' | 'costs' | 'tasks'>('tasks');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');
  const [pendingCount, setPendingCount] = useState(0);
  const [vesselId, setVesselId] = useState<string | null>(() => {
    return localStorage.getItem('shipman_selected_vessel');
  });
  const [vessel, setVessel] = useState<{ name: string } | null>(null);
  const [vesselStats, setVesselStats] = useState<VesselStats | null>(null);
  const { isLoggedIn, logout, user } = useAuth();

  useEffect(() => {
    // Check sync status periodically
    const checkSync = setInterval(() => {
      setPendingCount(syncQueue.getPendingCount());
    }, 2000);

    return () => clearInterval(checkSync);
  }, []);

  useEffect(() => {
    if (vesselId) {
      fetch(`/api/v1/vessels/${vesselId}`)
        .then(res => res.json())
        .then(data => setVessel(data))
        .catch(err => console.error('Error fetching selected vessel:', err));
    } else {
      setVessel(null);
      setVesselStats(null);
    }
  }, [vesselId]);

  // Fetch vessel metrics for status badges
  useEffect(() => {
    if (vesselId) {
      const fetchStats = async () => {
        try {
          const [readinessRes, tasksRes, costsRes] = await Promise.all([
            fetch(`/api/v1/vessels/${vesselId}/readiness`).then(r => r.json()),
            fetch(`/api/v1/tasks?vesselId=${vesselId}`).then(r => r.json()),
            fetch(`/api/v1/vessels/${vesselId}/costs?period=2026-06`).then(r => r.json())
          ]);

          const overdueCount = tasksRes.filter((t: any) => {
            const due = new Date(t.dueDate);
            return due < new Date() && t.status !== 'done';
          }).length;

          const budget = costsRes.budget || 10000;
          const budgetPercent = budget > 0 ? (costsRes.grandTotal / budget) * 100 : 0;
          const isReady = (readinessRes.score || 0) >= 80 && (!readinessRes.criticalOpenItems || readinessRes.criticalOpenItems.length === 0);

          setVesselStats({
            readinessScore: readinessRes.score || 0,
            isReady,
            overdueCount,
            budgetPercent
          });
        } catch (err) {
          console.error('Error fetching metrics for navigation badges:', err);
        }
      };

      fetchStats();
      const interval = setInterval(fetchStats, 10000); // Poll every 10s
      return () => clearInterval(interval);
    }
  }, [vesselId, activeTab]);

  const handleSync = async () => {
    setSyncStatus('syncing');
    try {
      const result = await syncQueue.syncPending('', 'token');
      setSyncStatus(result.failed > 0 ? 'error' : 'idle');
      setPendingCount(syncQueue.getPendingCount());
    } catch (err) {
      setSyncStatus('error');
    }
  };

  // Render login screen if not authenticated
  if (!isLoggedIn) {
    return <LoginScreen onLoginSuccess={() => {}} />;
  }

  // Render vessel selector if no vessel selected
  if (!vesselId) {
    return (
      <VesselSelector
        onVesselSelected={(id) => {
          setVesselId(id);
          localStorage.setItem('shipman_selected_vessel', id);
        }}
        onLogout={logout}
      />
    );
  }

  // Render main dashboard
  return (
    <div className="min-h-screen bg-slate-50 text-slate-850">
      
      {/* Sync Status Banner */}
      {pendingCount > 0 && (
        <div className={`fixed top-0 left-0 right-0 p-3 text-white z-50 flex justify-between items-center transition-all ${
          syncStatus === 'syncing' ? 'bg-blue-600' : 'bg-amber-600'
        }`}>
          <span className="text-xs font-bold flex items-center gap-1.5">
            {syncStatus === 'syncing' ? '🔄 Sinkronisasi sedang berlangsung...' : `⚠️ ${pendingCount} perubahan belum disinkronkan`}
          </span>
          <div className="flex gap-2">
            {syncStatus !== 'syncing' && (
              <button
                onClick={handleSync}
                className="px-3 py-1 bg-white text-slate-950 rounded-lg font-bold text-xs shadow hover:bg-slate-100 transition"
              >
                Sinkronkan Sekarang
              </button>
            )}
            <button
              onClick={logout}
              className="px-3 py-1 bg-white/20 text-white rounded-lg font-bold text-xs hover:bg-white/30 transition border border-white/10"
            >
              Keluar
            </button>
          </div>
        </div>
      )}

      {/* Top Vessel Header Navigation Bar */}
      <div className={`bg-white border-b border-slate-200/85 px-4 py-4 sticky top-0 z-30 shadow-sm flex justify-between items-center ${
        pendingCount > 0 ? 'mt-14' : ''
      }`}>
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-xl shadow-sm">
            🚢
          </div>
          <div>
            <h2 className="font-extrabold text-sm sm:text-base text-slate-900 leading-none">
              {vessel ? vessel.name : 'Memuat Kapal...'}
            </h2>
            <p className="text-slate-500 text-xxs font-bold mt-1.5 uppercase tracking-wider flex items-center gap-1.5">
              <span>Dasbor Kapal</span>
              {vesselStats && (
                <span className={`inline-block w-1.5 h-1.5 rounded-full ${vesselStats.isReady ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden md:block border-r border-slate-200 pr-3 mr-1">
            <p className="text-xs font-bold text-slate-800">{user?.name}</p>
            <p className="text-slate-500 text-xxs font-bold uppercase tracking-wider">{user?.role}</p>
          </div>
          
          <button
            onClick={() => {
              setVesselId(null);
              localStorage.removeItem('shipman_selected_vessel');
            }}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-bold transition border border-slate-200 flex items-center gap-2 shadow-sm"
          >
            <span>←</span>
            <span>Kembali ke Armada</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="pb-36 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          {activeTab === 'tasks' && <TasksScreen vesselId={vesselId} />}
          {activeTab === 'readiness' && <ReadinessDashboard vesselId={vesselId} onNavigateToTasks={() => setActiveTab('tasks')} />}
          {activeTab === 'costs' && <CostsScreen vesselId={vesselId} />}
        </div>
      </div>

      {/* Premium Floating Navigation Menu (Light Glassmorphism) */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 w-[calc(100%-2rem)] max-w-md bg-white/95 backdrop-blur-xl border border-slate-200 flex gap-1.5 p-2 z-40 rounded-2xl shadow-xl shadow-slate-200/50">
        
        {/* Tab: Tasks */}
        <button
          onClick={() => setActiveTab('tasks')}
          className={`relative flex-1 py-3 px-2 rounded-xl flex flex-col items-center justify-center transition-all duration-200 active:scale-[0.96] ${
            activeTab === 'tasks'
              ? 'bg-blue-600 text-white shadow-md border border-blue-600'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <svg className="w-5 h-5 mb-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span className="text-xxs font-extrabold uppercase tracking-wider">Tugas</span>
          {vesselStats && vesselStats.overdueCount > 0 && (
            <span className="absolute -top-1.5 -right-1 min-w-5 h-5 px-1.5 bg-red-600 text-white text-xxs font-black rounded-full flex items-center justify-center border-2 border-white shadow">
              {vesselStats.overdueCount}
            </span>
          )}
        </button>

        {/* Tab: Readiness */}
        <button
          onClick={() => setActiveTab('readiness')}
          className={`relative flex-1 py-3 px-2 rounded-xl flex flex-col items-center justify-center transition-all duration-200 active:scale-[0.96] ${
            activeTab === 'readiness'
              ? 'bg-blue-600 text-white shadow-md border border-blue-600'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <svg className="w-5 h-5 mb-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2" />
          </svg>
          <span className="text-xxs font-extrabold uppercase tracking-wider">Kesiapan</span>
          {vesselStats && (
            <span className={`absolute top-2.5 right-6 w-2.5 h-2.5 rounded-full border-2 border-white ${
              vesselStats.isReady ? 'bg-green-500 animate-pulse' : 'bg-red-500'
            }`}></span>
          )}
        </button>

        {/* Tab: Costs */}
        <button
          onClick={() => setActiveTab('costs')}
          className={`relative flex-1 py-3 px-2 rounded-xl flex flex-col items-center justify-center transition-all duration-200 active:scale-[0.96] ${
            activeTab === 'costs'
              ? 'bg-blue-600 text-white shadow-md border border-blue-600'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <svg className="w-5 h-5 mb-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-xxs font-extrabold uppercase tracking-wider">Biaya</span>
          {vesselStats && (
            <span className="absolute bottom-1 w-12 bg-slate-100 h-1 rounded-full overflow-hidden border border-slate-200/50">
              <div 
                className={`h-full ${vesselStats.budgetPercent >= 90 ? 'bg-red-500' : 'bg-blue-500'}`} 
                style={{ width: `${Math.min(vesselStats.budgetPercent, 100)}%` }}
              ></div>
            </span>
          )}
        </button>
      </div>

    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
