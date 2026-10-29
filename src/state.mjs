/**
 * Tra Sandbox Manager v0.1 -- CONFIGURATION RECORDS ONLY.
 * Not a security boundary, virtual machine, Android profile, or grant broker.
 * The native Android host alone may enforce permissions.
 */
export const CAPABILITIES = Object.freeze([
  "network", "file-read", "file-write", "shell", "clipboard",
  "camera", "microphone", "location", "diagnostic-upload"
]);
export const MODES = Object.freeze(["browser", "node", "mixed"]);
const LIMITS = Object.freeze({ profiles: 12, snapshots: 64, history: 80, name: 48 });
const OWN = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const record = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const idOk = (value) => typeof value === "string" && /^[a-zA-Z0-9-]{8,64}$/.test(value);
const dateOk = (value) => typeof value === "string" && value.length <= 40 &&
  !Number.isNaN(Date.parse(value)) && /^\d{4}-\d\d-\d\dT/.test(value);
const fail = (code) => { throw new Error(code); };
const requireKeys = (object, keys, code) => {
  if (!record(object) || Object.keys(object).some((key) => !keys.includes(key))) fail(code);
};
const requireName = (value) => {
  if (typeof value !== "string") fail("INVALID_NAME");
  const name = value.trim();
  if (!name || name.length > LIMITS.name || /[\u0000-\u001f\u007f]/.test(name)) fail("INVALID_NAME");
  return name;
};
const requireMode = (mode) => MODES.includes(mode) ? mode : fail("INVALID_MODE");
const requireId = (id) => idOk(id) ? id : fail("INVALID_ID");
const requireDate = (date) => dateOk(date) ? date : fail("INVALID_DATE");

export function deniedPermissions() {
  return Object.fromEntries(CAPABILITIES.map((key) => [key, "deny"]));
}
function cleanPermissions(value) {
  requireKeys(value, CAPABILITIES, "INVALID_PERMISSIONS");
  const clean = deniedPermissions();
  for (const capability of CAPABILITIES) {
    if (!OWN(value, capability) || !["deny", "ask"].includes(value[capability])) {
      fail("INVALID_PERMISSION_VALUE");
    }
    clean[capability] = value[capability];
  }
  return clean;
}
function cleanProfile(value) {
  requireKeys(value, ["id", "name", "mode", "desiredEnabled", "requested", "createdAt", "updatedAt"], "INVALID_PROFILE");
  if (typeof value.desiredEnabled !== "boolean") fail("INVALID_ENABLED");
  return {
    id: requireId(value.id), name: requireName(value.name), mode: requireMode(value.mode),
    desiredEnabled: value.desiredEnabled, requested: cleanPermissions(value.requested),
    createdAt: requireDate(value.createdAt), updatedAt: requireDate(value.updatedAt)
  };
}
function cleanSnapshot(value) {
  requireKeys(value, ["id", "profileId", "createdAt", "config"], "INVALID_SNAPSHOT");
  requireKeys(value.config, ["name", "mode", "requested"], "INVALID_SNAPSHOT_CONFIG");
  return {
    id: requireId(value.id), profileId: requireId(value.profileId),
    createdAt: requireDate(value.createdAt),
    config: {
      name: requireName(value.config.name),
      mode: requireMode(value.config.mode),
      requested: cleanPermissions(value.config.requested)
    }
  };
}
function cleanHistory(value) {
  requireKeys(value, ["kind", "profileId", "when"], "INVALID_HISTORY");
  const kinds = ["create", "rename", "mode", "enable", "permission", "snapshot", "restore", "delete"];
  if (!kinds.includes(value.kind)) fail("INVALID_HISTORY_KIND");
  return {kind:value.kind, profileId:requireId(value.profileId), when:requireDate(value.when)};
}
export function emptyState() {
  return { version: 1, profiles: [], snapshots: [], history: [] };
}
export function validateState(value) {
  requireKeys(value, ["version", "profiles", "snapshots", "history"], "INVALID_STATE");
  if (value.version !== 1 || !Array.isArray(value.profiles) ||
      !Array.isArray(value.snapshots) || !Array.isArray(value.history)) fail("INVALID_STATE");
  if (value.profiles.length > LIMITS.profiles || value.snapshots.length > LIMITS.snapshots ||
      value.history.length > LIMITS.history) fail("STATE_TOO_LARGE");
  const profiles = value.profiles.map(cleanProfile);
  const snapshots = value.snapshots.map(cleanSnapshot);
  const history = value.history.map(cleanHistory);
  const unique = (items) => new Set(items.map((item) => item.id)).size === items.length;
  if (!unique(profiles) || !unique(snapshots)) fail("DUPLICATE_ID");
  const ids = new Set(profiles.map((item) => item.id));
  if (snapshots.some((item) => !ids.has(item.profileId))) fail("ORPHAN_SNAPSHOT");
  return { version: 1, profiles, snapshots, history };
}
function event(state, kind, profileId, when) {
  state.history.push({kind, profileId, when});
  state.history = state.history.slice(-LIMITS.history);
}
function generatedId(options) {
  const id = options.makeId ? options.makeId() : globalThis.crypto?.randomUUID?.();
  return requireId(id);
}
function generatedDate(options) {
  return requireDate(options.now ? options.now() : new Date().toISOString());
}
function locate(state, profileId) {
  const profile = state.profiles.find((item) => item.id === requireId(profileId));
  if (!profile) fail("PROFILE_NOT_FOUND");
  return profile;
}
export function transition(input, command, options = {}) {
  const state = validateState(input);
  if (!record(command) || typeof command.type !== "string") fail("INVALID_COMMAND");
  const when = generatedDate(options);
  const type = command.type;
  if (type === "create") {
    if (state.profiles.length >= LIMITS.profiles) fail("PROFILE_LIMIT");
    const id = generatedId(options);
    if (state.profiles.some((item) => item.id === id) ||
        state.snapshots.some((item) => item.id === id)) fail("DUPLICATE_ID");
    const profile = {id, name:requireName(command.name), mode:requireMode(command.mode || "browser"),
      desiredEnabled:false, requested:deniedPermissions(), createdAt:when, updatedAt:when};
    state.profiles.push(profile);
    event(state, type, id, when);
    return state;
  }
  const profile = locate(state, command.profileId);
  if (type === "delete") {
    state.profiles = state.profiles.filter((item) => item.id !== profile.id);
    state.snapshots = state.snapshots.filter((item) => item.profileId !== profile.id);
  } else if (type === "rename") {
    profile.name = requireName(command.name);
  } else if (type === "mode") {
    profile.mode = requireMode(command.mode);
  } else if (type === "enable") {
    if (typeof command.enabled !== "boolean") fail("INVALID_ENABLED");
    profile.desiredEnabled = command.enabled;
  } else if (type === "permission") {
    if (!CAPABILITIES.includes(command.capability) || !["deny", "ask"].includes(command.value)) {
      fail("INVALID_PERMISSION");
    }
    profile.requested[command.capability] = command.value;
  } else if (type === "snapshot") {
    if (state.snapshots.length >= LIMITS.snapshots) fail("SNAPSHOT_LIMIT");
    const id = generatedId(options);
    if (state.snapshots.some((item) => item.id === id) ||
        state.profiles.some((item) => item.id === id)) fail("DUPLICATE_ID");
    state.snapshots.push({id, profileId:profile.id, createdAt:when,
      config:{name:profile.name, mode:profile.mode, requested:{...profile.requested}}});
  } else if (type === "restore") {
    const snap = state.snapshots.find((item) => item.id === requireId(command.snapshotId) &&
      item.profileId === profile.id);
    if (!snap) fail("SNAPSHOT_NOT_FOUND");
    profile.name = snap.config.name;
    profile.mode = snap.config.mode;
    profile.requested = {...snap.config.requested};
    // Restoring metadata must never auto-start a workload or issue grants.
    profile.desiredEnabled = false;
  } else {
    fail("UNKNOWN_COMMAND");
  }
  if (type !== "delete") profile.updatedAt = when;
  event(state, type, profile.id, when);
  return state;
}
export function exportedMetadata(state) {
  // Validation drops unknown fields and refuses secrets/paths/credentials.
  return JSON.stringify(validateState(state), null, 2);
}
export function importedMetadata(json) {
  if (typeof json !== "string" || json.length > 150000) fail("IMPORT_SIZE_LIMIT");
  let parsed;
  try { parsed = JSON.parse(json); } catch { fail("INVALID_JSON"); }
  // Explicitly do not mark previously desired environments as running.
  const clean = validateState(parsed);
  for (const profile of clean.profiles) profile.desiredEnabled = false;
  return clean;
}
export const SECURITY_STATUS = Object.freeze({
  scope:"CONFIGURATION_ONLY", nativeEnforcement:"NOT_CONNECTED",
  realNodeIsolated:"NOT_VERIFIED", androidVm:"NO", snapshots:"METADATA_ONLY",
  actualGrantsIssued:0
});
