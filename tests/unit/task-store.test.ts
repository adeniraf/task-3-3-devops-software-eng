import assert from "node:assert/strict";
import { test } from "node:test";
import { TaskStore } from "../../src/task-store.js";

test("creates tasks with unique IDs and lists them in creation order", () => {
  const store = new TaskStore();
  assert.deepEqual(store.list(), []);

  const first = store.create("Prepare demo");
  const second = store.create("Prepare demo");

  assert.notEqual(first.id, second.id);
  assert.equal(first.status, "todo");
  assert.deepEqual(store.list(), [first, second]);
  assert.deepEqual(store.get(first.id), first);
});

test("updates only the supplied fields and preserves the ID", () => {
  const store = new TaskStore();
  const task = store.create("Prepare demo");

  const renamed = store.update(task.id, { title: "Rehearse demo" });
  assert.deepEqual(renamed, { ...task, title: "Rehearse demo" });

  const completed = store.update(task.id, { status: "done" });
  assert.deepEqual(completed, { ...task, title: "Rehearse demo", status: "done" });
  assert.deepEqual(store.get(task.id), completed);
});

test("deletes only the requested task and reports missing IDs", () => {
  const store = new TaskStore();
  const first = store.create("Prepare demo");
  const second = store.create("Record demo");

  assert.equal(store.delete(first.id), true);
  assert.equal(store.get(first.id), undefined);
  assert.equal(store.update(first.id, { status: "done" }), undefined);
  assert.equal(store.delete(first.id), false);
  assert.deepEqual(store.list(), [second]);
});
