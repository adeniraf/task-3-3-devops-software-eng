import assert from "node:assert/strict";
import { test } from "node:test";
import request from "supertest";
import { createApp } from "../../src/app.js";

test("exports request latency and counts by status class without counting probes", async () => {
  const api = request(createApp());

  await api.get("/health").expect(200);
  await api.get("/ready").expect(200);
  await api.get("/metrics").expect(200);
  await api.get("/api/tasks").expect(200);
  await api.get("/api/tasks/missing").expect(404);

  const response = await api.get("/metrics").expect(200).expect("Content-Type", /text\/plain/);
  assert.match(response.text, /^task_api_http_request_duration_seconds_count\{status_class="2xx"\} 1$/m);
  assert.match(response.text, /^task_api_http_request_duration_seconds_count\{status_class="4xx"\} 1$/m);
  assert.match(response.text, /^task_api_http_request_duration_seconds_bucket\{/m);
});
