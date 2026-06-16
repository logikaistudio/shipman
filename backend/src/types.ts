// Shared types and interfaces

export enum UserRole {
  Admin = "Admin",
  Officer = "Officer",
  ChiefEngineer = "ChiefEngineer",
  Crew = "Crew"
}

export enum SystemType {
  Engine = "engine",
  Electrical = "electrical",
  Interior = "interior",
  Exterior = "exterior"
}

export enum CriticalityLevel {
  Critical = "critical",
  High = "high",
  Medium = "medium",
  Low = "low"
}

export enum TaskStatus {
  Open = "open",
  InProgress = "in-progress",
  Done = "done",
  Overdue = "overdue"
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
}

export interface Vessel {
  id: string;
  name: string;
  imo: string;
  mmsi: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface ChecklistItem {
  id: string;
  label: string;
  inputType: "radio" | "numeric" | "text" | "checkbox";
  threshold?: { min?: number; max?: number };
  criticality: CriticalityLevel;
  required: boolean;
  defaultCostItems?: CostItem[];
  defaultLaborHours?: number;
}

export interface TemplateChecklist {
  id: string;
  title: string;
  system: SystemType;
  items: ChecklistItem[];
  version: number;
  createdBy: string;
  createdAt: Date;
}

export interface CostItem {
  id: string;
  label: string;
  unitCost: number;
  defaultQty: number;
  unit: string;
}

export interface LaborRate {
  id: string;
  role: UserRole;
  ratePerHour: number;
  currency: string;
}

export interface ScheduledTask {
  id: string;
  vesselId: string;
  templateId: string;
  systemType: SystemType;
  name: string;
  description?: string;
  dueDate: Date;
  recurrence?: { type: "daily" | "weekly" | "monthly"; interval: number };
  assignedTo?: string;
  status: TaskStatus;
  createdAt: Date;
}

export interface LogEntry {
  id: string;
  taskId: string;
  taskName?: string;
  userId: string;
  timestamp: Date;
  responses: Array<{ itemId: string; value: any; notes?: string }>;
  attachments: Attachment[];
  actualCost?: { parts: number; labor: number };
  location?: { lat: number; lng: number };
}

export interface Attachment {
  id: string;
  type: string;
  url: string;
  thumbnail?: string;
  uploadedAt: Date;
}

export interface AggregatedCost {
  vesselId: string;
  period: string; // YYYY-MM or YYYY
  totalParts: number;
  totalLabor: number;
  totalMisc: number;
  grandTotal: number;
  breakdownBySystem?: Record<SystemType, number>;
}

export interface ReadinessReport {
  vesselId: string;
  timestamp: Date;
  score: number; // 0-100
  perSystem: Array<{ system: SystemType; score: number; criticalOpen: number }>;
  criticalOpenItems: LogEntry[];
  missionProfile?: string;
}

export interface MissionProfile {
  id: string;
  name: string;
  systemWeights: Record<SystemType, number>; // e.g., engine: 0.3, electrical: 0.25
  criticalSystems: SystemType[];
}
