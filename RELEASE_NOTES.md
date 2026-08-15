# Final Evolution Lab — Release Notes (v1.0.0 Sovereign Launch)

## 1. The App (React & Clinical Gate)
- **Clinical Gate Locked:** Implemented a mandatory, blocking `MedicalDisclaimerView` (Z-index 1100) in `App.tsx`.
- **First-Run Logic:** Disclaimer acceptance is persisted via `localStorage` to ensure consent before biometric processing.
- **Error Resolution:** Resolved syntax and type errors in the React repository to ensure a stable production build.

## 2. The Store (Wix-to-Sovereign Bridge)
- **Forensic Relay:** Finalized `backend/velo-relay.jsw` and `backend/http-functions.js` for secure order relay.
- **Secret Management:** Integrated Wix Secrets Manager for `X-FEL-Wix-Secret` verification.
- **Metadata Resolution:** Implemented logic to extract `supabase_user_id` and `athlete_id` from Wix order metadata.

## 3. The Access (Deployment & Binaries)
- **Security Headers:** Configured `netlify.toml` with COOP/COEP headers for the `/play/` PWA route to enable high-performance WebGPU/WASM.
- **Gold Master Binaries:** Provided logic for direct download of the Mac DMG hosted on Supabase Storage.
- **PWA Gateway:** Finalized the GBA4iOS-style PWA manifest and emulator shell.

## 4. Biomechanical Scan Engine
- **Neural Drive:** 10-second finger tap test for CNS readiness.
- **Ankle Piston:** POGO test for reactive stiffness.
- **PRQ Score:** Aggregate explosive output metric.
- **SFMA Sync:** 'sfmaMultiSegmentalRotationPassed' key now mapped to Unreal 3D Spiral Line.
- **Red Congestion:** Visual movement roadblock shader triggered on SFMA failure.

## 5. Unreal 5.7 Performance Emulator
- **Physics Scaling:** JumpZVelocity and MaxAcceleration scale with PRQ.
- **Rhythmic Cueing:** 'Push 1, 2' haptic bridge synchronized with the 'UFELRhythmicCueingWidget'.
- **Haptic Profile:** 'pushPenultimateStrideClinical' profile active for penultimate 'Push'.

## 6. Security & Compliance
- **Headers:** Enforced `same-origin` and `require-corp` for WASM/Unity.
- **Disclaimer:** Mandatory Medical Disclaimer gate on first launch.
- **Auth:** Supabase Realtime for instant balance updates.
