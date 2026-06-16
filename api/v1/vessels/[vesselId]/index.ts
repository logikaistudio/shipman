import type { VercelRequest, VercelResponse } from '@vercel/node';
import { vessels } from '../../../_db';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { vesselId } = req.query;
  const vessel = vessels.get(vesselId as string);
  if (!vessel) return res.status(404).json({ error: 'Vessel not found' });

  return res.json(vessel);
}
