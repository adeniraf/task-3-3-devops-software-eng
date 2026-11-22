import assert from "node:assert/strict";
import { test } from "node:test";
import { createApp } from "../../src/app.js";

test("the Express app disables the X-Powered-By header", () => {
  assert.equal(createApp().enabled("x-powered-by"), false);
});
