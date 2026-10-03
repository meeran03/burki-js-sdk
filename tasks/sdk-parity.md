# JavaScript SDK browser-call parity

- [x] Restore the published 0.1.0 API client and retain all existing runtime exports.
- [x] Add the website's LiveKit browser runtime, typed session APIs, transcripts, mute and playback recovery.
- [x] Normalize known nested assistant options, including current models and English/Urdu speech settings, while preserving application JSON.
- [x] Fix repeated start, cancellation, immutable request binding and cleanup callback races.
- [x] Verify 30 packaged regressions, SDK type checks, and an offline installed tarball with ESM/CJS and TypeScript consumers.
- [x] Create the public personal repository requested by Meeran.
- [ ] Publish 0.2.0 to npm after authenticated publishing access is available.

Review: Tests use mocked media and deterministic API transports. No provider calls or biometric uploads were made for this change. The source prepares 0.2.0; npm still serves 0.1.0 until publication. Frontend integration is reviewed separately in burki-frontend, with 34 lifecycle/builder regressions and two mocked Chromium flow/builder checks.
