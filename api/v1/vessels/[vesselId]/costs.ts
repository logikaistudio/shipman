import type { VercelRequest, VercelResponse } from '@vercel/node';
import { vessels, logs } from '../../../_db';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { vesselId } = req.query;
  const vessel = vessels.get(vesselId as string);
  if (!vessel) return res.status(404).json({ error: 'Vessel not found' });

  const { period } = req.query;
  const periodStr = (period as string) || '2026-06';

  const allLogs = Array.from(logs.values());
  let totalParts = 0;
  let totalLabor = 0;

  for (const log of allLogs) {
    if (log.actualCost) {
      // Simple period filter by log timestamp year-month
      const logPeriod = new Date(log.timestamp).toISOString().slice(0, 7);
      if (logPeriod === periodStr) {
        totalParts += log.actualCost.parts;
        totalLabor += log.actualCost.labor;
      }
    }
  }

  // If no logs for period, use seed data totals (set to ~65% usage)
  if (totalParts === 0 && totalLabor === 0) {
    const vesselBudget = vessel.metadata?.budget || 250000000;
    const spent = vesselBudget * 0.65;
    totalParts = spent * 0.40;
    totalLabor = spent * 0.20;
    const totalMisc = spent * 0.40;
    
    return res.json({
      vesselId, period: periodStr,
      totalParts, totalLabor, totalMisc,
      grandTotal: spent,
      budget: vesselBudget
    });
  }

  const grandTotal = totalParts + totalLabor;
  const budget = vessel.metadata?.budget || 250000000;

  return res.json({
    vesselId, period: periodStr,
    totalParts, totalLabor, totalMisc: 500000,
    grandTotal: grandTotal + 500000,
    budget
  });
}
