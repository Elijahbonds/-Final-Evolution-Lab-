# Final Evolution Lab: Project Flows

## 1. Biomechanical Scan (iOS)
- Athlete performs 10-second finger tap test (Neural Drive).
- Athlete performs POGO test (Ankle Stiffness).
- Athlete performs Vertical Jump (PRQ).

## 2. Metric Extraction
- `Stiffness = Clamp(0.5 + (PogoHeight / 60) + (TapSpeed / 150), 0.5, 2.0)`
- `JumpHeight = (PRQ / 100 * 1.5) + (Stiffness * 0.5)`

## 3. Data Export
- Metrics are serialized to `readiness_snapshot.json`.

## 4. Unreal Engine Integration
- `UFELReadinessIO` loads the JSON.
- `AFELBasketballActor` applies metrics to physics.
- `JumpZVelocity` is scaled based on `JumpHeight`.
- `GroundContactTime` is scaled based on `Stiffness`.
