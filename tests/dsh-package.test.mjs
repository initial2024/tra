import test from "node:test";
import assert from "node:assert/strict";
import {apply,name,inject} from "../index.js";

test("root package exposes DSH Cordis plugin shape",()=>{
  assert.equal(name,"dsh-sandbox-manager");
  assert.deepEqual(inject,["tools"]);
  let tool;
  apply({tools:{register(v){tool=v;}}});
  assert.equal(tool.name,"sandbox_manager_status");
  assert.deepEqual(tool.parameters.properties.action.enum,["status","help"]);
});
test("root DSH tool is read-only and truthful",async()=>{
  let tool; apply({tools:{register(v){tool=v;}}});
  const status=JSON.parse(await tool.execute({action:"status"}));
  assert.equal(status.nativeEnforcement,"NOT_CONNECTED");
  assert.equal(status.androidVirtualMachine,"NO");
  assert.equal(status.actualGrantsIssued,0);
  const blocked=JSON.parse(await tool.execute({action:"grant"}));
  assert.equal(blocked.error,"DENIED_UNSUPPORTED_ACTION");
  const rendered=tool.output.render({},JSON.stringify({ok:true}));
  assert.deepEqual(rendered,[{type:"text",text:'{"ok":true}'}]);
});
