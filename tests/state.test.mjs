import test from "node:test";
import assert from "node:assert/strict";
import {
  CAPABILITIES, deniedPermissions, emptyState, transition,
  validateState, exportedMetadata, importedMetadata, SECURITY_STATUS
} from "../src/state.mjs";
const id1 = "11111111-1111-4111-8111-111111111111";
const id2 = "22222222-2222-4222-8222-222222222222";
const at = "2026-10-30T00:00:00.000Z";
const opt = (id) => ({now:()=>at, makeId:()=>id});
const created = () => transition(emptyState(), {type:"create",name:" Work ",mode:"node"}, opt(id1));
test("new state has no profiles or permissions", () => {
  assert.deepEqual(emptyState().profiles, []);
  assert.ok(Object.values(deniedPermissions()).every((v) => v === "deny"));
  assert.equal(SECURITY_STATUS.nativeEnforcement, "NOT_CONNECTED");
});
test("create is metadata only, inactive and default deny", () => {
  const s = created();
  assert.equal(s.profiles[0].name, "Work");
  assert.equal(s.profiles[0].desiredEnabled, false);
  assert.equal(s.profiles[0].requested.network, "deny");
});
test("requesting permission only changes an ask preference", () => {
  const s = transition(created(), {type:"permission",profileId:id1,capability:"network",value:"ask"}, opt(id2));
  assert.equal(s.profiles[0].requested.network, "ask");
  assert.equal(SECURITY_STATUS.actualGrantsIssued, 0);
  assert.equal(s.profiles[0].requested.shell, "deny");
});
test("disallow allow, shell escalation and prototype keys", () => {
  for (const command of [
    {type:"permission", profileId:id1, capability:"network", value:"allow"},
    {type:"permission", profileId:id1, capability:"constructor", value:"ask"},
    {type:"permission", profileId:id1, capability:"shell", value:"yes"}
  ]) assert.throws(() => transition(created(), command, opt(id2)), /INVALID_PERMISSION/);
});
test("snapshot captures config but not external files, auth, or cookies", () => {
  let s = created();
  s = transition(s,{type:"permission",profileId:id1,capability:"network",value:"ask"},opt(id2));
  s = transition(s,{type:"snapshot",profileId:id1},opt(id2));
  assert.equal(s.snapshots[0].config.requested.network,"ask");
  assert.deepEqual(Object.keys(s.snapshots[0].config).sort(),["mode","name","requested"]);
  assert.equal(JSON.stringify(s).includes("cookie"), false);
});
test("restore never re-enables an environment", () => {
  let s = created();
  s = transition(s,{type:"snapshot",profileId:id1},opt(id2));
  s = transition(s,{type:"enable",profileId:id1,enabled:true},opt(id2));
  s = transition(s,{type:"rename",profileId:id1,name:"Changed"},opt(id2));
  s = transition(s,{type:"restore",profileId:id1,snapshotId:id2},opt(id2));
  assert.equal(s.profiles[0].name,"Work");
  assert.equal(s.profiles[0].desiredEnabled,false);
});
test("delete removes orphan snapshots and retains only bounded audit", () => {
  let s = transition(created(),{type:"snapshot",profileId:id1},opt(id2));
  s = transition(s,{type:"delete",profileId:id1},opt(id2));
  assert.equal(s.profiles.length,0);
  assert.equal(s.snapshots.length,0);
  assert.equal(s.history.at(-1).kind,"delete");
});
test("export/import retains metadata and disables desired enabled", () => {
  const s = transition(created(),{type:"enable",profileId:id1,enabled:true},opt(id2));
  const imported = importedMetadata(exportedMetadata(s));
  assert.equal(imported.profiles[0].desiredEnabled,false);
  assert.equal(imported.profiles[0].name,"Work");
});
test("reject unexpected nested keys, including credentials", () => {
  const s = created();
  s.profiles[0].apiKey = "CANARY_SECRET";
  assert.throws(() => validateState(s), /INVALID_PROFILE/);
});
test("reject corrupt versions, unknown fields and foreign snapshots", () => {
  assert.throws(() => importedMetadata('{"version":2,"profiles":[],"snapshots":[],"history":[]}'),/INVALID_STATE/);
  assert.throws(() => importedMetadata('{"version":1,"profiles":[],"snapshots":[],"history":[],"token":"x"}'),/INVALID_STATE/);
  assert.throws(() => validateState({...created(),snapshots:[{id:id2,profileId:id2,createdAt:at,config:{name:"x",mode:"node",requested:deniedPermissions()}}]}),/ORPHAN_SNAPSHOT/);
});
test("reject oversized imports and malicious control characters", () => {
  assert.throws(() => importedMetadata("x".repeat(150001)),/IMPORT_SIZE_LIMIT/);
  assert.throws(() => transition(emptyState(),{type:"create",name:"bad\nname"},opt(id1)),/INVALID_NAME/);
});
test("limit profiles to 12 and duplicate IDs", () => {
  assert.throws(() => transition(created(),{type:"create",name:"Another"},opt(id1)),/DUPLICATE_ID/);
  let s = emptyState();
  for (let i=0;i<12;i++) s = transition(s,{type:"create",name:"S"+i},opt(String(i+10).repeat(8)));
  assert.throws(() => transition(s,{type:"create",name:"overflow"},opt(id1)),/PROFILE_LIMIT/);
});
test("cannot execute privileged commands through the state reducer", () => {
  for (const type of ["runShell","readFile","grant","connect","installAPK","launchVM"]) {
    assert.throws(() => transition(created(),{type,profileId:id1},opt(id2)),/UNKNOWN_COMMAND/);
  }
});
test("capability enum is fixed and complete", () => {
  assert.equal(CAPABILITIES.length,9);
  assert.ok(CAPABILITIES.includes("diagnostic-upload"));
});
