import type { VercelRequest, VercelResponse } from '@vercel/node';
import { vessels } from '../../../../../_db';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { vesselId } = req.query;
  const vessel = vessels.get(vesselId as string);
  if (!vessel) return res.status(404).json({ error: 'Vessel not found' });

  // Return mock top cost drivers
  return res.json([
    { label: 'Suku Cadang DG II', cost: 4500000 },
    { label: 'Overhaul MPK III', cost: 3200000 },
    { label: 'Labor Teknik', cost: 2000000 },
    { label: 'Valve Pipa AL', cost: 1200000 },
    { label: 'Filter Bahan Bakar', cost: 800000 }
  ]);
}
