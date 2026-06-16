import {
  ScheduledTask,
  LogEntry,
  AggregatedCost,
  TemplateChecklist,
  LaborRate,
  UserRole
} from "../types";

/**
 * CostService: Handles cost calculations and aggregations
 */
export class CostService {
  private laborRates: Map<UserRole, LaborRate> = new Map();
  private allLogs: LogEntry[] = [];
  private allTasks: ScheduledTask[] = [];

  /**
   * Register a labor rate for a role
   */
  registerLaborRate(role: UserRole, ratePerHour: number, currency: string) {
    this.laborRates.set(role, {
      id: role,
      role,
      ratePerHour,
      currency
    });
  }

  /**
   * Calculate cost per task
   */
  calculateTaskCost(task: ScheduledTask, template: TemplateChecklist): number {
    let totalCost = 0;

    // Sum cost of all items in template
    for (const item of template.items) {
      if (item.defaultCostItems) {
        for (const costItem of item.defaultCostItems) {
          totalCost += costItem.unitCost * costItem.defaultQty;
        }
      }

      // Add labor cost
      if (item.defaultLaborHours) {
        const laborRate = this.laborRates.get(UserRole.ChiefEngineer);
        if (laborRate) {
          totalCost += item.defaultLaborHours * laborRate.ratePerHour;
        }
      }
    }

    return totalCost;
  }

  /**
   * Expand recurring tasks for a period and calculate total cost
   */
  expandRecurringTasks(
    task: ScheduledTask,
    startDate: Date,
    endDate: Date
  ): number {
    if (!task.recurrence) {
      return 0; // No recurrence
    }

    const recurrenceCount = this.calculateRecurrenceCount(
      task.dueDate,
      startDate,
      endDate,
      task.recurrence.type,
      task.recurrence.interval
    );

    // Assume we have a template to calculate single task cost
    // In real scenario, we'd fetch template from DB
    const singleTaskCost = 100; // Placeholder

    return recurrenceCount * singleTaskCost;
  }

  /**
   * Calculate number of recurrences within a period
   */
  private calculateRecurrenceCount(
    taskDueDate: Date,
    startDate: Date,
    endDate: Date,
    recurrenceType: string,
    interval: number
  ): number {
    let count = 0;
    let current = new Date(taskDueDate);

    while (current <= endDate) {
      if (current >= startDate) {
        count++;
      }

      // Increment based on recurrence type
      switch (recurrenceType) {
        case "daily":
          current.setDate(current.getDate() + interval);
          break;
        case "weekly":
          current.setDate(current.getDate() + interval * 7);
          break;
        case "monthly":
          current.setMonth(current.getMonth() + interval);
          break;
      }
    }

    return count;
  }

  /**
   * Aggregate costs for a vessel and period
   */
  aggregateCosts(
    vesselId: string,
    period: string // "2026-06" or "2026"
  ): AggregatedCost {
    const [year, month] = period.split("-");

    let totalParts = 0;
    let totalLabor = 0;
    let totalMisc = 0;

    // Filter logs for this vessel and period
    for (const log of this.allLogs) {
      const logDate = new Date(log.timestamp);

      // Check if log matches period
      if (
        logDate.getFullYear().toString() === year &&
        (!month || (logDate.getMonth() + 1).toString().padStart(2, "0") === month)
      ) {
        if (log.actualCost) {
          totalParts += log.actualCost.parts || 0;
          totalLabor += log.actualCost.labor || 0;
        }
      }
    }

    return {
      vesselId,
      period,
      totalParts,
      totalLabor,
      totalMisc,
      grandTotal: totalParts + totalLabor + totalMisc
    };
  }

  /**
   * Get top cost drivers
   */
  getTopCostDrivers(
    vesselId: string,
    period: string,
    limit: number = 5
  ): Array<{ label: string; cost: number }> {
    const costs: Record<string, number> = {};

    for (const log of this.allLogs) {
      const logDate = new Date(log.timestamp);
      const [year, month] = period.split("-");

      if (
        logDate.getFullYear().toString() === year &&
        (!month || (logDate.getMonth() + 1).toString().padStart(2, "0") === month)
      ) {
        if (log.actualCost) {
          const key = `Task ${log.taskId}`;
          costs[key] = (costs[key] || 0) + (log.actualCost.parts + log.actualCost.labor);
        }
      }
    }

    return Object.entries(costs)
      .map(([label, cost]) => ({ label, cost }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, limit);
  }

  setLogs(logs: LogEntry[]) {
    this.allLogs = logs;
  }

  setTasks(tasks: ScheduledTask[]) {
    this.allTasks = tasks;
  }
}

export default new CostService();
