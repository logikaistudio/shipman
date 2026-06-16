import axios from 'axios';
import syncQueue from './syncQueue';

const API_BASE = import.meta.env.VITE_API_URL || '';

// ============================================================
// MOCK DATA — Digunakan ketika API tidak tersedia (Vercel demo)
// ============================================================
const MOCK_VESSELS = [
  {
    id: 'vessel-001',
    name: 'KRI Hang Tuah',
    imo: '1234567',
    mmsi: '5120140',
    metadata: { commissioned: 2015, homeport: 'Jakarta', budget: 250000000 },
    createdAt: new Date().toISOString()
  },
  {
    id: 'vessel-002',
    name: 'KRI Teluk Peleng',
    imo: '1234568',
    mmsi: '5120141',
    metadata: { commissioned: 2018, homeport: 'Surabaya', budget: 150000000 },
    createdAt: new Date().toISOString()
  }
];

const MOCK_SYSTEMS = [
  { name: 'Bakap', desc: 'Badan Kapal: AGA, BGA & jadwal docking', sys: 'exterior', status: 'done' },
  { name: 'Sistem Pendorong', desc: 'Mesin Pendorong (MPK I/II/III), Gearbox, Propeller & Kemudi', sys: 'engine', status: 'open' },
  { name: 'Liskap', desc: 'Kelistrikan Kapal: Diesel Generator I/II & Darurat', sys: 'electrical', status: 'done' },
  { name: 'Alnavkom', desc: 'Alat Navigasi & Komunikasi: Gyro Compass', sys: 'electrical', status: 'open' },
  { name: 'Pesawat Bantu', desc: 'Pompa DPK (Pemadam), AL AC, Pompa BB, Pompa AT', sys: 'engine', status: 'open' },
  { name: 'Sistem Pipa', desc: 'Pemeriksaan Sistem Pipa AL, AT, dan Bahan Bakar', sys: 'engine', status: 'open' },
  { name: 'Akomodasi', desc: 'Sistem Pendingin AC (1/2/3) & Coolbox', sys: 'interior', status: 'open' },
  { name: 'Pesawat Bahari', desc: 'Lier Jangkar & Peralatan Kemudi Bahari', sys: 'exterior', status: 'open' },
  { name: 'Alat Keselamatan', desc: 'APAR, CO2 Central, Life Raft, Sekoci, Life Jacket', sys: 'interior', status: 'open' },
  { name: 'Persenjataan', desc: 'Meriam Haluan 20mm & Meriam Buritan 12.7mm ka/ki', sys: 'exterior', status: 'open' },
  { name: 'Logca', desc: 'Logistik Cair: Monitoring BBM (HSD) & Air Tawar (AT)', sys: 'engine', status: 'open' }
];

function buildMockTasks(vesselId: string) {
  return MOCK_SYSTEMS.map((sys, idx) => ({
    id: `task-${vesselId}-${idx + 1}`,
    vesselId,
    templateId: `temp-${sys.name.toLowerCase().replace(/\s+/g, '-')}`,
    systemType: sys.sys,
    name: sys.name,
    description: sys.desc,
    dueDate: '2026-06-10T00:00:00.000Z',
    recurrence: { type: 'daily', interval: 1 },
    status: sys.status,
    createdAt: new Date().toISOString()
  }));
}

// In-memory task state for demo (tracks changes within session)
const _sessionTasks: Map<string, any> = new Map();

function getSessionTasks(vesselId: string) {
  if (!_sessionTasks.has(vesselId)) {
    buildMockTasks(vesselId).forEach(t => _sessionTasks.set(t.id, t));
  }
  return Array.from(_sessionTasks.values()).filter(t => t.vesselId === vesselId);
}

function buildMockReadiness(vesselId: string) {
  const tasks = getSessionTasks(vesselId);
  const doneTasks = tasks.filter(t => t.status === 'done');
  const score = tasks.length > 0 ? Math.round((doneTasks.length / tasks.length) * 100) : 0;
  const systemTypes = ['engine', 'electrical', 'interior', 'exterior'];
  return {
    vesselId,
    timestamp: new Date().toISOString(),
    score,
    perSystem: systemTypes.map(sys => ({
      system: sys,
      score: Math.round((tasks.filter(t => t.systemType === sys && t.status === 'done').length /
        Math.max(1, tasks.filter(t => t.systemType === sys).length)) * 100),
      criticalOpen: tasks.filter(t => t.systemType === sys && t.status === 'open').length
    })),
    perTask: tasks.map(t => ({
      taskId: t.id, name: t.name, description: t.description || '',
      status: t.status, systemType: t.systemType,
      defectCount: 0, defects: [], isReady: t.status === 'done'
    })),
    criticalOpenItems: [],
    missionProfile: 'patrol'
  };
}

function buildMockCosts(vesselId: string, period: string) {
  const vessel = MOCK_VESSELS.find(v => v.id === vesselId);
  return {
    vesselId, period,
    totalParts: 6500000,
    totalLabor: 3000000,
    totalMisc: 500000,
    grandTotal: 10000000,
    budget: vessel?.metadata?.budget || 250000000
  };
}

const MOCK_COST_DRIVERS = [
  { label: 'Suku Cadang DG II', cost: 4500000 },
  { label: 'Overhaul MPK III', cost: 3200000 },
  { label: 'Labor Teknik', cost: 2000000 },
  { label: 'Valve Pipa AL', cost: 1200000 },
  { label: 'Filter Bahan Bakar', cost: 800000 }
];

// ============================================================
// API CLIENT
// ============================================================
class ApiClient {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

  private getHeaders() {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    return headers;
  }

  private async tryFetch<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
    try {
      return await fn();
    } catch {
      return fallback;
    }
  }

  /** Login */
  async login(email: string, password: string) {
    try {
      const response = await axios.post(`${API_BASE}/api/v1/auth/login`, { email, password });
      this.setToken(response.data.token);
      return response.data;
    } catch {
      throw new Error('login_failed');
    }
  }

  /** Get vessels */
  async getVessels() {
    return this.tryFetch(
      async () => {
        const r = await axios.get(`${API_BASE}/api/v1/vessels`, { headers: this.getHeaders() });
        if (!r.data || r.data.length === 0) throw new Error('empty');
        return r.data;
      },
      MOCK_VESSELS
    );
  }

  /** Get vessel detail */
  async getVessel(vesselId: string) {
    const fallback = MOCK_VESSELS.find(v => v.id === vesselId) || MOCK_VESSELS[0];
    return this.tryFetch(
      async () => {
        const r = await axios.get(`${API_BASE}/api/v1/vessels/${vesselId}`, { headers: this.getHeaders() });
        return r.data;
      },
      fallback
    );
  }

  /** Get readiness */
  async getReadiness(vesselId: string, missionProfile: string = 'patrol') {
    return this.tryFetch(
      async () => {
        const r = await axios.get(
          `${API_BASE}/api/v1/vessels/${vesselId}/readiness?missionProfile=${missionProfile}`,
          { headers: this.getHeaders() }
        );
        return r.data;
      },
      buildMockReadiness(vesselId)
    );
  }

  /** Get costs */
  async getCosts(vesselId: string, period: string) {
    return this.tryFetch(
      async () => {
        const r = await axios.get(
          `${API_BASE}/api/v1/vessels/${vesselId}/costs?period=${period}`,
          { headers: this.getHeaders() }
        );
        return r.data;
      },
      buildMockCosts(vesselId, period)
    );
  }

  /** Get cost drivers */
  async getCostDrivers(vesselId: string, period: string) {
    return this.tryFetch(
      async () => {
        const r = await axios.get(
          `${API_BASE}/api/v1/vessels/${vesselId}/costs/drivers?period=${period}`,
          { headers: this.getHeaders() }
        );
        return r.data;
      },
      MOCK_COST_DRIVERS
    );
  }

  /** Get tasks */
  async getTasks(vesselId?: string, status?: string) {
    return this.tryFetch(
      async () => {
        let url = `${API_BASE}/api/v1/tasks`;
        const params = new URLSearchParams();
        if (vesselId) params.append('vesselId', vesselId);
        if (status) params.append('status', status);
        if (params.toString()) url += `?${params.toString()}`;
        const r = await axios.get(url, { headers: this.getHeaders() });
        if (!r.data || r.data.length === 0) throw new Error('empty');
        return r.data;
      },
      vesselId ? getSessionTasks(vesselId).filter(t => !status || t.status === status) : []
    );
  }

  /** Complete task (with offline + mock support) */
  async completeTask(taskId: string, data: any) {
    // Update local session state immediately
    const task = _sessionTasks.get(taskId);
    if (task) {
      task.status = 'done';
      _sessionTasks.set(taskId, task);
    }

    const payload = { type: 'logEntry' as const, taskId, ...data };

    if (!syncQueue.getOnlineStatus()) {
      const eventId = syncQueue.enqueue('logEntry', payload, 'high');
      return { queued: true, eventId };
    }

    try {
      const r = await axios.post(
        `${API_BASE}/api/v1/tasks/${taskId}/complete`,
        data,
        { headers: this.getHeaders() }
      );
      return r.data;
    } catch {
      // Offline queue fallback
      const eventId = syncQueue.enqueue('logEntry', payload, 'high');
      return { queued: true, eventId };
    }
  }

  /** Get mission profiles */
  async getMissionProfiles() {
    return this.tryFetch(
      async () => {
        const r = await axios.get(`${API_BASE}/api/v1/mission-profiles`, { headers: this.getHeaders() });
        return r.data;
      },
      [{ id: 'patrol', name: 'Patrol', systemWeights: { engine: 0.35, electrical: 0.25, interior: 0.20, exterior: 0.20 }, criticalSystems: ['engine', 'electrical'] }]
    );
  }

  /** Sync offline changes */
  async syncOfflineChanges() {
    return syncQueue.syncPending(API_BASE, this.token || '');
  }
}

export default new ApiClient();
