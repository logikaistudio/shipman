import React, { useState, useEffect } from 'react';
import apiClient from '../utils/apiClient';

interface ChecklistFormProps {
  taskId: string;
  taskName?: string;
  onSubmit?: () => void;
}

export const ChecklistForm: React.FC<ChecklistFormProps> = ({ taskId, taskName = '', onSubmit }) => {
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [actualCost, setActualCost] = useState({ parts: 0, labor: 0 });
  const [attachments, setAttachments] = useState<File[]>([]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Normalize task name to match categories
  const normalizedTaskName = taskName.toLowerCase().trim();

  // Initialize default data based on task category
  useEffect(() => {
    const defaultData: Record<string, any> = {};

    if (normalizedTaskName.includes('bakap')) {
      defaultData['aga'] = 'siap';
      defaultData['bga'] = 'siap';
      defaultData['docking-last'] = '16 Maret 2020 s.d 9 April 2020';
    } else if (normalizedTaskName.includes('pendorong')) {
      defaultData['mpk1-status'] = 'siap';
      defaultData['mpk1-jp'] = '12393';
      defaultData['mpk2-status'] = 'siap';
      defaultData['mpk2-jp'] = '12393';
      defaultData['mpk3-status'] = 'tidak siap';
      defaultData['mpk3-jp'] = '4964';
      defaultData['gb-status'] = 'siap';
      defaultData['propeller-status'] = 'siap';
      defaultData['kemudi-status'] = 'siap';
    } else if (normalizedTaskName.includes('liskap')) {
      defaultData['dg1-status'] = 'siap';
      defaultData['dg1-jp'] = '27986';
      defaultData['dg2-status'] = 'tidak siap';
      defaultData['dg2-jp'] = '18832';
      defaultData['dg-darurat-status'] = 'siap';
      defaultData['dg-darurat-jp'] = '13';
    } else if (normalizedTaskName.includes('alnavkom')) {
      defaultData['alnavkom-status'] = 'siap';
      defaultData['gyro-compass'] = 'siap';
    } else if (normalizedTaskName.includes('bantu')) {
      defaultData['pompa-dpk'] = 'tidak siap';
      defaultData['pompa-dpk-notes'] = 'Valve pipa rusak, Pengganti Submarsible pump dan pompa alkon';
      defaultData['pompa-al-ac'] = 'siap';
      defaultData['pompa-bb'] = 'siap';
      defaultData['pompa-at'] = 'siap';
    } else if (normalizedTaskName.includes('pipa')) {
      defaultData['pipa-al'] = 'tidak siap';
      defaultData['pipa-al-notes'] = 'Valve pipa rusak';
      defaultData['pipa-at'] = 'siap';
      defaultData['pipa-bb'] = 'siap';
    } else if (normalizedTaskName.includes('akomodasi')) {
      defaultData['ac1'] = 'tidak siap';
      defaultData['ac1-notes'] = 'Menggunakan AC Split';
      defaultData['ac2'] = 'tidak siap';
      defaultData['ac3'] = 'tidak siap';
      defaultData['coolbox'] = 'tidak siap';
    } else if (normalizedTaskName.includes('bahari')) {
      defaultData['lier-jangkar'] = 'siap';
      defaultData['kemudi-bahari'] = 'siap';
    } else if (normalizedTaskName.includes('keselamatan')) {
      defaultData['apar'] = 'siap';
      defaultData['apar-notes'] = 'Next Inspect Oktober 2024';
      defaultData['co2-central'] = 'tidak siap';
      defaultData['co2-central-notes'] = 'Pipa patah dan keropos, Next Inspect 2013';
      defaultData['leak-safety'] = 'siap';
      defaultData['liferaft'] = 'siap';
      defaultData['liferaft-notes'] = 'Next Inspect Oktober 2024';
      defaultData['sekoci'] = 'siap';
      defaultData['lifejacket'] = 'siap';
    } else if (normalizedTaskName.includes('senjata')) {
      defaultData['meriam-20mm'] = 'siap';
      defaultData['meriam-12-7mm'] = 'siap';
    } else if (normalizedTaskName.includes('logca')) {
      defaultData['hsd-full'] = '30000';
      defaultData['hsd-current'] = '13774';
      defaultData['at-full'] = '6000';
      defaultData['at-current'] = '5500';
    } else {
      // Fallback defaults
      defaultData['engine-oil-temp'] = '80';
      defaultData['engine-oil-pressure'] = '4.0';
      defaultData['fuel-tank-level'] = '85';
      defaultData['bilge-level'] = 'normal';
    }

    setResponses(defaultData);
  }, [taskName]);

  const handleInputChange = (itemId: string, value: any) => {
    setResponses(prev => ({
      ...prev,
      [itemId]: value
    }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const responsesArray = Object.entries(responses).map(([itemId, value]) => ({
        itemId,
        value,
        notes: itemId.endsWith('-notes') ? value : undefined
      }));

      await apiClient.completeTask(taskId, {
        responses: responsesArray,
        attachments: attachments.map(f => ({
          type: f.type,
          name: f.name,
          size: f.size
        })),
        actualCost,
        location: undefined
      });

      alert('✓ Laporan O&M berhasil dikirim!');
      if (onSubmit) onSubmit();
    } catch (error) {
      console.error('Error submitting checklist:', error);
      alert('Error saat mengirim laporan. Perubahan disimpan di antrean sinkronisasi.');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper radio component
  const renderSiapRadio = (id: string, label: string) => {
    const val = responses[id] || 'siap';
    return (
      <div className="border-b border-gray-150 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <span className="text-sm font-semibold text-gray-750">{label}</span>
        <div className="flex gap-3">
          {['siap', 'tidak siap'].map(opt => (
            <label key={opt} className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg cursor-pointer text-xs font-semibold uppercase transition ${
              val === opt
                ? opt === 'siap' ? 'bg-green-50 border-green-500 text-green-700 font-extrabold' : 'bg-red-50 border-red-500 text-red-700 font-extrabold'
                : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50'
            }`}>
              <input
                type="radio"
                name={id}
                checked={val === opt}
                onChange={() => handleInputChange(id, opt)}
                className="sr-only"
              />
              <span>{opt === 'siap' ? '✅ Siap' : '🚨 Tidak Siap'}</span>
            </label>
          ))}
        </div>
      </div>
    );
  };

  // Render forms based on active O&M task category
  const renderFormFields = () => {
    if (normalizedTaskName.includes('bakap')) {
      return (
        <div className="space-y-4">
          <h4 className="text-md font-bold text-gray-900 border-b pb-2">1. Bakap (Badan Kapal)</h4>
          {renderSiapRadio('aga', 'Anode Galvani Alumunium (AGA)')}
          {renderSiapRadio('bga', 'Braket Galvani Alumunium (BGA)')}
          <div className="pt-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Jadwal Docking Terakhir</label>
            <input
              type="text"
              value={responses['docking-last'] || ''}
              onChange={(e) => handleInputChange('docking-last', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              placeholder="e.g. 16 Maret 2020 s.d 9 April 2020"
            />
          </div>
        </div>
      );
    }

    if (normalizedTaskName.includes('pendorong')) {
      return (
        <div className="space-y-4">
          <h4 className="text-md font-bold text-gray-900 border-b pb-2">2. Sistem Pendorong</h4>
          
          {/* MPK 1 */}
          <div className="border-b pb-4 space-y-2">
            {renderSiapRadio('mpk1-status', 'Mesin Pendorong Kanan I (MPK I)')}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500">Jam Putar (JP):</span>
              <input
                type="number"
                value={responses['mpk1-jp'] || ''}
                onChange={(e) => handleInputChange('mpk1-jp', e.target.value)}
                className="w-32 px-2.5 py-1 border border-gray-300 rounded-lg text-xs"
              />
              <span className="text-xs text-gray-400">JP</span>
            </div>
          </div>

          {/* MPK 2 */}
          <div className="border-b pb-4 space-y-2">
            {renderSiapRadio('mpk2-status', 'Mesin Pendorong Kanan II (MPK II)')}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500">Jam Putar (JP):</span>
              <input
                type="number"
                value={responses['mpk2-jp'] || ''}
                onChange={(e) => handleInputChange('mpk2-jp', e.target.value)}
                className="w-32 px-2.5 py-1 border border-gray-300 rounded-lg text-xs"
              />
              <span className="text-xs text-gray-400">JP</span>
            </div>
          </div>

          {/* MPK 3 */}
          <div className="border-b pb-4 space-y-2">
            {renderSiapRadio('mpk3-status', 'Mesin Pendorong Kiri III (MPK III)')}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500">Jam Putar (JP):</span>
              <input
                type="number"
                value={responses['mpk3-jp'] || ''}
                onChange={(e) => handleInputChange('mpk3-jp', e.target.value)}
                className="w-32 px-2.5 py-1 border border-gray-300 rounded-lg text-xs border-red-300 bg-red-50/50"
              />
              <span className="text-xs text-red-500 font-semibold">Bermasalah (Butuh Perbaikan)</span>
            </div>
          </div>

          {renderSiapRadio('gb-status', 'Gearbox I / II / III')}
          {renderSiapRadio('propeller-status', 'Ass Propeller & Propeller')}
          {renderSiapRadio('kemudi-status', 'Sistem Kemudi')}
        </div>
      );
    }

    if (normalizedTaskName.includes('liskap')) {
      return (
        <div className="space-y-4">
          <h4 className="text-md font-bold text-gray-900 border-b pb-2">3. Liskap (Kelistrikan Kapal)</h4>
          
          {/* DG 1 */}
          <div className="border-b pb-4 space-y-2">
            {renderSiapRadio('dg1-status', 'Diesel Generator I (DG I)')}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500">Jam Putar (JP):</span>
              <input
                type="number"
                value={responses['dg1-jp'] || ''}
                onChange={(e) => handleInputChange('dg1-jp', e.target.value)}
                className="w-32 px-2.5 py-1 border border-gray-300 rounded-lg text-xs"
              />
              <span className="text-xs text-gray-400">JP</span>
            </div>
          </div>

          {/* DG 2 */}
          <div className="border-b pb-4 space-y-2">
            {renderSiapRadio('dg2-status', 'Diesel Generator II (DG II)')}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500">Jam Putar (JP):</span>
              <input
                type="number"
                value={responses['dg2-jp'] || ''}
                onChange={(e) => handleInputChange('dg2-jp', e.target.value)}
                className="w-32 px-2.5 py-1 border border-gray-300 rounded-lg text-xs border-red-300 bg-red-50/50"
              />
              <span className="text-xs text-red-500 font-semibold">Bermasalah (Perlu Overhaul)</span>
            </div>
          </div>

          {/* Emergency DG */}
          <div className="pb-4 space-y-2">
            {renderSiapRadio('dg-darurat-status', 'Diesel Generator Darurat')}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500">Jam Putar (JP):</span>
              <input
                type="number"
                value={responses['dg-darurat-jp'] || ''}
                onChange={(e) => handleInputChange('dg-darurat-jp', e.target.value)}
                className="w-32 px-2.5 py-1 border border-gray-300 rounded-lg text-xs"
              />
              <span className="text-xs text-gray-400">JP</span>
            </div>
          </div>
        </div>
      );
    }

    if (normalizedTaskName.includes('alnavkom')) {
      return (
        <div className="space-y-4">
          <h4 className="text-md font-bold text-gray-900 border-b pb-2">4. Alnavkom (Alat Navigasi & Komunikasi)</h4>
          {renderSiapRadio('alnavkom-status', 'Sistem Alnavkom')}
          {renderSiapRadio('gyro-compass', 'Gyro Compass')}
        </div>
      );
    }

    if (normalizedTaskName.includes('bantu')) {
      return (
        <div className="space-y-4">
          <h4 className="text-md font-bold text-gray-900 border-b pb-2">5. Pesawat Bantu</h4>
          
          {renderSiapRadio('pompa-dpk', 'Pompa Dinas Pemadam Kebakaran (Pompa DPK)')}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Catatan Kerusakan & Substitusi:</label>
            <textarea
              value={responses['pompa-dpk-notes'] || ''}
              onChange={(e) => handleInputChange('pompa-dpk-notes', e.target.value)}
              className="w-full p-2.5 border border-red-200 bg-red-50/20 text-red-800 text-xs rounded-lg h-20 focus:outline-none"
            />
          </div>

          {renderSiapRadio('pompa-al-ac', 'Pompa Air Laut AC (Pompa AL AC)')}
          {renderSiapRadio('pompa-bb', 'Pompa Bahan Bakar (Pompa BB)')}
          {renderSiapRadio('pompa-at', 'Pompa Air Tawar (Pompa AT)')}
        </div>
      );
    }

    if (normalizedTaskName.includes('pipa')) {
      return (
        <div className="space-y-4">
          <h4 className="text-md font-bold text-gray-900 border-b pb-2">6. Sistem Pipa</h4>
          
          {renderSiapRadio('pipa-al', 'Sistem Pipa Air Laut (Pipa AL)')}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Catatan Pipa AL:</label>
            <input
              type="text"
              value={responses['pipa-al-notes'] || ''}
              onChange={(e) => handleInputChange('pipa-al-notes', e.target.value)}
              className="w-full px-3 py-2 border border-red-200 bg-red-50/20 text-red-850 rounded-lg text-xs"
            />
          </div>

          {renderSiapRadio('pipa-at', 'Sistem Pipa Air Tawar (Pipa AT)')}
          {renderSiapRadio('pipa-bb', 'Sistem Pipa Bahan Bakar (Pipa BB)')}
        </div>
      );
    }

    if (normalizedTaskName.includes('akomodasi')) {
      return (
        <div className="space-y-4">
          <h4 className="text-md font-bold text-gray-900 border-b pb-2">7. Akomodasi & Sistem Pendingin</h4>
          
          {renderSiapRadio('ac1', 'Air Conditioner 1 (AC 1)')}
          <div className="pb-2">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Catatan AC 1:</label>
            <input
              type="text"
              value={responses['ac1-notes'] || ''}
              onChange={(e) => handleInputChange('ac1-notes', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
            />
          </div>

          {renderSiapRadio('ac2', 'Air Conditioner 2 (AC 2)')}
          {renderSiapRadio('ac3', 'Air Conditioner 3 (AC 3)')}
          {renderSiapRadio('coolbox', 'Coolbox Logistik')}
        </div>
      );
    }

    if (normalizedTaskName.includes('bahari')) {
      return (
        <div className="space-y-4">
          <h4 className="text-md font-bold text-gray-900 border-b pb-2">8. Pesawat Bahari</h4>
          {renderSiapRadio('lier-jangkar', 'Lier Jangkar')}
          {renderSiapRadio('kemudi-bahari', 'Peralatan Kemudi')}
        </div>
      );
    }

    if (normalizedTaskName.includes('keselamatan')) {
      return (
        <div className="space-y-4">
          <h4 className="text-md font-bold text-gray-900 border-b pb-2">9. Alat Keselamatan (Kebakaran & Kebocoran)</h4>
          
          {renderSiapRadio('apar', 'APAR Kebakaran')}
          <div className="pb-3">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Masa Berlaku APAR:</label>
            <input
              type="text"
              value={responses['apar-notes'] || ''}
              onChange={(e) => handleInputChange('apar-notes', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
            />
          </div>

          {renderSiapRadio('co2-central', 'Sistem CO2 Central')}
          <div className="pb-3">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Catatan & Masa Berlaku CO2 Central:</label>
            <textarea
              value={responses['co2-central-notes'] || ''}
              onChange={(e) => handleInputChange('co2-central-notes', e.target.value)}
              className="w-full p-2 border border-red-200 bg-red-50/20 text-red-800 text-xs rounded-lg h-16"
            />
          </div>

          {renderSiapRadio('leak-safety', 'Peralatan Anti-Bocor')}
          
          {renderSiapRadio('liferaft', 'Kapsul Penyelamat (Life Raft)')}
          <div className="pb-3">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Masa Berlaku Life Raft:</label>
            <input
              type="text"
              value={responses['liferaft-notes'] || ''}
              onChange={(e) => handleInputChange('liferaft-notes', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
            />
          </div>

          {renderSiapRadio('sekoci', 'Sekoci Komandan')}
          {renderSiapRadio('lifejacket', 'Jaket Pelampung (Life Jacket)')}
        </div>
      );
    }

    if (normalizedTaskName.includes('senjata')) {
      return (
        <div className="space-y-4">
          <h4 className="text-md font-bold text-gray-900 border-b pb-2">10. Persenjataan Militer</h4>
          {renderSiapRadio('meriam-20mm', 'Meriam Haluan 20mm')}
          {renderSiapRadio('meriam-12-7mm', 'Meriam Buritan 12,7mm Kanan / Kiri')}
        </div>
      );
    }

    if (normalizedTaskName.includes('logca')) {
      // Automatic calculations for HSD and AT
      const hsdFull = parseFloat(responses['hsd-full']) || 30000;
      const hsdCurrent = parseFloat(responses['hsd-current']) || 0;
      const hsdPercent = hsdFull > 0 ? ((hsdCurrent / hsdFull) * 100) : 0;

      const atFull = parseFloat(responses['at-full']) || 6000;
      const atCurrent = parseFloat(responses['at-current']) || 0;
      const atPercent = atFull > 0 ? ((atCurrent / atFull) * 100) : 0;

      return (
        <div className="space-y-6">
          <h4 className="text-md font-bold text-gray-900 border-b pb-2">11. Logca (Logistik Cair)</h4>
          
          {/* HSD BBM */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
            <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <span>⛽</span> BBM High Speed Diesel (HSD)
            </span>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Norma Penuh (Liter):</label>
                <input
                  type="number"
                  value={responses['hsd-full'] || ''}
                  onChange={(e) => handleInputChange('hsd-full', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-350 bg-white rounded-lg text-sm font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Saat Ini (Liter):</label>
                <input
                  type="number"
                  value={responses['hsd-current'] || ''}
                  onChange={(e) => handleInputChange('hsd-current', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-350 bg-white rounded-lg text-sm font-medium"
                />
              </div>
            </div>
            <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-200 text-xs font-semibold">
              <span className="text-slate-500">Persentase Bahan Bakar:</span>
              <span className={`text-sm font-extrabold ${hsdPercent < 50 ? 'text-red-600' : 'text-green-600'}`}>
                {hsdPercent.toFixed(2)}%
              </span>
            </div>
          </div>

          {/* Air Tawar */}
          <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-4 space-y-4">
            <span className="text-sm font-bold text-blue-900 flex items-center gap-1.5">
              <span>💧</span> Air Tawar (AT)
            </span>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-blue-800 mb-1">Norma Penuh (Liter):</label>
                <input
                  type="number"
                  value={responses['at-full'] || ''}
                  onChange={(e) => handleInputChange('at-full', e.target.value)}
                  className="w-full px-3 py-2 border border-blue-200 bg-white rounded-lg text-sm font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-blue-800 mb-1">Saat Ini (Liter):</label>
                <input
                  type="number"
                  value={responses['at-current'] || ''}
                  onChange={(e) => handleInputChange('at-current', e.target.value)}
                  className="w-full px-3 py-2 border border-blue-200 bg-white rounded-lg text-sm font-medium"
                />
              </div>
            </div>
            <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-blue-200 text-xs font-semibold">
              <span className="text-blue-700">Persentase Air Tawar:</span>
              <span className={`text-sm font-extrabold ${atPercent < 60 ? 'text-red-600' : 'text-blue-600'}`}>
                {atPercent.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      );
    }

    // Default Fallback: Original Daily checklist
    return (
      <div className="space-y-4">
        <h4 className="text-md font-bold text-gray-900 border-b pb-2 capitalize">Daily O&M Checklist: {taskName || 'Umum'}</h4>
        
        <div>
          <label className="block text-sm font-semibold mb-2">Engine Temperature (°C)</label>
          <input
            type="number"
            value={responses['engine-oil-temp'] || ''}
            onChange={(e) => handleInputChange('engine-oil-temp', e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            placeholder="75"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">Fuel Level (%)</label>
          <input
            type="number"
            value={responses['fuel-tank-level'] || ''}
            onChange={(e) => handleInputChange('fuel-tank-level', e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            placeholder="85"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">Main Power (V)</label>
          <input
            type="number"
            value={responses['gen-voltage'] || '400'}
            onChange={(e) => handleInputChange('gen-voltage', e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            placeholder="400"
          />
        </div>
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto p-4 bg-gray-50 pb-6 space-y-6">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 min-h-[300px]">
        {renderFormFields()}
      </div>

      {/* Actual Costs */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
        <h3 className="font-bold text-sm text-gray-900">Biaya Pemeliharaan Aktual</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Spareparts / Suku Cadang (Rp)</label>
            <input
              type="number"
              min="0"
              value={actualCost.parts || ''}
              onChange={(e) => setActualCost(prev => ({ ...prev, parts: parseFloat(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border border-gray-300 bg-white rounded-lg text-sm font-medium"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Labor / Pekerja (Rp)</label>
            <input
              type="number"
              min="0"
              value={actualCost.labor || ''}
              onChange={(e) => setActualCost(prev => ({ ...prev, labor: parseFloat(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border border-gray-300 bg-white rounded-lg text-sm font-medium"
              placeholder="0"
            />
          </div>
          <div className="border-t pt-3 flex justify-between items-center text-sm font-bold text-gray-900 col-span-2 mt-2">
            <span>Total Biaya Terpakai:</span>
            <span className="text-blue-600 text-lg">Rp {(actualCost.parts + actualCost.labor).toLocaleString('id-ID')}</span>
          </div>
        </div>
      </div>

      {/* Attachments */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h3 className="font-bold text-sm text-gray-900 mb-3">📸 Bukti Foto / Berkas (PDF)</h3>
        <input
          type="file"
          multiple
          accept="image/*,.pdf"
          onChange={handleFileSelect}
          className="w-full px-3 py-2 border border-gray-305 rounded-lg text-xs bg-white cursor-pointer"
        />
      </div>

      {/* Notes */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h3 className="font-bold text-sm text-gray-900 mb-3">Catatan Tambahan</h3>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Tulis jika ada temuan mesin..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg h-24 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Submit Button (Inline Card) */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex justify-center">
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-6 rounded-xl shadow-md transition disabled:bg-gray-400 disabled:shadow-none flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <span className="animate-spin text-lg">🔄</span>
              <span>Mengirim Laporan...</span>
            </>
          ) : (
            <>
              <span>✓</span>
              <span>Kirim Laporan O&M</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};
