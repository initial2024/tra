/**
 * DSH-compatible TOOL ADAPTER, not an Android sandbox implementation.
 * Intentionally read-only and stateless: cannot claim to observe browser UI
 * profiles, change Android privileges, mint grants or access native IPC.
 */
const STATUS = Object.freeze({
  ok:true, tool:"sandbox_manager", version:"0.1.0",
  mode:"READ_ONLY_COMPATIBILITY_PROBE",
  managerUi:"SEPARATE_LOCAL_DEMO",
  nativeEnforcement:"NOT_CONNECTED",
  dshProductionEngineIsolated:"NOT_VERIFIED",
  androidVirtualMachine:"NO",
  permissions:"NATIVE_HOST_ONLY",
  snapshots:"METADATA_ONLY",
  modelCanGrantPermissions:false
});
export function apply(api) {
  if (!api || typeof api.tools?.register !== "function") {
    throw new Error("DSH_TOOL_REGISTRATION_UNAVAILABLE");
  }
  api.tools.register({
    name:"sandbox_manager",
    description:"Read-only sandbox manager integration status. It cannot create real Android sandboxes, inspect private files, grant privileges, control the device, or verify isolation. UI profiles and snapshots are metadata only.",
    parameters:{
      type:"object",
      properties:{action:{type:"string",enum:["status","help"],description:"Only status/help; mutating actions prohibited."}},
      required:["action"],
      additionalProperties:false
    },
    async execute(args) {
      if (args?.action === "status") return {...STATUS};
      if (args?.action === "help") return {
        ok:true, message:"Sandbox profiles and metadata snapshots are managed in a separate local-only UI. There is no native permission broker connected. Real isolation must be verified by the Android host."
      };
      return {ok:false,error:"DENIED_UNSUPPORTED_ACTION",nativeEnforcement:"NOT_CONNECTED"};
    },
    output:{
      render(_args, result) {
        const safe = result && typeof result === "object" ? result :
          {ok:false,error:"INVALID_RESULT"};
        // No unknown native error objects, files, tokens or stacks are reflected.
        const allowed = ["ok","tool","version","mode","managerUi",
          "nativeEnforcement","dshProductionEngineIsolated","androidVirtualMachine",
          "permissions","snapshots","modelCanGrantPermissions","message","error"];
        const clean = {};
        for (const key of allowed) if (Object.prototype.hasOwnProperty.call(safe,key) &&
          (typeof safe[key] === "string" || typeof safe[key] === "boolean")) clean[key] = safe[key];
        return {type:"text",text:JSON.stringify(clean)};
      }
    }
  });
}
