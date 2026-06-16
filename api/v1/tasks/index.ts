import type { VercelRequest, VercelResponse } from '@vercel/node';
import { tasks, logs } from '../../_db';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const { vesselId, status } = req.query;
    let filtered = Array.from(tasks.values());
    if (vesselId) filtered = filtered.filter(t => t.vesselId === vesselId);
    if (status) filtered = filtered.filter(t => t.status === status);
    return res.json(filtered);
  }

  if (req.method === 'POST') {
    const task = { id: `task-${Date.now()}`, ...req.body, status: 'open', createdAt: new Date() };
    tasks.set(task.id, task);
    return res.status(201).json(task);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
