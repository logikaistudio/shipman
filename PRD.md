# PRD: Aplikasi O&M Kapal (Mobile-first)

TL;DR
- Aplikasi mobile-first responsif untuk memantau Operation & Maintenance kapal (engine, kelistrikan, interior/exterior) berdasarkan jadwal perawatan harian, mingguan, berkala sesuai manual book. Fitur inti: logbook, checklist terjadwal, notifikasi, foto/attachment, offline-first dengan sinkronisasi, cost forecast, dan readiness scoring untuk kapal perang.

Tujuan
- Memastikan kepatuhan perawatan kapal terhadap manual book dan jadwal.
- Menyediakan rekam jejak (audit trail) yang dapat diandalkan untuk inspeksi dan klaim.
- Memudahkan awak kapal melakukan checklist harian/periodik dengan pengalaman mobile-first.

Tujuan Utama (Revisi untuk Kapal Perang)
- Menilai kesiapan kapal secara utuh dan memperlihatkan kebutuhan biaya perawatan, khususnya untuk kapal perang yang menunjang operasi militer.
- Fokus: kesiapan operasional (mission readiness), prioritas sistem kritikal, dan estimasi biaya untuk menyiapkan kapal dalam kondisi misi.

Scope (MVP)
1. User auth dasar (email/password + role: Admin, Chief Engineer, Crew)
2. Manajemen kapal (tambah/edit vessel dasar)
3. Checklist & Logbook per sistem (Engine, Electrical, Interior, Exterior) dengan template daily/weekly/periodic
4. Pembuatan tugas terjadwal (schedule) dan status (open/in-progress/done)
5. Form inspeksi sederhana: radio buttons, numeric fields, notes, foto
6. Notifikasi push/in-app untuk tugas yang due/overdue
7. Offline-first: isi checklist offline, sinkronisasi saat online
8. Dashboard ringkas: tugas hari ini, overdue, terakhir di-log

Persona
- Chief Engineer: butuh ringkasan tugas teknis, logbook lengkap, dan kemampuan menandatangani.
- Crew / Operator: butuh checklist harian yang sederhana dan cepat diisi.
- Fleet Manager / Shore Admin: butuh laporan, filter berdasarkan kapal dan periode, dan export CSV/PDF.

User Journeys Utama
- Crew membuka aplikasi → melihat tugas harian → mengisi checklist engine daily → upload foto → submit → sync.
- Chief Engineer meninjau logbook minggu lalu → memberi catatan dan menutup temuan.
- Fleet Manager membuat template checklist baru untuk perawatan mingguan.

Fitur Fungsional (Detail)
- Template Checklist: buat/edit template per sistem, tiap template berisi item, tipe input, toleransi/threshold.
- Schedule Engine: atur frekuensi (daily/weekly/monthly/interval jam) dan pengulangan.
- Logbook Entries: setiap submission membuat entry dengan timestamp, user, foto, lokasi (opsional), remarks.
- Task Management: assign/unassign, status, eskalasi (overdue → reminder).
- Attachments: foto, dokumen manual (PDF), kamera in-app.
- Search & Filter: by date, vessel, system, user, status.
- Reporting & Export: generate CSV/PDF untuk periode tertentu.
- Role-based Access Control: Admin full, Chief Engineer approve/close, Crew submit only.

Data Model (ringkas)
- Vessel: id, name, imo, mmsi, metadata
- User: id, name, role, contact
- TemplateChecklist: id, title, system, items[]
- ChecklistItem: id, label, inputType, threshold, required
- ScheduledTask: id, vesselId, templateId, dueDate, recurrence
- LogEntry: id, taskId/templateId, userId, timestamp, responses[], attachments[]
- Attachment: id, type, url, thumbnail

UX & UI Prinsip
- Mobile-first: satu-kolom, besar tap targets, offline sync indicator
- Fast data entry: default nilai, inline validation, camera shortcut
- Clear states: due/overdue/completed dengan warna konsisten
- Accessibility: kontras, ukuran teks yang bisa disesuaikan

Non-fungsional
- Offline-first dengan conflict resolution (last-writer-wins plus manual merge untuk entri kritis)
- Performa: target load screen < 300ms pada koneksi seluler khas
- Keamanan: TLS, enkripsi at-rest untuk attachments sensitif, audit logs
- Skalabilitas: multi-vessel, multi-user; API paginasi untuk log

Integrasi & Otomasi (opsional di fase 2)
- Sensor telemetry ingestion (engine hours, temperatures) via MQTT/HTTP
- Integrasi dengan PMS/CMMS perusahaan (API-based)
- SSO (SAML / OAuth) untuk perusahaan besar

Acceptance Criteria (MVP)
- Crew dapat menyelesaikan checklist daily dan data tersimpan/sinkron saat jaringan pulih
- Chief Engineer dapat melihat dan menandai log entries
- Notifikasi muncul saat tugas due/overdue
- Laporan CSV untuk range tanggal dapat diunduh

Risiko & Mitigasi
- Data loss saat offline → mitigasi: local persistent queue, retries, user-visible sync status
- Ketidaksesuaian template dengan manual book → mitigasi: buat editor template dan versi/approval workflow

Fitur Cost Forecast (Forecast Biaya Perawatan)
- Tujuan: Menyediakan estimasi biaya perawatan tiap kapal secara bulanan dan tahunan, membantu budgeting dan keputusan pemeliharaan.
- Ruang Lingkup: Definisikan item biaya per checklist/task: parts (unit cost, qty), labor (estimated hours), misc (consumables); LaborRate per role/vessel; kalkulasi otomatis; agregasi biaya per vessel; UI ringkasan dan export.

Readiness & Militer (Tambahan)
- Readiness Scoring: skor kesiapan per kapal (0–100) berdasarkan status sistem kritikal (engine, propulsion, power, weapons, comms, navigation), availability spare parts, dan status personel.
- Mission Profiles: profiling misi (patrol, escort, combat) mempengaruhi weightings.
- Criticality Levels: tandai item checklist sebagai Critical/High/Medium/Low; item Critical harus diselesaikan sebelum "Ready".
- Chain of Command Approvals: penandatanganan elektronik oleh Officer/CO untuk deklarasi readiness.
- Spare Parts & Requisition: inventory parts, lead times, reorder impact ke forecast.
- Security: MFA/SSO, tamper-evident audit logs, enkripsi end-to-end.

User Stories (ringkas)
- Termasuk user stories untuk Crew, Chief Engineer, Fleet Manager, Admin, QA terkait Engine, Electrical, Cost Forecast, Readiness, Offline sync, Attachments, Notifications, Reporting.

Deliverables
- PRD (this file)
- User stories & acceptance criteria
- Basic UI mockups (phone screens)
- API spec (endpoints listing) for implementasi

Next Steps
1. Konfirmasi persona dan prioritas sistem (rekomendasi: mulai dengan Engine + Electrical)
2. Setujui scope MVP atau minta perubahan
3. Setelah persetujuan: buat user stories terperinci, mockups, dan API spec

**Recommendations (project defaults & next actions)**
- **MVP Priority:** Fokus awal pada *Engine* dan *Electrical* (klasik critical systems) sebelum menambah interior/exterior.
- **Mission Profiles (default):** `Patrol`, `Escort`, `Combat`, `Transit` — tiap profile akan membawa weightings readiness berbeda.
- **Currency & Rates:** Gunakan single project currency (USD) untuk MVP; labor rates default per-role (Crew, ChiefEngineer, Officer) dengan opsi override per-vessel.
- **Readiness Model (default):** skor 0–100, per-system weights, critical items block "Ready" status; detail formula ditetapkan di `docs/READINESS.md`.
- **Security Baseline:** TLS, JWT auth, RBAC, officer readiness declaration requires elevated auth (2FA when available); tamper-evident audit logs mandatory.
- **Offline Policy:** Encrypted local DB, client queue for changes, prioritized sync for critical events (readiness declarations, critical repairs).
- **Team & Timeline (recommended):** 3–4 developers; MVP ~8–10 weeks (see Implementation Plan). Mulai dengan a two-week pilot on one vessel.
- **Pilot & Rollout:** deploy to staging → pilot on 1 ship → gather feedback → iterate before fleet-wide rollout.

If you approve these recommendations I will (pick next): 1) produce mobile-first wireframes for `Readiness` + `Costs` (in-progress), or 2) expand `docs/API_SPEC.md` with sample payloads and auth flows.

