# Final Evolution — Deployment & Architecture Handover

## 1. Core Architecture
- **iOS Engine:** Swift/SwiftUI in `FinalEvolutionLab/`. Handles the "Digital Vault", "Neural Drive" scans, and RealityKit dunk simulation.
- **Web Emulator:** React/Vite in `web/play/`. Provides a cross-platform "Bonds Bounce" experience.
- **Backend:** Supabase for telemetry, user state, and Wix order relay.
- **Wix Integration:** Velo scripts in `wix-velo-events.js` for order processing and "Dark Clinical" UI.

## 2. Master Prompt Instructions (AI Studio)
- **Stripe Integration:** All live secrets are managed via Supabase Edge Functions. Do NOT output secrets in code.
- **TestFlight:** Official beta link: https://testflight.apple.com/join/finalevolution
- **Medical Disclaimer:** Implemented as a SwiftUI `FirstRunView` or a dedicated Wix modal. No placeholder files in the web repo.
- **Security:** The `/play/` route must enforce COOP (`same-origin`) and COEP (`require-corp`) for high-performance WASM/Unity threading.
- **Manifest:** Ensure `public/manifest.json` is locked for PWA installation.

## 3. Deployment Checklist
- [ ] Verify Supabase `felRelayWixOrder` function is live.
- [ ] Update `wix-velo-events.js` with production Supabase URL/Key.
- [ ] Ensure `vite.config.ts` has security headers for `/play/`.
- [ ] Validate `FinalEvolutionLab` builds for iOS 17+.
- [ ] Confirm TestFlight internal testers are added.

## 5. Tester Checklist (Alpha 1)
- [ ] **Wix Checkout:** Complete a test order and verify the `felRelayWixOrder` function triggers in Supabase.
- [ ] **Supabase Sync:** Confirm `supabase_user_id` and `athlete_id` are correctly mapped in the `user_balances` or `athlete_profiles` table.
- [ ] **iOS Scan:** Run the "Neural Drive" tap test and "POGO" test. Verify `readiness_snapshot.json` is generated.
- [ ] **Unreal Emulator:** Launch the UE 5.7 runtime and confirm physics (JumpZVelocity) scales with the imported readiness data.
- [ ] **Web PWA:** Install the app from `/play/` on a mobile device. Verify COOP/COEP headers allow the 3D runtime to load.
- [ ] **Medical Gate:** Confirm the disclaimer appears on first launch and blocks access until accepted.

## 6. Recent Fixes & Changelog
- **Security:** Added `Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy` headers to `vite.config.ts`.
- **Integration:** Finalized `wix-velo-events.js` for production order relay.
- **Documentation:** Created `HANDOVER_FINAL_EVOLUTION.md` and `web/DEPLOY.txt` for production handover.
- **Architecture:** Validated the split codebase (Swift/iOS + Unreal/C++ + React/Web).
