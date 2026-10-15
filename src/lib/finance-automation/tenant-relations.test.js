"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const schema = fs.readFileSync(path.join(process.cwd(), "prisma", "schema.prisma"), "utf8");
function model(name) {
  const m = new RegExp("^model " + name + " \\{([\\s\\S]*?)^\\}", "m").exec(schema);
  assert.ok(m, "missing model: " + name);
  return m[1];
}
const key = "@@unique([id, agencyId])";
for (const name of ["Client", "FinanceEntry", "AgencyFinanceConnection"]) {
  test(name + " exposes composite tenant key", () => assert.ok(model(name).includes(key)));
}
const relationCases = [
  ["AgencyClientBillingProfile", "client", "clientId"],
  ["AgencyCharge", "financeEntry", "financeEntryId"],
  ["AgencyCharge", "providerConnection", "providerConnectionId"],
  ["AgencyCharge", "client", "clientId"],
  ["AgencyFiscalDocument", "financeEntry", "financeEntryId"],
  ["AgencyFiscalDocument", "providerConnection", "providerConnectionId"],
  ["AgencyFiscalDocument", "client", "clientId"],
  ["AgencyFinanceWebhookEvent", "providerConnection", "providerConnectionId"],
];
for (const [name, field, id] of relationCases) {
  test(name + "." + field + " is scoped by agencyId", () => {
    const pattern = new RegExp("^\\s*" + field + "\\s+\\w+\\??\\s+@relation\\(fields: \\[" + id + ", agencyId\\], references: \\[id, agencyId\\], onDelete: Restrict\\)", "m");
    assert.match(model(name), pattern);
  });
}
test("nullable Client ownership retained for legacy records", () => assert.match(model("Client"), /^\s*agencyId String\?/m));
test("optional fiscal connection and client stay nullable", () => {
  assert.match(model("AgencyFiscalDocument"), /^\s*providerConnectionId String\?/m);
  assert.match(model("AgencyFiscalDocument"), /^\s*clientId String\?/m);
  assert.match(model("AgencyCharge"), /^\s*clientId String\?/m);
});
test("Client back-relations allow optional charge/document references", () => {
  assert.match(model("Client"), /agencyCharges\s+AgencyCharge\[\]/);
  assert.match(model("Client"), /agencyFiscalDocuments\s+AgencyFiscalDocument\[\]/);
});
test("no real financial execution was enabled in this release", () => {
  const doc = fs.readFileSync(path.join(process.cwd(), "docs", "FINANCE_AUTOMATION_PHASE2C.md"), "utf8");
  assert.match(doc, /NO PRODUCTION DATABASE MIGRATION/);
});
