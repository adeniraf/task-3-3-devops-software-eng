import assert from "node:assert/strict";
import { test } from "node:test";
import request from "supertest";
import { createApp } from "../../src/app.js";

test("reports liveness and readiness", async () => {
  const api = request(createApp());
  await api.get("/health").expect(200, { status: "ok" });
  await api.get("/ready").expect(200, { status: "ready" });
});

test("creates, lists, fetches, updates and deletes a task", async () => {
  const api = request(createApp());
  await api.get("/api/tasks").expect(200, []);

  const created = await api.post("/api/tasks").send({ title: "  Prepare demo  " }).expect(201);
  const id: unknown = created.body.id;
  assert.equal(typeof id, "string");
  const path = `/api/tasks/${id}`;
  const task = { id, title: "Prepare demo", status: "todo" };
  assert.deepEqual(created.body, task);
  assert.equal(created.headers.location, path);

  await api.get("/api/tasks").expect(200, [task]);
  await api.get(path).expect(200, task);
  await api.patch(path).send({ title: "Rehearse demo" })
    .expect(200, { ...task, title: "Rehearse demo" });
  await api.patch(path).send({ status: "in_progress" })
    .expect(200, { ...task, title: "Rehearse demo", status: "in_progress" });
  await api.patch(path).send({ title: "Record demo", status: "done" })
    .expect(200, { ...task, title: "Record demo", status: "done" });

  await api.delete(path).expect(204, "");
  await api.get("/api/tasks").expect(200, []);
  await api.get(path).expect(404, { error: "Task not found" });
});

test("rejects missing, invalid and oversized creation payloads", async () => {
  const api = request(createApp());
  await api.post("/api/tasks").expect(400);

  for (const body of [{}, [], { title: 42 }, { title: " " }, { title: "Demo", status: "done" }]) {
    await api.post("/api/tasks").send(body)
      .expect(400, { error: "Provide a non-empty title as the only field" });
  }

  await api.post("/api/tasks").type("json").send('{"title":')
    .expect(400, { error: "Invalid JSON body" });
  await api.post("/api/tasks").send({ title: "a".repeat(110 * 1024) })
    .expect(413, { error: "Request body is too large" });
  await api.get("/api/tasks").expect(200, []);
});

test("rejects invalid updates without changing the existing task", async () => {
  const api = request(createApp());
  const created = await api.post("/api/tasks").send({ title: "Prepare demo" }).expect(201);
  const path = created.headers.location;

  const invalidUpdates = [
    {},
    [],
    { id: "another-id" },
    { status: "blocked" },
    { title: "", status: "done" },
    { title: "Valid", status: null },
  ];
  for (const body of invalidUpdates) {
    await api.patch(path).send(body).expect(400);
  }

  await api.get(path).expect(200, created.body);
});

test("returns 404 for operations on a missing task", async () => {
  const api = request(createApp());
  const path = "/api/tasks/missing";
  const error = { error: "Task not found" };

  await api.get(path).expect(404, error);
  await api.patch(path).send({ status: "done" }).expect(404, error);
  await api.delete(path).expect(404, error);
});
