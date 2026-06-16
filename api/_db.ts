import { VercelRequest, VercelResponse } from '@vercel/node';

// ============================================================
// MOCK IN-MEMORY DATABASE (shared module pattern via global)
// ============================================================
// Since Vercel functions are stateless, we use a stable in-memory
// store initialized fresh per cold-start with realistic seed data.

type UserRole = 'Admin' | 'Officer' | 'ChiefEngineer' | 'Crew';
type TaskStatus = 'open' | 'in-progress' | 'done' | 'overdue';
type SystemType = 'engine' | 'electrical' | 'interior' | 'exterior';

interface Vessel {
  id: string; name: string; imo: string; mmsi: string;
  metadata?: Record<string, any>; createdAt: Date;
}
interface ScheduledTask {
  id: string; vesselId: string; templateId: string; systemType: SystemType;
  name: string; description?: string; dueDate: Date; status: TaskStatus; createdAt: Date;
}
interface LogEntry {
  id: string; taskId: string; taskName?: string; userId: string; timestamp: Date;
  responses: Array<{ itemId: string; value: any; notes?: string }>;
  attachments: any[]; actualCost?: { parts: number; labor: number };
}

// Use globalThis to persist across hot reloads in dev; fresh on each cold-start in prod
const g = globalThis as any;
if (!g.__shipmanInit) {
  g.__shipmanInit = true;
  g.__vessels = new Map<string, Vessel>();
  g.__tasks = new Map<string, ScheduledTask>();
  g.__logs = new Map<string, LogEntry>();

  // Seed vessels
  const vessels: Vessel[] = [
    { id: 'vessel-001', name: 'KRI Hang Tuah', imo: '1234567', mmsi: '5120140', metadata: { commissioned: 2015, homeport: 'Jakarta', budget: 250000000 }, createdAt: new Date() },
    { id: 'vessel-002', name: 'KRI Teluk Peleng', imo: '1234568', mmsi: '5120141', metadata: { commissioned: 2018, homeport: 'Surabaya', budget: 150000000 }, createdAt: new Date() }
  ];
  vessels.forEach(v => g.__vessels.set(v.id, v));

  // Seed 11 O&M tasks per vessel
  const systems = [
    { name: 'Bakap', desc: 'Badan Kapal: AGA, BGA & jadwal docking', sys: 'exterior' as SystemType },
    { name: 'Sistem Pendorong', desc: 'Mesin Pendorong (MPK I/II/III), Gearbox, Propeller', sys: 'engine' as SystemType },
    { name: 'Liskap', desc: 'Kelistrikan: Diesel Generator I/II & Darurat', sys: 'electrical' as SystemType },
    { name: 'Alnavkom', desc: 'Alat Navigasi & Komunikasi: Gyro Compass', sys: 'electrical' as SystemType },
    { name: 'Pesawat Bantu', desc: 'Pompa DPK, AL AC, Pompa BB, Pompa AT', sys: 'engine' as SystemType },
    { name: 'Sistem Pipa', desc: 'Pemeriksaan Sistem Pipa AL, AT, dan Bahan Bakar', sys: 'engine' as SystemType },
    { name: 'Akomodasi', desc: 'Sistem Pendingin AC (1/2/3) & Coolbox', sys: 'interior' as SystemType },
    { name: 'Pesawat Bahari', desc: 'Lier Jangkar & Peralatan Kemudi Bahari', sys: 'exterior' as SystemType },
    { name: 'Alat Keselamatan', desc: 'APAR, CO2 Central, Life Raft, Sekoci, Life Jacket', sys: 'interior' as SystemType },
    { name: 'Persenjataan', desc: 'Meriam Haluan 20mm & Meriam Buritan 12.7mm', sys: 'exterior' as SystemType },
    { name: 'Logca', desc: 'Logistik Cair: BBM (HSD) & Air Tawar (AT)', sys: 'engine' as SystemType }
  ];

  ['vessel-001', 'vessel-002'].forEach(vId => {
    systems.forEach((sys, idx) => {
      const id = `task-${vId}-${idx + 1}`;
      g.__tasks.set(id, {
        id, vesselId: vId,
        templateId: `temp-${sys.name.toLowerCase().replace(/\s+/g, '-')}`,
        systemType: sys.sys, name: sys.name, description: sys.desc,
        dueDate: new Date('2026-06-10'),
        status: (idx === 0 || idx === 2) ? 'done' : 'open',
        createdAt: new Date()
      });
    });
  });

  // Seed log entries
  const log1: LogEntry = {
    id: 'log-001', taskId: 'task-vessel-001-1', userId: 'user-001',
    timestamp: new Date('2026-06-05'),
    responses: [{ itemId: 'aga', value: 'siap' }, { itemId: 'bga', value: 'siap' }],
    attachments: [], actualCost: { parts: 5000000, labor: 2000000 }
  };
  const log2: LogEntry = {
    id: 'log-002', taskId: 'task-vessel-001-3', userId: 'user-002',
    timestamp: new Date('2026-06-03'),
    responses: [
      { itemId: 'dg1-status', value: 'siap' }, { itemId: 'dg1-jp', value: '27986' },
      { itemId: 'dg2-status', value: 'tidak siap' }, { itemId: 'dg2-jp', value: '18832' }
    ],
    attachments: [], actualCost: { parts: 1500000, labor: 1000000 }
  };
  g.__logs.set(log1.id, log1);
  g.__logs.set(log2.id, log2);
}

export const vessels: Map<string, Vessel> = g.__vessels;
export const tasks: Map<string, ScheduledTask> = g.__tasks;
export const logs: Map<string, LogEntry> = g.__logs;
