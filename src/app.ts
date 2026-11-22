import express, { type ErrorRequestHandler } from "express";
import { Histogram, Registry } from "@prometheus-io/client";
import { TaskStore, taskStatuses, type TaskStatus } from "./task-store.js";

function isObject(body: unknown): body is Record<string, unknown> {
  return typeof body === "object" && body !== null && !Array.isArray(body);
}

function readTitle(value: unknown): string | undefined {
  return typeof value === "string" ? value.trim() || undefined : undefined;
}

function isTaskStatus(value: unknown): value is TaskStatus {
  return taskStatuses.some((status) => status === value);
}

const handleJsonError: ErrorRequestHandler = (error: unknown, _req, res, next) => {
  if (isObject(error)) {
    switch (error.type) {
      case "entity.parse.failed":
        res.status(400).json({ error: "Invalid JSON body" });
        return;
      case "entity.too.large":
        res.status(413).json({ error: "Request body is too large" });
        return;
    }
  }
  next(error);
};

export function createApp() {
  const app = express();
  const store = new TaskStore();
  const metrics = new Registry();
  const requestDuration = new Histogram({
    name: "task_api_http_request_duration_seconds",
    help: "Duration of completed Task API requests in seconds.",
    labelNames: ["status_class"] as const,
    registers: [metrics],
  });
  app.disable("x-powered-by");

  app.get("/health", (_req, res) => res.json({ status: "ok" }));
  app.get("/ready", (_req, res) => res.json({ status: "ready" }));
  app.get("/metrics", async (_req, res) => {
    res.set("Content-Type", metrics.contentType).send(await metrics.metrics());
  });

  app.use((req, res, next) => {
    const elapsed = requestDuration.startTimer();
    const method = req.method;

    res.once("finish", () => {
      const status = res.statusCode;
      const durationSeconds = elapsed({ status_class: `${Math.floor(status / 100)}xx` });
      console.log(JSON.stringify({
        event: "http_request",
        method,
        status,
        duration_ms: durationSeconds * 1000,
      }));
    });

    next();
  });

  const tasks = express.Router();
  tasks.use(express.json());

  tasks.get("/", (_req, res) => res.json(store.list()));

  tasks.post("/", (req, res) => {
    const body: unknown = req.body;
    const title = isObject(body) && Object.keys(body).length === 1
      ? readTitle(body.title)
      : undefined;
    if (!title) {
      return res.status(400).json({ error: "Provide a non-empty title as the only field" });
    }
    const task = store.create(title);
    return res.location(`/api/tasks/${task.id}`).status(201).json(task);
  });

  tasks.get("/:id", (req, res) => {
    const task = store.get(req.params.id);
    if (!task) return res.status(404).json({ error: "Task not found" });
    return res.json(task);
  });

  tasks.patch("/:id", (req, res) => {
    const body: unknown = req.body;
    if (!isObject(body) || Object.keys(body).some((key) => key !== "title" && key !== "status")) {
      return res.status(400).json({ error: "Provide a title, status, or both" });
    }
    const title = readTitle(body.title);
    const status = isTaskStatus(body.status) ? body.status : undefined;
    if ((!title && !status) || ("title" in body && !title) || ("status" in body && !status)) {
      return res.status(400).json({ error: "Use a non-empty title or a status of todo, in_progress, or done" });
    }

    const task = store.update(req.params.id, { ...(title && { title }), ...(status && { status }) });
    if (!task) return res.status(404).json({ error: "Task not found" });
    return res.json(task);
  });

  tasks.delete("/:id", (req, res) => {
    if (!store.delete(req.params.id)) return res.status(404).json({ error: "Task not found" });
    return res.status(204).end();
  });

  app.use("/api/tasks", tasks);
  app.use(handleJsonError);
  return app;
}
