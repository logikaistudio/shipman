import express, { Express, Request, Response } from "express";
import cors from "cors";
import costService from "./services/costService";
import readinessService from "./services/readinessService";
import { Vessel, User, UserRole, ScheduledTask, LogEntry, AggregatedCost, TaskStatus, SystemType } from "./types";

const app: Express = express();
const PORT = process.env.PORT || 5005;

// Middleware
app.use(cors());
app.use(express.json());

// Mock database
const vessels: Map<string, Vessel> = new Map();
const users: Map<string, User> = new Map();
const tasks: Map<string, ScheduledTask> = new Map();
const logs: Map<string, LogEntry> = new Map();

// Initialize with sample data
const initializeSampleData = () => {
  // Sample vessels
  const vessel1: Vessel = {
    id: "vessel-001",
    name: "KRI Hang Tuah",
    imo: "1234567",
    mmsi: "5120140",
    metadata: { commissioned: 2015, homeport: "Jakarta", budget: 250000000 },
    createdAt: new Date()
  };
  vessels.set(vessel1.id, vessel1);

  const vessel2: Vessel = {
    id: "vessel-002",
    name: "KRI Teluk Peleng",
    imo: "1234568",
    mmsi: "5120141",
    metadata: { commissioned: 2018, homeport: "Surabaya", budget: 150000000 },
    createdAt: new Date()
  };
  vessels.set(vessel2.id, vessel2);

  // Sample users
  const user1: User = {
    id: "user-001",
    email: "chief@example.com",
    name: "John Chief",
    role: UserRole.ChiefEngineer,
    createdAt: new Date()
  };
  users.set(user1.id, user1);

  const user2: User = {
    id: "user-002",
    email: "crew@example.com",
    name: "Budi Operator",
    role: UserRole.Crew,
    createdAt: new Date()
  };
  users.set(user2.id, user2);

  const user3: User = {
    id: "user-003",
    email: "admin@example.com",
    name: "Admin Manager",
    role: UserRole.Admin,
    createdAt: new Date()
  };
  users.set(user3.id, user3);

  const user4: User = {
    id: "user-superadmin",
    email: "superadmin",
    name: "Super Admin",
    role: UserRole.Admin,
    createdAt: new Date()
  };
  users.set(user4.id, user4);

  // Register labor rates
  costService.registerLaborRate(UserRole.ChiefEngineer, 500000, "IDR");
  costService.registerLaborRate(UserRole.Crew, 250000, "IDR");
  costService.registerLaborRate(UserRole.Officer, 750000, "IDR");

  // Generate 11 tasks for each vessel representing the 11 systems
  const generateVesselTasks = (vId: string) => {
    const systems = [
      { name: "Bakap", desc: "Badan Kapal: Pemeriksaan AGA, BGA, & jadwal docking", sys: SystemType.Exterior },
      { name: "Sistem Pendorong", desc: "Mesin Pendorong (MPK I/II/III), Gearbox, Propeller & Kemudi", sys: SystemType.Engine },
      { name: "Liskap", desc: "Kelistrikan Kapal: Diesel Generator I/II & Darurat", sys: SystemType.Electrical },
      { name: "Alnavkom", desc: "Alat Navigasi & Komunikasi: Gyro Compass & Sistem Komunikasi", sys: SystemType.Electrical },
      { name: "Pesawat Bantu", desc: "Pompa DPK (Pemadam), AL AC, Pompa BB, Pompa AT", sys: SystemType.Engine },
      { name: "Sistem Pipa", desc: "Pemeriksaan Sistem Pipa AL, AT, dan Bahan Bakar", sys: SystemType.Engine },
      { name: "Akomodasi", desc: "Sistem Pendingin AC (1/2/3) & Coolbox", sys: SystemType.Interior },
      { name: "Pesawat Bahari", desc: "Lier Jangkar & Peralatan Kemudi Bahari", sys: SystemType.Exterior },
      { name: "Alat Keselamatan", desc: "APAR, CO2 Central, Life Raft, Sekoci, Life Jacket", sys: SystemType.Interior },
      { name: "Persenjataan", desc: "Meriam Haluan 20mm & Meriam Buritan 12.7mm ka/ki", sys: SystemType.Exterior },
      { name: "Logca", desc: "Logistik Cair: Monitoring BBM (HSD) & Air Tawar (AT)", sys: SystemType.Engine }
    ];

    systems.forEach((sys, idx) => {
      const id = `task-${vId}-${idx + 1}`;
      tasks.set(id, {
        id,
        vesselId: vId,
        templateId: `temp-${sys.name.toLowerCase().replace(/\s+/g, '-')}`,
        systemType: sys.sys,
        name: sys.name,
        description: sys.desc,
        dueDate: new Date("2026-06-10"),
        recurrence: { type: "daily", interval: 1 },
        status: (idx === 0 || idx === 2) ? TaskStatus.Done : TaskStatus.Open, // Mark Bakap and Liskap as done to match mock logs
        createdAt: new Date()
      });
    });
  };

  generateVesselTasks("vessel-001");
  generateVesselTasks("vessel-002");

  // Sample log entries (completed tasks)
  const log1: LogEntry = {
    id: "log-001",
    taskId: "task-vessel-001-1", // Bakap
    userId: "user-001",
    timestamp: new Date("2026-06-05"),
    responses: [
      { itemId: "aga", value: "siap" },
      { itemId: "bga", value: "siap" },
      { itemId: "docking", value: "16 Maret 2020 s.d 9 April 2020" }
    ],
    attachments: [],
    actualCost: { parts: 5000000, labor: 2000000 }
  };
  logs.set(log1.id, log1);

  const log2: LogEntry = {
    id: "log-002",
    taskId: "task-vessel-001-3", // Liskap
    userId: "user-002",
    timestamp: new Date("2026-06-03"),
    responses: [
      { itemId: "dg1-status", value: "siap" },
      { itemId: "dg1-hours", value: 27986 },
      { itemId: "dg2-status", value: "tidak siap" },
      { itemId: "dg2-hours", value: 18832 }
    ],
    attachments: [],
    actualCost: { parts: 1500000, labor: 1000000 }
  };
  logs.set(log2.id, log2);
};

initializeSampleData();

// Update services with initial data
costService.setLogs(Array.from(logs.values()));
costService.setTasks(Array.from(tasks.values()));
readinessService.setLogs(Array.from(logs.values()));
readinessService.setTasks(Array.from(tasks.values()));

// Routes: Vessels
app.get("/api/v1/vessels", (req: Request, res: Response) => {
  res.json(Array.from(vessels.values()));
});

app.post("/api/v1/vessels", (req: Request, res: Response) => {
  const vessel: Vessel = {
    id: `vessel-${Date.now()}`,
    ...req.body,
    createdAt: new Date()
  };
  vessels.set(vessel.id, vessel);
  res.status(201).json(vessel);
});

app.get("/api/v1/vessels/:vesselId", (req: Request, res: Response) => {
  const vessel = vessels.get(req.params.vesselId);
  if (!vessel) {
    res.status(404).json({ error: "Vessel not found" });
    return;
  }
  res.json(vessel);
});

// Routes: Costs
app.get("/api/v1/vessels/:vesselId/costs", (req: Request, res: Response) => {
  const { period } = req.query;
  const vessel = vessels.get(req.params.vesselId);
  const budget = vessel?.metadata?.budget || 10000;
  const aggregated = costService.aggregateCosts(
    req.params.vesselId,
    (period as string) || "2026-06"
  );
  res.json({
    ...aggregated,
    budget
  });
});

app.get(
  "/api/v1/vessels/:vesselId/costs/drivers",
  (req: Request, res: Response) => {
    const { period } = req.query;
    const drivers = costService.getTopCostDrivers(
      req.params.vesselId,
      (period as string) || "2026-06",
      5
    );
    res.json(drivers);
  }
);

// Routes: Readiness
app.get("/api/v1/vessels/:vesselId/readiness", (req: Request, res: Response) => {
  const { missionProfile } = req.query;
  const readiness = readinessService.calculateReadiness(
    req.params.vesselId,
    (missionProfile as string) || "patrol"
  );
  res.json(readiness);
});

app.get("/api/v1/mission-profiles", (req: Request, res: Response) => {
  res.json(readinessService.getMissionProfiles());
});

// Routes: Tasks
app.get("/api/v1/tasks", (req: Request, res: Response) => {
  const { vesselId, status } = req.query;
  let filtered = Array.from(tasks.values());

  if (vesselId) {
    filtered = filtered.filter(t => t.vesselId === vesselId);
  }
  if (status) {
    filtered = filtered.filter(t => t.status === status);
  }

  res.json(filtered);
});

app.post("/api/v1/tasks", (req: Request, res: Response) => {
  const task: ScheduledTask = {
    id: `task-${Date.now()}`,
    ...req.body,
    status: "open",
    createdAt: new Date()
  };
  tasks.set(task.id, task);
  res.status(201).json(task);
});

// Routes: Logs
app.get("/api/v1/logs", (req: Request, res: Response) => {
  const { vesselId, from, to } = req.query;
  let filtered = Array.from(logs.values());

  if (vesselId) {
    filtered = filtered.filter(l => {
      const task = tasks.get(l.taskId);
      return task?.vesselId === vesselId;
    });
  }

  res.json(filtered);
});

app.post("/api/v1/tasks/:taskId/complete", (req: Request, res: Response) => {
  const task = tasks.get(req.params.taskId);
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  const logEntry: LogEntry = {
    id: `log-${Date.now()}`,
    taskId: task.id,
    userId: "user-001",
    timestamp: new Date(),
    responses: req.body.responses || [],
    attachments: req.body.attachments || [],
    actualCost: req.body.actualCost || { parts: 0, labor: 0 }
  };

  logs.set(logEntry.id, logEntry);
  task.status = TaskStatus.Done;

  // Update services with new data
  costService.setLogs(Array.from(logs.values()));
  costService.setTasks(Array.from(tasks.values()));
  readinessService.setLogs(Array.from(logs.values()));
  readinessService.setTasks(Array.from(tasks.values()));

  res.status(201).json(logEntry);
});

// Health check
app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "OK" });
});

app.listen(PORT as number, "127.0.0.1", () => {
  console.log(`✓ Server running on http://127.0.0.1:${PORT}`);
});
