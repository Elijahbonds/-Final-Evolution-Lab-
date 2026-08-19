# Optional game assets

The app runs without these files. Add them to improve visuals or enable features.

| Path | Purpose |
|------|---------|
| `skyboxes/venice-360.jpg` | Venice Beach skybox in Basketball Lab (HDRI). If missing, a preset environment is used. |
| `dunker-transformed.glb` | Mixamo-rigged dunker (Soldier GLB, Idle/Walk/Run/TPose). Venice dunk loads this as the visible athlete. Do not invent extra Mixamo clip names on this file. |
| `basketball_dunk__elijah.bvh` | Elijah dunk mocap from FEL-unity. Hang plays this take retargeted onto mixamorig. Preferred path is wired even when the file is absent. |
| `cmu_124_06_basketball_layup.bvh` | Leftover CMU 124_06 lay-up. Not the hang body. |
| `curriculum/*.mp4`, `curriculum/*.jpg` | Blueprint videos/thumbnails (foot-tripod, ankle-piston, hip-hinge). If missing, the guide modal shows a "Clinic Session Required" message. |

## Meshy Venice mural — Studio only

Google AI Studio `/assets` holds the live Meshy court (`venice-blue-court.glb`) and surround (`venice-court-surround.glb`). Git must not ship those files — not the real mural, and not an `FEL-meshy-placeholder` stub.

A ZIP/import of this tree must never overwrite the Studio mural with a ~1KB quad. The loader (`isPlaceholderMeshyGlb` / `loadMeshyVeniceCourt`) already refuse-safes a placeholder or a missing file: authored Venice night stays up. Do not check placeholder GLBs back in.

No 404s during gameplay: basketball uses the preset sky when the skybox is absent; curriculum videos show a fallback message on load error.
