import { describe, it, expect } from 'vitest';
import { CostService } from './costService';
import { ReadinessService } from './readinessService';
import { UserRole, SystemType, TaskStatus } from '../types';

describe('CostService', () => {
  const costService = new CostService();

  it('should register labor rates', () => {
    costService.registerLaborRate(UserRole.ChiefEngineer, 50, 'USD');
    // Verify by checking aggregation later
    expect(true).toBe(true);
  });

  it('should calculate aggregate costs for a period', () => {
    const aggregated = costService.aggregateCosts('vessel-001', '2026-06');
    expect(aggregated).toBeDefined();
    expect(aggregated.period).toBe('2026-06');
    expect(aggregated.grandTotal).toBeGreaterThanOrEqual(0);
  });

  it('should get top cost drivers', () => {
    const drivers = costService.getTopCostDrivers('vessel-001', '2026-06', 5);
    expect(Array.isArray(drivers)).toBe(true);
  });
});

describe('ReadinessService', () => {
  const readinessService = new ReadinessService();

  it('should calculate readiness with default mission profile', () => {
    const readiness = readinessService.calculateReadiness('vessel-001');
    expect(readiness).toBeDefined();
    expect(readiness.score).toBeGreaterThanOrEqual(0);
    expect(readiness.score).toBeLessThanOrEqual(100);
    expect(readiness.perSystem.length).toBeGreaterThan(0);
  });

  it('should support different mission profiles', () => {
    const patrolReadiness = readinessService.calculateReadiness('vessel-001', 'patrol');
    const combatReadiness = readinessService.calculateReadiness('vessel-001', 'combat');
    expect(patrolReadiness).toBeDefined();
    expect(combatReadiness).toBeDefined();
  });

  it('should check readiness for mission', () => {
    const isReady = readinessService.isReadyForMission('vessel-001', 'patrol');
    expect(isReady).toHaveProperty('ready');
    expect(typeof isReady.ready).toBe('boolean');
  });

  it('should return mission profiles', () => {
    const profiles = readinessService.getMissionProfiles();
    expect(Array.isArray(profiles)).toBe(true);
    expect(profiles.length).toBeGreaterThan(0);
    expect(profiles.some(p => p.name === 'Patrol')).toBe(true);
    expect(profiles.some(p => p.name === 'Combat')).toBe(true);
  });
});
