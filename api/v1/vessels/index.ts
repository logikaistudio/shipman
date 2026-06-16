import type { VercelRequest, VercelResponse } from '@vercel/node';
import { vessels } from '../../_db';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    return res.json(Array.from(vessels.values()));
  }

  if (req.method === 'POST') {
    const vessel = { id: `vessel-${Date.now()}`, ...req.body, createdAt: new Date() };
    vessels.set(vessel.id, vessel);
    return res.status(201).json(vessel);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
