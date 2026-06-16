import type { VercelRequest, VercelResponse } from '@vercel/node';
import { vessels, tasks, logs } from '../../../_db';

// ---- Readiness Calculator (inline, no external deps) ----
function calculateReadiness(vesselId: string, missionProfile = 'patrol') {
  const vesselTasks = Array.from(tasks.values()).filter(t => t.vesselId === vesselId);
  const allLogs = Array.from(logs.values());

  const systemTypes = ['engine', 'electrical', 'interior', 'exterior'];
  const weights: Record<string, number> = {
    engine: 0.35, electrical: 0.25, interior: 0.20, exterior: 0.20
  };

  const systemScores: Record<string, { score: number; criticalCount: number }> = {};
  systemTypes.forEach(s => { systemScores[s] = { score: 0, criticalCount: 0 }; });

  let totalWeight = 0;
  let weightedScore = 0;
  const allCriticalOpenItems: any[] = [];

  const perTask = vesselTasks.map(task => {
    let defectCount = 0;
    let defects: string[] = [];

    if (task.status === 'done') {
      const taskLog = allLogs
        .filter(l => l.taskId === task.id)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

      if (taskLog?.responses) {
        for (const r of taskLog.responses) {
          const { itemId, value } = r;
          let isDefect = false;
          if (value === 'tidak siap' || value === 'tidak_siap' || value === false) {
            isDefect = true;
            defects.push(`${itemId.replace('-status', '').toUpperCase()} tidak siap`);
          } else if (itemId === 'hsd-current') {
            const hsdFull = parseFloat(taskLog.responses.find(x => x.itemId === 'hsd-full')?.value || '30000');
            if (parseFloat(value) < hsdFull * 0.5) {
              isDefect = true; defects.push(`HSD rendah (${((parseFloat(value)/hsdFull)*100).toFixed(0)}%)`);
            }
          } else if (itemId === 'at-current') {
            const atFull = parseFloat(taskLog.responses.find(x => x.itemId === 'at-full')?.value || '6000');
            if (parseFloat(value) < atFull * 0.6) {
              isDefect = true; defects.push(`AT rendah (${((parseFloat(value)/atFull)*100).toFixed(0)}%)`);
            }
          }
          if (isDefect) defectCount++;
        }
      }

      if (defectCount > 0) allCriticalOpenItems.push(taskLog);
    }

    const sys = task.systemType;
    const w = weights[sys] || 0.1;
    const taskScore = task.status === 'done' ? Math.max(0, 100 - defectCount * 25) : 0;
    systemScores[sys].score += taskScore;
    if (defectCount > 0) systemScores[sys].criticalCount++;
    totalWeight += w;
    weightedScore += taskScore * w;

    return {
      taskId: task.id, name: task.name, description: task.description || '',
      status: task.status, systemType: task.systemType,
      defectCount, defects, isReady: task.status === 'done' && defectCount === 0
    };
  });

  // Average system scores
  const taskCountPerSystem: Record<string, number> = {};
  vesselTasks.forEach(t => {
    taskCountPerSystem[t.systemType] = (taskCountPerSystem[t.systemType] || 0) + 1;
  });

  const perSystem = systemTypes.map(sys => ({
    system: sys,
    score: taskCountPerSystem[sys]
      ? Math.round(systemScores[sys].score / taskCountPerSystem[sys])
      : 0,
    criticalOpen: systemScores[sys].criticalCount
  }));

  const overallScore = totalWeight > 0
    ? vesselTasks.length > 0
      ? (vesselTasks.filter(t => t.status === 'done' && perTask.find(p => p.taskId === t.id)?.defectCount === 0).length / vesselTasks.length) * 100
      : 0
    : 0;

  return {
    vesselId,
    timestamp: new Date(),
    score: Math.round(Math.max(0, Math.min(100, overallScore))),
    perSystem,
    perTask,
    criticalOpenItems: allCriticalOpenItems,
    missionProfile
  };
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { vesselId } = req.query;
  const vessel = vessels.get(vesselId as string);
  if (!vessel) return res.status(404).json({ error: 'Vessel not found' });

  const { missionProfile } = req.query;
  const readiness = calculateReadiness(vesselId as string, (missionProfile as string) || 'patrol');
  return res.json(readiness);
}
