# DSH Sandbox Manager – host integration gates

**Scope:** Tra v0.1 manages configuration metadata and a read-only AI-facing DSH status tool. No code in this repository can make Android's process isolation, network enforcement, WebView storage isolation, or permission grants effective by itself.

## Current DSH evidence (2026-10-29 baseline)
- P43 CI has demonstrated an Android isolated Service and Binder inside a test repack of the original DSH APK.
- P43 explicitly reports production EngineManager / real Node isolation is **NOT implemented**.
- No original-signer v139 release, no user-phone migration, and no trustworthy snapshot of host files exist.
- Separate browser identity simulations remain simulated WebView configurations, not Android guest OS instances.

Reference: https://github.com/u2584604327-a11y/dshe/actions/runs/40919746036

## Trust split

| Component | May do | Must not do |
|---|---|---|
| Web manager UI (untrusted) | Edit metadata profiles, save requested policy, export config-only JSON | Issue actual grants, report security enforcement PASS, read private files |
| DSH model-visible tool (untrusted) | Respond with fixed status/help, without native data | Access file paths, exec shell, send diagnostics, create permissions |
| Android native host (future; trusted) | Validate Binder calling UID, verify active isolated worker, enforce approval/expiry/revoke | Accept self-attested IDs or authorization from Node/JavaScript |
| Android isolated worker (future; untrusted) | Perform specifically permitted workloads via narrow broker IPC | Read app-private data, arbitrary network, other profile storage, private tokens |

The original installed DSH v138 and ongoing v139 work are **not modified** by Tra.

## Native contract required before any "real sandbox" release

1. **Verified identity** – the actual production Node/EngineManager must run within the verified Android isolated UID; Android kernel/Binder-authenticated caller UID, not JSON fields, is authoritative.
2. **No bypass** – all general shell, file/network, ADB, root, reflection/JNI and alternate transports must be enumerated and tested against private canaries; blocking one Node API is insufficient.
3. **UI consent** – only a native Activity under user control may generate a one-time, scope-specific grant. No model/tool/JS auto-approval.
4. **Expiry/revoke** – grants bound to caller UID + active worker + destination + operation, monotonic TTL, single use, invalidated on process death/restart and revoke.
5. **File descriptor** – approved file access passes pinned, restricted descriptors with content revalidation, not arbitrary host paths.
6. **Destination control** – native broker validates hostnames, protocol, redirects, DNS changes and destination policy. No unrestricted loopback proxy.
7. **Environment storage** – independent WebView processes/directories and per-profile cookie/storage isolation. Same-process WebView suffix is not a security boundary.
8. **Snapshots** – introduce a separate trusted storage snapshot provider, encrypted where appropriate, with checksums, quotas and real restore tests. Current Tra snapshots only include name, mode and requested permissions.
9. **Regression** – preserve original DSH UI, conversations, streaming, model providers, attachments, WebDriver identity, token reporting and signing continuity; stop on mismatch.
10. **Truthful status** – only the trusted native host may advertise measured enforcement results, tagged with device/OS/build identity and test provenance.

Until these gates pass, Tra keeps nativeEnforcement=NOT_CONNECTED, actualGrantsIssued=0, snapshots=METADATA_ONLY.

## Packaging

Run npm test and python3 scripts/build_plugin.py. Output dist/sandbox-manager-tool.zip contains only a DSH-style module manifest and lib/index.js that registers a **read-only** status tool. Actual DSH v138/v139 plugin loading compatibility must be tested against the exact host build; adding a ZIP to a repository is not proof of installation. Do not include private APKs, API keys, signing keys, passwords or production diagnostic data in this public repository.
