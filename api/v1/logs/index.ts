import type { VercelRequest, VercelResponse } from '@vercel/node';
import { tasks, logs } from '../../_db';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { vesselId } = req.query;
  let filtered = Array.from(logs.values());
  if (vesselId) {
    const allTasks = Array.from(tasks.values());
    filtered = filtered.filter(l => {
      const task = allTasks.find(t => t.id === l.taskId);
      return task?.vesselId === vesselId;
    });
  }
  return res.json(filtered);
}
