import type { VercelRequest, VercelResponse } from '@vercel/node';
import { tasks, logs } from '../../../_db';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { taskId } = req.query;
  const task = tasks.get(taskId as string);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const logEntry = {
    id: `log-${Date.now()}`,
    taskId: task.id,
    taskName: task.name,
    userId: 'user-001',
    timestamp: new Date(),
    responses: req.body.responses || [],
    attachments: req.body.attachments || [],
    actualCost: req.body.actualCost || { parts: 0, labor: 0 }
  };

  logs.set(logEntry.id, logEntry);
  task.status = 'done' as any;

  return res.status(201).json(logEntry);
}
