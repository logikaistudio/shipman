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
g.__shipmanInit = true;
g.__vessels = new Map<string, Vessel>();
g.__tasks = new Map<string, ScheduledTask>();
g.__logs = new Map<string, LogEntry>();

  // Seed vessels
  const vessels: Vessel[] = [
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
      createdAt: new Date()
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
      createdAt: new Date()
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
      createdAt: new Date()
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
      createdAt: new Date()
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
      createdAt: new Date()
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
      createdAt: new Date()
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
      createdAt: new Date()
    }
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

  ['vessel-001', 'vessel-002', 'vessel-003', 'vessel-004', 'vessel-005', 'vessel-006', 'vessel-007'].forEach(vId => {
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
export const vessels: Map<string, Vessel> = g.__vessels;
export const tasks: Map<string, ScheduledTask> = g.__tasks;
export const logs: Map<string, LogEntry> = g.__logs;
