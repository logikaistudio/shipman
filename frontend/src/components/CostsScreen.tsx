import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface CostData {
  vesselId: string;
  period: string;
  totalParts: number;
  totalLabor: number;
  totalMisc: number;
  grandTotal: number;
}

interface CostDriver {
  label: string;
  cost: number;
}

export const CostsScreen: React.FC<{ vesselId: string }> = ({ vesselId }) => {
  const [costs, setCosts] = useState<CostData | null>(null);
  const [drivers, setDrivers] = useState<CostDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('2026-06');

  useEffect(() => {
    fetchCosts();
  }, [vesselId, period]);

  const fetchCosts = async () => {
    try {
      setLoading(true);
      const [costsRes, driversRes] = await Promise.all([
        axios.get(`/api/v1/vessels/${vesselId}/costs?period=${period}`),
        axios.get(`/api/v1/vessels/${vesselId}/costs/drivers?period=${period}`)
      ]);
      setCosts(costsRes.data);
      setDrivers(driversRes.data);
    } catch (error) {
      console.error('Error fetching costs:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  if (!costs) {
    return <div className="text-center text-red-600">Failed to load cost data</div>;
  }

  const costPercentage = {
    parts: (costs.totalParts / costs.grandTotal) * 100,
    labor: (costs.totalLabor / costs.grandTotal) * 100,
    misc: (costs.totalMisc / costs.grandTotal) * 100
  };

  return (
    <div className="space-y-6 p-4 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="card">
        <h1 className="text-3xl font-bold mb-4">Cost Forecast</h1>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">Period</label>
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="mt-1 px-3 py-2 border rounded-md w-full"
          />
        </div>
      </div>

      {/* Total Cost Card */}
      <div className="card bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
        <p className="text-gray-600 text-sm">Total Maintenance Cost</p>
        <p className="text-4xl font-bold text-blue-600">Rp {costs.grandTotal.toLocaleString('id-ID')}</p>
        <p className="text-xs text-gray-500 mt-2">Period: {period}</p>
      </div>

      {/* Cost Breakdown */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4">Cost Breakdown</h2>
        
        <div className="space-y-3">
          {/* Parts */}
          <div>
            <div className="flex justify-between mb-2">
              <span className="font-semibold">Parts & Materials</span>
              <span className="text-green-600 font-bold">Rp {costs.totalParts.toLocaleString('id-ID')}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-green-500 h-3 rounded-full"
                style={{ width: `${costPercentage.parts}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">{costPercentage.parts.toFixed(1)}% of total</p>
          </div>

          {/* Labor */}
          <div>
            <div className="flex justify-between mb-2">
              <span className="font-semibold">Labor</span>
              <span className="text-blue-600 font-bold">Rp {costs.totalLabor.toLocaleString('id-ID')}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-500 h-3 rounded-full"
                style={{ width: `${costPercentage.labor}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">{costPercentage.labor.toFixed(1)}% of total</p>
          </div>

          {/* Misc */}
          <div>
            <div className="flex justify-between mb-2">
              <span className="font-semibold">Miscellaneous</span>
              <span className="text-purple-600 font-bold">Rp {costs.totalMisc.toLocaleString('id-ID')}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-purple-500 h-3 rounded-full"
                style={{ width: `${costPercentage.misc}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">{costPercentage.misc.toFixed(1)}% of total</p>
          </div>
        </div>
      </div>

      {/* Top Cost Drivers */}
      {drivers.length > 0 && (
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Top Cost Drivers</h2>
          <div className="space-y-2">
            {drivers.map((driver, idx) => (
              <div key={idx} className="flex justify-between items-center p-3 bg-gray-100 rounded">
                <span className="font-medium">{driver.label}</span>
                <span className="text-lg font-bold text-gray-800">Rp {driver.cost.toLocaleString('id-ID')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Export Button */}
      <div className="card">
        <button
          onClick={() => {
            alert(`Exporting costs for ${period}...`);
          }}
          className="btn-primary w-full"
        >
          Export as CSV
        </button>
      </div>
    </div>
  );
};
