# Tra · DSH Sandbox Manager

**Tra v0.1.0** — a local-first **sandbox configuration manager** and a separately packaged **read-only DSH tool adapter**.

> **Not an Android VM. Not native security isolation.** This release is a functional manager for **configuration metadata only**. Creating a profile, changing an "ask" preference, or restoring a snapshot does **not** isolate a process, manage actual Android permissions, clone apps, copy browser cookies, restore files, launch VMs or grant any capabilities.

## Implemented features

- Create, rename, select and delete up to **12 configuration profiles** (browser, node, mixed).
- Change a profile's **desired enabled** state without actually starting Android services.
- Edit **nine default-deny permission preferences**. Only deny and ask exist: there is deliberately no allow state.
- Save/restore configuration snapshots. Restore always marks the profile disabled; snapshots never contain app files, cookies or credentials.
- Export/import validated JSON backups with bounded size and strict field allowlists. Imports disable all profile desired-enabled states.
- Responsive local management UI; no CDN, external scripts, telemetry or network requests.
- Standalone DSH-style read-only tool module that reports a truthful NOT_CONNECTED security status, denies all model-invoked mutations.
- Zero npm runtime dependencies; native boundaries and assumptions documented.

## Run locally

Requires Node.js 20 or newer.

    npm test
    npm run serve

Open **http://127.0.0.1:4173** in the browser on the **same device**. Data lives in that browser's localStorage; nothing is uploaded.

## Build compatibility ZIP

    python3 scripts/build_plugin.py

This creates dist/sandbox-manager-tool.zip, containing package.json and lib/index.js. It is a **read-only DSH tool adapter candidate**, not an APK, Android app, standalone virtual device, or confirmed installable DSH plugin. Model-readable status/help are the only supported actions. Do **not** install it in DSH as a production security boundary.

## Security and installation truth

- nativeEnforcement: **NOT_CONNECTED**
- realNodeIsolated: **NOT_VERIFIED**
- androidVm: **NO**
- snapshots: **METADATA_ONLY**
- actualGrantsIssued: **0**
- DSH production plugin compatibility: **NOT_VERIFIED**

See [DSH integration gates](docs/DSH_INTEGRATION.md) before any integration effort. The actual DSH Android host must enforce real consent, isolated UID, Binder identity, file/network capabilities and revocation. This project never changes the original installed DSH APK or its signing.

## Development

CI runs Node tests and checks the package archive structure; a green CI run proves **source behavior**, not Android security. No signing material, device credentials or private APK may be committed to this public repository.

License: [MIT](LICENSE).
