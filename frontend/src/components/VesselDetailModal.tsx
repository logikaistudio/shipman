import React, { useState, useEffect } from 'react';

interface VesselDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  vesselId: string;
  vesselName: string;
  onUpdateSuccess: () => void;
}

export const VesselDetailModal: React.FC<VesselDetailModalProps> = ({
  isOpen,
  onClose,
  vesselId,
  vesselName,
  onUpdateSuccess
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'measurement'>('overview');
  const [readinessData, setReadinessData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form states for Daily Measurements
  const [hsdCurrent, setHsdCurrent] = useState('28000');
  const [atCurrent, setAtCurrent] = useState('5500');
  const [dg1Status, setDg1Status] = useState('siap');
  const [dg1Hours, setDg1Hours] = useState('27986');
  const [dg2Status, setDg2Status] = useState('siap');
  const [dg2Hours, setDg2Hours] = useState('18832');
  const [mpkStatus, setMpkStatus] = useState('siap');
  const [engineTemp, setEngineTemp] = useState('80');
  const [oilPressure, setOilPressure] = useState('4.2');

  useEffect(() => {
    if (isOpen && vesselId) {
      fetchVesselReadiness();
      setSuccessMessage(null);
    }
  }, [isOpen, vesselId]);

  const fetchVesselReadiness = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/vessels/${vesselId}/readiness`);
      const data = await res.json();
      setReadinessData(data);

      // Prepopulate form if logs exist
      const logca = data.perTask?.find((t: any) => t.name.toLowerCase().includes('logca') || t.taskId.endsWith('-11'));
      if (logca && logca.defects?.length === 0) {
        // If done, fetch the values from log entry
        const logRes = await fetch(`/api/v1/logs?vesselId=${vesselId}`).then(r => r.json());
        const lastLogcaLog = logRes.filter((l: any) => l.taskId.endsWith('-11'))[0];
        if (lastLogcaLog && lastLogcaLog.responses) {
          setHsdCurrent(lastLogcaLog.responses.find((x: any) => x.itemId === 'hsd-current')?.value || '28000');
          setAtCurrent(lastLogcaLog.responses.find((x: any) => x.itemId === 'at-current')?.value || '5500');
        }
      }
    } catch (err) {
      console.error('Failed to load readiness details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMessage(null);

    try {
      // 1. Submit Logca Task completion (BBM & Air Tawar - task index 11)
      const logcaTaskId = `task-${vesselId}-11`;
      await fetch(`/api/v1/tasks/${logcaTaskId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responses: [
            { itemId: 'hsd-current', value: hsdCurrent },
            { itemId: 'hsd-full', value: '30000' },
            { itemId: 'at-current', value: atCurrent },
            { itemId: 'at-full', value: '6000' }
          ],
          actualCost: { parts: 0, labor: 0 }
        })
      });

      // 2. Submit Liskap Task completion (Kelistrikan - task index 3)
      const liskapTaskId = `task-${vesselId}-3`;
      await fetch(`/api/v1/tasks/${liskapTaskId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responses: [
            { itemId: 'dg1-status', value: dg1Status },
            { itemId: 'dg1-hours', value: dg1Hours },
            { itemId: 'dg2-status', value: dg2Status },
            { itemId: 'dg2-hours', value: dg2Hours }
          ],
          actualCost: { parts: 0, labor: 0 }
        })
      });

      // 3. Submit Sistem Pendorong Task completion (Engine - task index 2)
      const pendorongTaskId = `task-${vesselId}-2`;
      await fetch(`/api/v1/tasks/${pendorongTaskId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responses: [
            { itemId: 'mpk-status', value: mpkStatus },
            { itemId: 'engine-temp', value: engineTemp },
            { itemId: 'oil-pressure', value: oilPressure }
          ],
          actualCost: { parts: 0, labor: 0 }
        })
      });

      setSuccessMessage('✓ Hasil pemeriksaan harian berhasil disimpan! Kesiapan kapal diperbarui.');
      onUpdateSuccess();
      await fetchVesselReadiness();
      
      // Auto switch back to overview tab to see updated score
      setTimeout(() => {
        setActiveTab('overview');
      }, 1500);

    } catch (err) {
      console.error('Error submitting daily inspection:', err);
      alert('Gagal mengirim data pemeriksaan.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] flex flex-col border border-slate-200">
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition flex items-center justify-center font-bold text-sm"
        >
          ✕
        </button>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🚢</span>
            <h2 className="text-xl font-black text-slate-900">{vesselName}</h2>
          </div>
          <p className="text-slate-500 text-xs mt-1.5 font-bold uppercase tracking-wider">Detail Kelaikan & Pemeliharaan Kapal</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 mb-5">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-3 text-center font-bold text-xs uppercase tracking-wider border-b-2 transition-all ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            📊 Status Kesiapan
          </button>
          <button
            onClick={() => setActiveTab('measurement')}
            className={`flex-1 py-3 text-center font-bold text-xs uppercase tracking-wider border-b-2 transition-all ${
              activeTab === 'measurement'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            🔧 Form Pemeriksaan Daily
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto pr-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-slate-500 text-xs font-semibold">Mengambil data kesiapan kapal...</span>
            </div>
          ) : activeTab === 'overview' && readinessData ? (
            <div className="space-y-6">
              {/* Score card */}
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between">
                <div>
                  <p className="text-slate-500 text-xs font-extrabold uppercase tracking-wider">Readiness Score</p>
                  <p className="text-xs text-slate-400 mt-1 font-medium">Berdasarkan data sensor & checklist harian</p>
                </div>
                <div className={`text-3xl font-black px-4 py-2 rounded-2xl text-white ${
                  readinessData.score >= 80 ? 'bg-green-600' : readinessData.score >= 60 ? 'bg-amber-500' : 'bg-red-500'
                }`}>
                  {readinessData.score}%
                </div>
              </div>

              {/* System Breakdown */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Kondisi Per Sistem</h3>
                <div className="grid grid-cols-2 gap-3">
                  {readinessData.perSystem?.map((sys: any) => (
                    <div key={sys.system} className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-extrabold uppercase text-slate-700">{sys.system}</span>
                        <span className={`text-xs font-black ${
                          sys.score >= 80 ? 'text-green-600' : sys.score >= 60 ? 'text-amber-600' : 'text-red-650'
                        }`}>{sys.score}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full">
                        <div 
                          className={`h-1.5 rounded-full ${
                            sys.score >= 80 ? 'bg-green-500' : sys.score >= 60 ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${sys.score}%` }}
                        ></div>
                      </div>
                      {sys.criticalOpen > 0 && (
                        <p className="text-xxs text-red-600 font-extrabold mt-1.5">🚨 {sys.criticalOpen} Kerusakan Kritis</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Defects list */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Temuan / Kerusakan Kritis</h3>
                {readinessData.criticalOpenItems?.length === 0 ? (
                  <div className="p-4 bg-green-50 text-green-700 border border-green-200 rounded-xl text-xs font-semibold">
                    ✓ Tidak ada kerusakan kritis. Kapal siap beroperasi.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {readinessData.criticalOpenItems?.map((log: any, idx: number) => (
                      <div key={idx} className="p-3 bg-red-50 text-red-800 border border-red-200 rounded-xl flex items-center justify-between text-xs">
                        <div>
                          <p className="font-extrabold text-xxs uppercase text-red-900">Komponen: {log.taskName || log.taskId}</p>
                          <p className="mt-0.5 font-semibold">Defek terdeteksi pada parameter checklist harian.</p>
                        </div>
                        <span className="text-lg">🚨</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Tab: Form Pengukuran */
            <form onSubmit={handleFormSubmit} className="space-y-6">
              {successMessage && (
                <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl text-xs font-bold animate-pulse">
                  {successMessage}
                </div>
              )}

              {/* Section 1: BBM & Air Tawar */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600 border-b border-slate-200 pb-2">⛽ Logistik Cair (BBM & Air Tawar)</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xxs font-bold text-slate-500 uppercase tracking-wider mb-1">Volume HSD (BBM) Aktual (Liter)</label>
                    <input
                      type="number"
                      value={hsdCurrent}
                      onChange={(e) => setHsdCurrent(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white text-xs font-bold bg-white"
                      placeholder="Contoh: 28000"
                      required
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">Kapasitas penuh: 30.000 Liter (Batas minim: 15.000L)</span>
                  </div>

                  <div>
                    <label className="block text-xxs font-bold text-slate-500 uppercase tracking-wider mb-1">Volume Air Tawar Aktual (Liter)</label>
                    <input
                      type="number"
                      value={atCurrent}
                      onChange={(e) => setAtCurrent(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white text-xs font-bold bg-white"
                      placeholder="Contoh: 5500"
                      required
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">Kapasitas penuh: 6.000 Liter (Batas minim: 3.600L)</span>
                  </div>
                </div>
              </div>

              {/* Section 2: Kelistrikan (Generator) */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600 border-b border-slate-200 pb-2">⚡ Kelistrikan (Diesel Generator)</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xxs font-bold text-slate-500 uppercase tracking-wider mb-1">Status Diesel Gen 1</label>
                    <select
                      value={dg1Status}
                      onChange={(e) => setDg1Status(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500 text-xs font-bold bg-white"
                    >
                      <option value="siap">✓ Siap Operasi</option>
                      <option value="tidak siap">✗ Tidak Siap / Rusak</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xxs font-bold text-slate-500 uppercase tracking-wider mb-1">Running Hours DG 1 (Jam)</label>
                    <input
                      type="number"
                      value={dg1Hours}
                      onChange={(e) => setDg1Hours(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500 text-xs font-bold bg-white"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xxs font-bold text-slate-500 uppercase tracking-wider mb-1">Status Diesel Gen 2</label>
                    <select
                      value={dg2Status}
                      onChange={(e) => setDg2Status(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500 text-xs font-bold bg-white"
                    >
                      <option value="siap">✓ Siap Operasi</option>
                      <option value="tidak siap">✗ Tidak Siap / Rusak</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xxs font-bold text-slate-500 uppercase tracking-wider mb-1">Running Hours DG 2 (Jam)</label>
                    <input
                      type="number"
                      value={dg2Hours}
                      onChange={(e) => setDg2Hours(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500 text-xs font-bold bg-white"
                      required
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <label className="block text-xxs font-bold text-slate-500 uppercase tracking-wider mb-1">Tegangan Baterai Kapal (Volt)</label>
                  <input
                    type="text"
                    value={oilPressure}
                    onChange={(e) => setOilPressure(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500 text-xs font-bold bg-white"
                    placeholder="Contoh: 24.5"
                    required
                  />
                </div>
              </div>

              {/* Section 3: Engine Parameters */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600 border-b border-slate-200 pb-2">⚙️ Sistem Pendorong Utama (Mesin MPK)</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xxs font-bold text-slate-500 uppercase tracking-wider mb-1">Status Mesin Pendorong</label>
                    <select
                      value={mpkStatus}
                      onChange={(e) => setMpkStatus(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500 text-xs font-bold bg-white"
                    >
                      <option value="siap">✓ Siap Operasi</option>
                      <option value="tidak siap">✗ Rusak / Overhaul</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xxs font-bold text-slate-500 uppercase tracking-wider mb-1">Suhu Mesin MPK (°C)</label>
                    <input
                      type="number"
                      value={engineTemp}
                      onChange={(e) => setEngineTemp(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500 text-xs font-bold bg-white"
                      placeholder="Contoh: 82"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition uppercase tracking-wider"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl transition uppercase tracking-wider shadow"
                >
                  {submitting ? 'Mengirim Data...' : 'Simpan Hasil Pemeriksaan'}
                </button>
              </div>
            </form>
          )}
        </div>

      </div>
    </div>
  );
};
