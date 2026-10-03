# JavaScript SDK browser-call parity

- [x] Restore the published 0.1.0 API client and retain all existing runtime exports.
- [x] Add the website's LiveKit browser runtime, typed session APIs, transcripts, mute and playback recovery.
- [x] Normalize known nested assistant options, including current models and English/Urdu speech settings, while preserving application JSON.
- [x] Fix repeated start, cancellation, immutable request binding and cleanup callback races.
- [x] Verify 30 packaged regressions, SDK type checks, and an offline installed tarball with ESM/CJS and TypeScript consumers.
- [x] Create the public personal repository requested by Meeran.
- [x] Publish the exact tested 0.2.0 tarball after maintainer authentication; verify registry version and integrity.

Review: Tests use mocked media and deterministic API transports. No provider calls or biometric uploads were made for this change. @burki.dev/sdk@0.2.0 is public on npm and GitHub Releases; registry integrity matches the tested artifact. Source release commit e7a72be881778a42cf9609894e2b5453f89cd70a. Frontend integration is reviewed separately in burki-frontend, with 34 lifecycle/builder regressions and two mocked Chromium flow/builder checks.
