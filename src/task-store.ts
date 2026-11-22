import { randomUUID } from "node:crypto";

export const taskStatuses = ["todo", "in_progress", "done"] as const;
export type TaskStatus = (typeof taskStatuses)[number];

export interface Task {
  readonly id: string;
  readonly title: string;
  readonly status: TaskStatus;
}

type TaskUpdate = Partial<Pick<Task, "title" | "status">>;

export class TaskStore {
  private readonly tasks = new Map<string, Task>();

  list(): Task[] {
    return [...this.tasks.values()];
  }

  get(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  create(title: string): Task {
    const task: Task = { id: randomUUID(), title, status: "todo" };
    this.tasks.set(task.id, task);
    return task;
  }

  update(id: string, changes: TaskUpdate): Task | undefined {
    const task = this.tasks.get(id);
    if (!task) return undefined;

    const updated = { ...task, ...changes };
    this.tasks.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.tasks.delete(id);
  }
}
