import assert from "node:assert/strict";
import { test } from "node:test";
import { screenshot } from "../backend/dist/features/support/support.controller.js";

test("support screenshot accepts references and images up to 5 MB", () => {
  assert.equal(screenshot("https://example.com/screenshot.png"), "https://example.com/screenshot.png");
  assert.equal(screenshot(null), null);
  const image = `data:image/jpeg;base64,${Buffer.alloc(5 * 1024 * 1024).toString("base64")}`;
  assert.equal(screenshot(image), image);
  const png = "data:image/png;base64,iVBORw0KGgo=";
  assert.equal(screenshot(png), png);
  assert.equal(screenshot(`data:image/jpeg;base64,${Buffer.alloc(5 * 1024 * 1024 + 1).toString("base64")}`), undefined);
  assert.equal(screenshot("data:text/html;base64,SGVsbG8="), undefined);
});
