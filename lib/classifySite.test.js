const fs = require("fs");
const path = require("path");
const { classifyNetlifySite, classifySite } = require("./classifySite");

const pausedHtml = fs.readFileSync(
  path.join(__dirname, "../netlify/functions/lib/__fixtures__/paused-sample.html"),
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

console.log("classifySite tests\n");

test("paused fixture -> paused (netlify)", () => {
  const r = classifyNetlifySite({
    statusCode: 200,
    bodyText: pausedHtml,
  });
  assert(r.state === "paused", `expected paused, got ${r.state}`);
});

test("active html with expectInBody -> active", () => {
  const r = classifyNetlifySite({
    statusCode: 200,
    bodyText: activeHtml,
    expectInBody: ["Saint Seiya", "Rebirth"],
  });
  assert(r.state === "active", `expected active, got ${r.state}`);
});

test("vercel deployment not found -> paused", () => {
  const r = classifySite({
    statusCode: 404,
    bodyText: "<html><body>Deployment not found</body></html>",
    platform: "vercel",
  });
  assert(r.state === "paused", `expected paused, got ${r.state}`);
});

test("timeout -> error", () => {
  const r = classifySite({ fetchError: "timeout", platform: "generic" });
  assert(r.state === "error", r.state);
});

console.log("");
