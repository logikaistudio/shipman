import type { VercelRequest, VercelResponse } from '@vercel/node';
import { vessels } from '../../../_db';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { vesselId } = req.query;
  const vessel = vessels.get(vesselId as string);

  if (req.method === 'GET') {
    if (!vessel) return res.status(404).json({ error: 'Vessel not found' });
    return res.json(vessel);
  }

  if (req.method === 'PUT') {
    if (!vessel) return res.status(404).json({ error: 'Vessel not found' });
    const body = req.body;
    const updatedVessel = { ...vessel, ...body, updatedAt: new Date().toISOString() };
    vessels.set(vesselId as string, updatedVessel);
    return res.json(updatedVessel);
  }

  if (req.method === 'DELETE') {
    if (!vessel) return res.status(404).json({ error: 'Vessel not found' });
    vessels.delete(vesselId as string);
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
