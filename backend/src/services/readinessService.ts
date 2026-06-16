import {
  ReadinessReport,
  MissionProfile,
  LogEntry,
  SystemType,
  CriticalityLevel,
  ScheduledTask,
  TaskStatus
} from "../types";

/**
 * ReadinessService: Handles readiness scoring and mission-specific calculations
 */
export class ReadinessService {
  private missionProfiles: Map<string, MissionProfile> = new Map();
  private allLogs: LogEntry[] = [];
  private allTasks: ScheduledTask[] = [];
  private systemWeights: Record<SystemType, number> = {
    [SystemType.Engine]: 0.4,
    [SystemType.Electrical]: 0.3,
    [SystemType.Interior]: 0.15,
    [SystemType.Exterior]: 0.15
  };

  constructor() {
    // Initialize default mission profiles
    this.initializeMissionProfiles();
  }

  private initializeMissionProfiles() {
    const profiles: MissionProfile[] = [
      {
        id: "patrol",
        name: "Patrol",
        systemWeights: {
          [SystemType.Engine]: 0.4,
          [SystemType.Electrical]: 0.3,
          [SystemType.Interior]: 0.15,
          [SystemType.Exterior]: 0.15
        },
        criticalSystems: [SystemType.Engine, SystemType.Electrical]
      },
      {
        id: "combat",
        name: "Combat",
        systemWeights: {
          [SystemType.Engine]: 0.35,
          [SystemType.Electrical]: 0.35,
          [SystemType.Interior]: 0.15,
          [SystemType.Exterior]: 0.15
        },
        criticalSystems: [SystemType.Engine, SystemType.Electrical]
      },
      {
        id: "escort",
        name: "Escort",
        systemWeights: {
          [SystemType.Engine]: 0.4,
          [SystemType.Electrical]: 0.25,
          [SystemType.Interior]: 0.2,
          [SystemType.Exterior]: 0.15
        },
        criticalSystems: [SystemType.Engine]
      },
      {
        id: "transit",
        name: "Transit",
        systemWeights: {
          [SystemType.Engine]: 0.45,
          [SystemType.Electrical]: 0.25,
          [SystemType.Interior]: 0.15,
          [SystemType.Exterior]: 0.15
        },
        criticalSystems: [SystemType.Engine]
      }
    ];

    for (const profile of profiles) {
      this.missionProfiles.set(profile.id, profile);
    }
  }

  /**
   * Calculate readiness score for a vessel
   */
  calculateReadiness(
    vesselId: string,
    missionProfileId: string = "patrol"
  ): ReadinessReport {
    const profile =
      this.missionProfiles.get(missionProfileId) ||
      this.missionProfiles.get("patrol")!;

    const systemScores: Record<SystemType, { score: number; criticalCount: number }> = {
      [SystemType.Engine]: { score: 100, criticalCount: 0 },
      [SystemType.Electrical]: { score: 100, criticalCount: 0 },
      [SystemType.Interior]: { score: 100, criticalCount: 0 },
      [SystemType.Exterior]: { score: 100, criticalCount: 0 }
    };

    // Calculate per-system scores based on task status and checklist responses
    for (const system of Object.values(SystemType)) {
      const systemTasks = this.allTasks.filter(t => t.vesselId === vesselId && t.systemType === system);
      let score = 100;
      let criticalCount = 0;

      for (const task of systemTasks) {
        if (task.status !== TaskStatus.Done) {
          // Open task penalty
          score -= 10;
        } else {
          // Get latest log responses and scan for defects
          const taskLog = this.allLogs
            .filter(l => l.taskId === task.id)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

          if (taskLog && taskLog.responses) {
            for (const r of taskLog.responses) {
              const { itemId, value } = r;
              let isDefect = false;

              if (value === 'tidak siap' || value === 'tidak_siap' || value === false) {
                isDefect = true;
              } else if (itemId === 'hsd-current') {
                const hsdFull = parseFloat(taskLog.responses.find(x => x.itemId === 'hsd-full')?.value || '30000');
                const hsdVal = parseFloat(value);
                if (hsdVal < hsdFull * 0.5) isDefect = true;
              } else if (itemId === 'at-current') {
                const atFull = parseFloat(taskLog.responses.find(x => x.itemId === 'at-full')?.value || '6000');
                const atVal = parseFloat(value);
                if (atVal < atFull * 0.6) isDefect = true;
              }

              if (isDefect) {
                score -= 8; // Deduct for each component defect
                criticalCount++;
              }
            }
          }
        }
      }

      systemScores[system] = {
        score: Math.max(0, Math.min(100, score)),
        criticalCount
      };
    }

    // Calculate weighted overall score
    let overallScore = 0;
    for (const [system, weight] of Object.entries(profile.systemWeights)) {
      overallScore += systemScores[system as SystemType].score * weight;
    }

    // If any critical system has critical open defects, reduce score further
    for (const criticalSystem of profile.criticalSystems) {
      if (systemScores[criticalSystem].criticalCount > 0) {
        overallScore = Math.max(0, overallScore - 12);
      }
    }

    // Get logs with critical open items (defects)
    const allCriticalOpenItems: LogEntry[] = [];
    for (const log of this.allLogs) {
      const task = this.allTasks.find(t => t.id === log.taskId);
      if (task && task.vesselId === vesselId) {
        const hasDefect = log.responses?.some(r => {
          const { itemId, value } = r;
          if (value === 'tidak siap' || value === 'tidak_siap' || value === false) return true;
          if (itemId === 'hsd-current') {
            const hsdFull = parseFloat(log.responses.find(x => x.itemId === 'hsd-full')?.value || '30000');
            const hsdVal = parseFloat(value);
            if (hsdVal < hsdFull * 0.5) return true;
          }
          if (itemId === 'at-current') {
            const atFull = parseFloat(log.responses.find(x => x.itemId === 'at-full')?.value || '6000');
            const atVal = parseFloat(value);
            if (atVal < atFull * 0.6) return true;
          }
          return false;
        });

        if (hasDefect) {
          log.taskName = task.name;
          allCriticalOpenItems.push(log);
        }
      }
    }

    // Build per-task status for the 11 O&M systems
    const vesselTasks = this.allTasks.filter(t => t.vesselId === vesselId);
    const perTask = vesselTasks.map(task => {
      let defectCount = 0;
      let defects: string[] = [];

      if (task.status === TaskStatus.Done) {
        const taskLog = this.allLogs
          .filter(l => l.taskId === task.id)
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

        if (taskLog && taskLog.responses) {
          for (const r of taskLog.responses) {
            const { itemId, value } = r;
            let isDefect = false;

            if (value === 'tidak siap' || value === 'tidak_siap' || value === false) {
              isDefect = true;
              defects.push(`${itemId.replace('-status', '').toUpperCase()} tidak siap`);
            } else if (itemId === 'hsd-current') {
              const hsdFull = parseFloat(taskLog.responses.find(x => x.itemId === 'hsd-full')?.value || '30000');
              if (parseFloat(value) < hsdFull * 0.5) {
                isDefect = true;
                defects.push(`HSD rendah (${((parseFloat(value)/hsdFull)*100).toFixed(0)}%)`);
              }
            } else if (itemId === 'at-current') {
              const atFull = parseFloat(taskLog.responses.find(x => x.itemId === 'at-full')?.value || '6000');
              if (parseFloat(value) < atFull * 0.6) {
                isDefect = true;
                defects.push(`AT rendah (${((parseFloat(value)/atFull)*100).toFixed(0)}%)`);
              }
            }

            if (isDefect) defectCount++;
          }
        }
      }

      return {
        taskId: task.id,
        name: task.name,
        description: task.description || '',
        status: task.status,
        systemType: task.systemType,
        defectCount,
        defects,
        isReady: task.status === TaskStatus.Done && defectCount === 0
      };
    });

    return {
      vesselId,
      timestamp: new Date(),
      score: Math.round(Math.max(0, Math.min(100, overallScore))),
      perSystem: Object.values(SystemType).map(system => ({
        system,
        score: Math.round(systemScores[system].score),
        criticalOpen: systemScores[system].criticalCount
      })),
      perTask,
      criticalOpenItems: allCriticalOpenItems,
      missionProfile: missionProfileId
    };
  }

  /**
   * Get count of completed items for a system (legacy helper)
   */
  private getCompletedItemsForSystem(vesselId: string, system: SystemType): number {
    return this.allTasks.filter(
      task =>
        task.vesselId === vesselId &&
        task.systemType === system &&
        task.status === TaskStatus.Done
    ).length;
  }

  /**
   * Check if vessel is ready for mission
   */
  isReadyForMission(
    vesselId: string,
    missionProfileId: string = "patrol"
  ): { ready: boolean; reason?: string } {
    const readiness = this.calculateReadiness(vesselId, missionProfileId);

    if (readiness.score < 80) {
      return { ready: false, reason: "Readiness score below 80%" };
    }

    if (readiness.criticalOpenItems.length > 0) {
      return { ready: false, reason: "Critical items still open" };
    }

    return { ready: true };
  }

  /**
   * Get mission profiles
   */
  getMissionProfiles(): MissionProfile[] {
    return Array.from(this.missionProfiles.values());
  }

  setLogs(logs: LogEntry[]) {
    this.allLogs = logs;
  }

  setTasks(tasks: ScheduledTask[]) {
    this.allTasks = tasks;
  }
}

export default new ReadinessService();
