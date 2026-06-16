import React, { useState, useEffect } from 'react';
import apiClient from '../utils/apiClient';
import { ChecklistForm } from './ChecklistForm';

interface Task {
  id: string;
  vesselId: string;
  templateId: string;
  name: string;
  description?: string;
  dueDate: string;
  status: 'open' | 'in-progress' | 'done';
  createdAt: string;
}

export const TasksScreen: React.FC<{ vesselId: string }> = ({ vesselId }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'done'>('all');

  useEffect(() => {
    fetchTasks();
  }, [vesselId]);

  // Auto-select first task if none selected when tasks load
  useEffect(() => {
    if (tasks.length > 0 && !selectedTask) {
      setSelectedTask(tasks[0]);
    } else if (selectedTask) {
      const current = tasks.find(t => t.id === selectedTask.id);
      if (current) {
        setSelectedTask(current);
      }
    }
  }, [tasks]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getTasks(vesselId);
      setTasks(data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string, isOverdue: boolean) => {
    if (status === 'done') {
      return 'bg-green-100 text-green-800 text-xxs font-extrabold px-2.5 py-1 rounded-full border border-green-200';
    }
    if (isOverdue) {
      return 'bg-red-100 text-red-800 text-xxs font-extrabold px-2.5 py-1 rounded-full border border-red-200 animate-pulse';
    }
    return 'bg-yellow-100 text-yellow-800 text-xxs font-extrabold px-2.5 py-1 rounded-full border border-yellow-250';
  };

  const getStatusIcon = (status: string, isOverdue: boolean) => {
    if (status === 'done') return '✅';
    if (isOverdue) return '🚨';
    return '⭕';
  };

  const getStatusText = (status: string, isOverdue: boolean) => {
    if (status === 'done') return 'SIAP';
    if (isOverdue) return 'OVERDUE';
    return 'TERTUNDA';
  };

  const filteredTasks = tasks.filter(t => {
    if (filterStatus === 'all') return true;
    return t.status === filterStatus;
  });

  if (loading && tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-2">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm text-gray-500 font-medium">Memuat Daftar Tugas O&M...</span>
      </div>
    );
  }

  const overdueTasksCount = tasks.filter(t => {
    const due = new Date(t.dueDate);
    return due < new Date() && t.status !== 'done';
  }).length;

  return (
    <div className="p-4 bg-gray-50 min-h-screen pb-28">
      {/* Page Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <span>📋</span> Maintenance & O&M Workspace
          </h1>
          <p className="text-gray-500 text-xs mt-1">Kelola dan isi checklist kelaikan komponen kapal</p>
        </div>

        {/* Filters */}
        <div className="flex bg-gray-250 p-1.5 rounded-xl border border-gray-200 gap-1 self-start sm:self-auto">
          {(['all', 'open', 'done'] as const).map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterStatus === status
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <span className="capitalize">{status === 'open' ? 'Tertunda' : status === 'done' ? 'Selesai/Siap' : 'Semua'}</span>
              <span className="ml-1 text-xxs px-1.5 py-0.2 bg-gray-100 text-gray-600 rounded-full font-semibold">
                {status === 'all' && tasks.length}
                {status === 'open' && tasks.filter(t => t.status === 'open').length}
                {status === 'done' && tasks.filter(t => t.status === 'done').length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Overdue Alert Banner */}
      {overdueTasksCount > 0 && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 shadow-sm">
          <span className="text-2xl">🚨</span>
          <div>
            <p className="text-red-950 font-bold text-sm">Ada {overdueTasksCount} Tugas Pemeliharaan Terlambat!</p>
            <p className="text-red-750 text-xs">Segera selesaikan checklist sistem kritikal untuk menjaga readiness score kapal.</p>
          </div>
        </div>
      )}

      {/* Split-pane Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Submenu (Tasks Sidebar) */}
        <div className="lg:col-span-1 space-y-3 bg-white rounded-2xl p-4 border border-gray-200 shadow-sm max-h-[calc(100vh-240px)] overflow-y-auto sticky top-20">
          <span className="text-xxs font-extrabold uppercase tracking-wider text-gray-400 block mb-2 px-1">Sub Menu O&M Kapal</span>
          
          {filteredTasks.length === 0 ? (
            <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed">
              <p className="text-gray-500 text-xs font-semibold">Tidak ada tugas dalam filter ini</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTasks.map(task => {
                const due = new Date(task.dueDate);
                const isOverdue = due < new Date() && task.status !== 'done';
                const isActive = selectedTask?.id === task.id;

                return (
                  <button
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all flex justify-between items-center gap-3 ${
                      isActive
                        ? 'border-blue-600 bg-blue-50/50 shadow-md ring-1 ring-blue-500'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-lg">{getStatusIcon(task.status, isOverdue)}</span>
                        <span className={`font-bold text-xs truncate ${isActive ? 'text-blue-900' : 'text-gray-950'}`}>
                          {task.name}
                        </span>
                      </div>
                      <p className="text-xxs text-gray-500 truncate">{task.description}</p>
                    </div>
                    
                    <div className={getStatusBadge(task.status, isOverdue)}>
                      {getStatusText(task.status, isOverdue)}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Details Pane (Active checklist form) */}
        <div className="lg:col-span-2 max-h-[calc(100vh-200px)] overflow-y-auto rounded-2xl">
          {selectedTask ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Form Title details */}
              <div className="bg-slate-900 text-white p-5 border-b border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                      <span>⚙️</span> Checklist {selectedTask.name}
                    </h2>
                    <p className="text-slate-400 text-xs mt-1 font-semibold">{selectedTask.description}</p>
                  </div>
                  
                  <span className={`text-xxs font-extrabold px-3 py-1 rounded-full border uppercase tracking-wider ${
                    selectedTask.status === 'done'
                      ? 'bg-green-950 border-green-800 text-green-400'
                      : 'bg-yellow-950 border-yellow-800 text-yellow-400'
                  }`}>
                    {selectedTask.status === 'done' ? '✅ SIAP / SELESAI' : '⭕ TERTUNDA'}
                  </span>
                </div>
              </div>

              {/* Form container */}
              <ChecklistForm
                taskId={selectedTask.id}
                taskName={selectedTask.name}
                onSubmit={() => {
                  fetchTasks();
                }}
              />
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 border-dashed p-16 text-center space-y-3 shadow-sm">
              <span className="text-4xl block">📋</span>
              <h3 className="font-bold text-gray-900">Belum ada tugas dipilih</h3>
              <p className="text-gray-500 text-xs max-w-sm mx-auto">Silakan pilih salah satu sub-menu tugas O&M di sebelah kiri untuk menampilkan form checklist detail.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
