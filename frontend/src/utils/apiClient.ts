import axios from 'axios';
import syncQueue from './syncQueue';

const API_BASE = import.meta.env.VITE_API_URL || '';

// ============================================================
// MOCK DATA — Digunakan ketika API tidak tersedia (Vercel demo)
// ============================================================
const MOCK_VESSELS = [
  {
    id: 'vessel-001',
    name: 'KRI Raden Eddy Martadinata',
    imo: '4559566',
    mmsi: '525014086',
    metadata: {
      commissioned: 2017, homeport: 'Surabaya', budget: 4620000000000,
      asalNama: 'Raden Eddy Martadinata', pembangun: 'Damen Schelde Naval Shipbuilding & PAL Indonesia', biaya: 'US$300 Juta (Rp4,62 Triliun)',
      pasangLunas: '16 April 2014', diluncurkan: '18 Januari 2016', mulaiBerlayar: '7 April 2017',
      callsign: 'YCTN', nomorLambung: '331', statusArmada: 'Aktif bertugas',
      kelasDanJenis: 'fregat kelas Martadinata', beratBenaman: '2.365 ton', panjang: '105,11 m', lebar: '14,02 m', saratAir: '3,75 m',
      pendorong: 'CODOE, 2x 10000 kW MCR diesel engines, 2x 1300 kW electric motors', kecepatan: 'Maks 28 knot, Jelajah 18 knot',
      jangkauan: 'Jelajah 3.600 nmi, Ketahanan > 20 hari', awakKapal: '122 personel',
      sensorDanSistem: 'Thales Group TACTICOS, SMART-S Mk2', peralatanPerangElektronik: 'Sistem Decoy',
      senjata: 'OTO Melara 76 mm, MBDA VL MICA, Exocet MM40 Block III, Torpedo',
      pelindung: 'Anti-peluru', pesawatDiangkut: '1 x AS565 Panther helikopter', fasilitasPenerbangan: 'Heli deck dan Hangar'
    },
    createdAt: new Date().toISOString()
  },
  {
    id: 'vessel-002',
    name: 'KRI Diponegoro',
    imo: '9345678',
    mmsi: '525014087',
    metadata: {
      commissioned: 2007, homeport: 'Surabaya', budget: 2500000000000,
      asalNama: 'Pangeran Diponegoro', pembangun: 'Damen Schelde Naval Shipbuilding', biaya: 'US$250 Juta',
      pasangLunas: '24 Maret 2005', diluncurkan: '16 September 2006', mulaiBerlayar: '2 Juli 2007',
      callsign: 'YCTO', nomorLambung: '365', statusArmada: 'Aktif bertugas',
      kelasDanJenis: 'korvet kelas Diponegoro (SIGMA 9113)', beratBenaman: '1.692 ton', panjang: '90,71 m', lebar: '13,02 m', saratAir: '3,60 m',
      pendorong: '2x SEMT Pielstick 20PA6B STC diesel engines', kecepatan: 'Maks 28 knot, Jelajah 18 knot',
      jangkauan: 'Jelajah 3.600 nmi', awakKapal: '80 personel',
      sensorDanSistem: 'Thales TACTICOS, MW08 3D radar', peralatanPerangElektronik: 'ESM Thales DR3000',
      senjata: 'OTO Melara 76 mm, MBDA Mistral TETRAL, Exocet MM40 Block II',
      pelindung: 'Sistem Decoy Terma SKWS', pesawatDiangkut: '1 x helikopter (tanpa hangar)', fasilitasPenerbangan: 'Heli deck'
    },
    createdAt: new Date().toISOString()
  },
  {
    id: 'vessel-003',
    name: 'KRI Ahmad Yani',
    imo: '0000351',
    mmsi: '525000351',
    metadata: {
      commissioned: 1986, homeport: 'Surabaya', budget: 1500000000000,
      asalNama: 'Ahmad Yani', pembangun: 'KMS, Vlissingen', biaya: '-',
      pasangLunas: '-', diluncurkan: '1965', mulaiBerlayar: '1986',
      callsign: '-', nomorLambung: '351', statusArmada: 'Aktif bertugas',
      kelasDanJenis: 'fregat kelas Ahmad Yani', tipe: 'Fregat', beratBenaman: '2.835 ton', panjang: '113,4 m', lebar: '12,5 m', saratAir: '5,8 m',
      pendorong: '2x boiler, 2x turbin uap', kecepatan: 'Maks 28,5 knot',
      jangkauan: '4.500 nmi', awakKapal: '254 personel',
      sensorDanSistem: 'Signaal DA.05', peralatanPerangElektronik: '-',
      senjata: 'OTO Melara 76 mm, C-802, Torpedo', pelindung: '-', pesawatDiangkut: '1 x helikopter', fasilitasPenerbangan: 'Heli deck dan Hangar'
    },
    createdAt: new Date().toISOString()
  },
  {
    id: 'vessel-004',
    name: 'KRI Yos Sudarso',
    imo: '0000353',
    mmsi: '525000353',
    metadata: {
      commissioned: 1987, homeport: 'Surabaya', budget: 1500000000000,
      asalNama: 'Yos Sudarso', pembangun: 'NDSM, Amsterdam', biaya: '-',
      pasangLunas: '-', diluncurkan: '1966', mulaiBerlayar: '1987',
      callsign: '-', nomorLambung: '353', statusArmada: 'Aktif bertugas',
      kelasDanJenis: 'fregat kelas Ahmad Yani', tipe: 'Fregat', beratBenaman: '2.835 ton', panjang: '113,4 m', lebar: '12,5 m', saratAir: '5,8 m',
      pendorong: '2x boiler, 2x turbin uap', kecepatan: 'Maks 28,5 knot',
      jangkauan: '4.500 nmi', awakKapal: '254 personel',
      sensorDanSistem: 'Signaal DA.05', peralatanPerangElektronik: '-',
      senjata: 'OTO Melara 76 mm, C-802, Torpedo', pelindung: '-', pesawatDiangkut: '1 x helikopter', fasilitasPenerbangan: 'Heli deck dan Hangar'
    },
    createdAt: new Date().toISOString()
  },
  {
    id: 'vessel-005',
    name: 'KRI Oswald Siahaan',
    imo: '0000354',
    mmsi: '525000354',
    metadata: {
      commissioned: 1988, homeport: 'Surabaya', budget: 1500000000000,
      asalNama: 'Oswald Siahaan', pembangun: 'KMS, Vlissingen', biaya: '-',
      pasangLunas: '-', diluncurkan: '1967', mulaiBerlayar: '1988',
      callsign: '-', nomorLambung: '354', statusArmada: 'Aktif bertugas',
      kelasDanJenis: 'fregat kelas Ahmad Yani', tipe: 'Fregat', beratBenaman: '2.835 ton', panjang: '113,4 m', lebar: '12,5 m', saratAir: '5,8 m',
      pendorong: '2x boiler, 2x turbin uap', kecepatan: 'Maks 28,5 knot',
      jangkauan: '4.500 nmi', awakKapal: '254 personel',
      sensorDanSistem: 'Signaal DA.05', peralatanPerangElektronik: '-',
      senjata: 'OTO Melara 76 mm, Yakhont, Torpedo', pelindung: '-', pesawatDiangkut: '1 x helikopter', fasilitasPenerbangan: 'Heli deck dan Hangar'
    },
    createdAt: new Date().toISOString()
  },
  {
    id: 'vessel-006',
    name: 'KRI Abdul Halim Perdanakusuma',
    imo: '0000355',
    mmsi: '525000355',
    metadata: {
      commissioned: 1989, homeport: 'Surabaya', budget: 1500000000000,
      asalNama: 'Abdul Halim Perdanakusuma', pembangun: 'NDSM, Amsterdam', biaya: '-',
      pasangLunas: '-', diluncurkan: '1967', mulaiBerlayar: '1989',
      callsign: '-', nomorLambung: '355', statusArmada: 'Aktif bertugas',
      kelasDanJenis: 'fregat kelas Ahmad Yani', tipe: 'Fregat', beratBenaman: '2.835 ton', panjang: '113,4 m', lebar: '12,5 m', saratAir: '5,8 m',
      pendorong: '2x boiler, 2x turbin uap', kecepatan: 'Maks 28,5 knot',
      jangkauan: '4.500 nmi', awakKapal: '254 personel',
      sensorDanSistem: 'Signaal DA.05', peralatanPerangElektronik: '-',
      senjata: 'OTO Melara 76 mm, C-802, Torpedo', pelindung: '-', pesawatDiangkut: '1 x helikopter', fasilitasPenerbangan: 'Heli deck dan Hangar'
    },
    createdAt: new Date().toISOString()
  },
  {
    id: 'vessel-007',
    name: 'KRI Karel Satsuitubun',
    imo: '0000356',
    mmsi: '525000356',
    metadata: {
      commissioned: 1989, homeport: 'Surabaya', budget: 1500000000000,
      asalNama: 'Karel Satsuitubun', pembangun: 'NDSM, Amsterdam', biaya: '-',
      pasangLunas: '-', diluncurkan: '1967', mulaiBerlayar: '1989',
      callsign: '-', nomorLambung: '356', statusArmada: 'Aktif bertugas',
      kelasDanJenis: 'fregat kelas Ahmad Yani', tipe: 'Fregat', beratBenaman: '2.835 ton', panjang: '113,4 m', lebar: '12,5 m', saratAir: '5,8 m',
      pendorong: '2x boiler, 2x turbin uap', kecepatan: 'Maks 28,5 knot',
      jangkauan: '4.500 nmi', awakKapal: '254 personel',
      sensorDanSistem: 'Signaal DA.05', peralatanPerangElektronik: '-',
      senjata: 'OTO Melara 76 mm, C-802, Torpedo', pelindung: '-', pesawatDiangkut: '1 x helikopter', fasilitasPenerbangan: 'Heli deck dan Hangar'
    },
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

  /** Create vessel */
  async createVessel(vesselData: { name: string; imo: string; mmsi: string; metadata?: any }) {
    const newMock = {
      id: `vessel-${Date.now()}`,
      name: vesselData.name,
      imo: vesselData.imo,
      mmsi: vesselData.mmsi,
      metadata: vesselData.metadata || {},
      createdAt: new Date().toISOString()
    };
    
    MOCK_VESSELS.push(newMock);

    return this.tryFetch(
      async () => {
        const r = await axios.post(
          `${API_BASE}/api/v1/vessels`,
          vesselData,
          { headers: this.getHeaders() }
        );
        return r.data;
      },
      newMock
    );
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

  /** Update vessel */
  async updateVessel(vesselId: string, vesselData: { name: string; imo: string; mmsi: string; metadata?: any }) {
    const index = MOCK_VESSELS.findIndex(v => v.id === vesselId);
    if (index !== -1) {
      MOCK_VESSELS[index] = { ...MOCK_VESSELS[index], ...vesselData };
    }

    return this.tryFetch(
      async () => {
        const r = await axios.put(
          `${API_BASE}/api/v1/vessels/${vesselId}`,
          vesselData,
          { headers: this.getHeaders() }
        );
        return r.data;
      },
      MOCK_VESSELS[index]
    );
  }

  /** Delete vessel */
  async deleteVessel(vesselId: string) {
    const index = MOCK_VESSELS.findIndex(v => v.id === vesselId);
    if (index !== -1) {
      MOCK_VESSELS.splice(index, 1);
    }

    return this.tryFetch(
      async () => {
        const r = await axios.delete(`${API_BASE}/api/v1/vessels/${vesselId}`, { headers: this.getHeaders() });
        return r.data;
      },
      { success: true }
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
