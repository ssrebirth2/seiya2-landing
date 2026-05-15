const fs = require("fs");
const path = require("path");
const { classifyNetlifySite } = require("./detectPaused");

const pausedHtml = fs.readFileSync(
  path.join(__dirname, "__fixtures__", "paused-sample.html"),
  "utf8"
);

const activeHtml = `
<!DOCTYPE html>
<html><head><title>Saint Seiya: Rebirth 2 (EX)</title></head>
<body><h1>Saint Seiya: Rebirth 2 (EX) Database</h1><p>Welcome to Rebirth</p></body></html>
`;

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function test(name, fn) {
  try {
    fn();
    console.log(`  ok ${name}`);
  } catch (e) {
    console.error(`  FAIL ${name}: ${e.message}`);
    process.exitCode = 1;
  }
}

console.log("detectPaused tests\n");

test("paused fixture → paused", () => {
  const r = classifyNetlifySite({
    statusCode: 200,
    bodyText: pausedHtml,
  });
  assert(r.state === "paused", `expected paused, got ${r.state}`);
  assert(r.reason === "netlify_usage_pause", r.reason);
});

test("active content with expectInBody → active", () => {
  const r = classifyNetlifySite({
    statusCode: 200,
    bodyText: activeHtml,
    expectInBody: ["Saint Seiya", "Rebirth"],
  });
  assert(r.state === "active", `expected active, got ${r.state}`);
});

test("active without expectInBody → active", () => {
  const r = classifyNetlifySite({
    statusCode: 200,
    bodyText: activeHtml.repeat(2),
  });
  assert(r.state === "active", `expected active, got ${r.state}`);
});

test("timeout → error", () => {
  const r = classifyNetlifySite({ statusCode: null, bodyText: "", fetchError: "timeout" });
  assert(r.state === "error" && r.reason === "timeout", r.state);
});

test("http 503 without pause text → error", () => {
  const r = classifyNetlifySite({ statusCode: 503, bodyText: "Service Unavailable" });
  assert(r.state === "error", r.state);
});

test("content mismatch with expectInBody → error or paused", () => {
  const r = classifyNetlifySite({
    statusCode: 200,
    bodyText: "<html><body>unrelated tiny</body></html>",
    expectInBody: ["Saint Seiya"],
  });
  assert(r.state !== "active", "should not be active");
});

if (process.exitCode) {
  console.log("\nSome tests failed.");
  process.exit(1);
}
console.log("\nAll tests passed.");
