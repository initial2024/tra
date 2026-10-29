# Tra · DSH Sandbox Manager

A fail-closed, **metadata-only** sandbox management project for DSH.

> Current status: development prototype. This repository does not ship an Android virtual machine, an isolated DSH Node runtime, real permission enforcement, or a signed APK. Profiles and snapshots are **configuration records**, not isolated operating systems or filesystem snapshots. Do not rely on this project to protect sensitive data.

The code for the first implementation is developed in a feature branch and reviewed through pull requests. The default branch is intentionally kept minimal until the tests and integration gates pass.

## Security boundary

The trusted Android native host must own user consent, Binder caller UID validation, one-shot capability grants, actual file/network enforcement and revocation. A JavaScript tool or UI **must not** fabricate this authority.

Reference DSH integration work: https://github.com/u2584604327-a11y/dshe (separate private repository).

License: MIT.
