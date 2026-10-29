import test from "node:test";
import assert from "node:assert/strict";
import {apply} from "../lib/index.js";
const tool = () => {
  let registered;
  apply({tools:{register(t){registered=t;}}});
  return registered;
};
test("DSH registration is explicit and read only", () => {
  const t = tool();
  assert.equal(t.name,"sandbox_manager");
  assert.deepEqual(t.parameters.properties.action.enum,["status","help"]);
  assert.equal(t.parameters.additionalProperties,false);
});
test("model status never advertises effective Android isolation", async () => {
  const t = tool();
  const s = await t.execute({action:"status"});
  assert.equal(s.nativeEnforcement,"NOT_CONNECTED");
  assert.equal(s.androidVirtualMachine,"NO");
  assert.equal(s.modelCanGrantPermissions,false);
});
test("model cannot create a profile, grant, snapshot, or run tools", async () => {
  const t = tool();
  for (const action of ["create","grant","run","restore","delete","shell","snapshot"]) {
    const result = await t.execute({action,token:"CANARY_SECRET"});
    assert.deepEqual(result,{ok:false,error:"DENIED_UNSUPPORTED_ACTION",nativeEnforcement:"NOT_CONNECTED"});
    assert.equal(t.output.render({action},result).text.includes("CANARY_SECRET"),false);
  }
});
test("render output whitelists fields and does not leak secrets", () => {
  const t = tool();
  const result = t.output.render({},{
    ok:false, message:"safe", token:"CANARY_SECRET", bundlePath:"/private/hidden",
    nested:{secret:"CANARY_SECRET"}
  });
  assert.equal(result.type,"text");
  assert.equal(result.text.includes("CANARY_SECRET"),false);
  assert.equal(result.text.includes("/private"),false);
});
test("without a real DSH tool registry adapter refuses to initialize", () => {
  assert.throws(() => apply({}),/DSH_TOOL_REGISTRATION_UNAVAILABLE/);
});
