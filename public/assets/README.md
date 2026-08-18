# Optional game assets

The app runs without these files. Add them to improve visuals or enable features.

| Path | Purpose |
|------|---------|
| `skyboxes/venice-360.jpg` | Venice Beach skybox in Basketball Lab (HDRI). If missing, a preset environment is used. |
| `dunker-transformed.glb` | Mixamo-rigged dunker (Soldier GLB, Idle/Walk/Run/TPose). Venice dunk loads this as the visible athlete. Do not invent extra Mixamo clip names on this file. |
| `basketball_dunk__elijah.bvh` | Elijah dunk mocap (Master Standard) when copied from FEL-unity. Hang prefers this. |
| `cmu_124_06_basketball_layup.bvh` | Imported CMU 124_06 basketball lay-up, retargeted onto the Mixamo 65-bone names. Hang uses this when Elijah's BVH is absent. |
| `curriculum/*.mp4`, `curriculum/*.jpg` | Blueprint videos/thumbnails (foot-tripod, ankle-piston, hip-hinge). If missing, the guide modal shows a "Clinic Session Required" message. |

No 404s during gameplay: basketball uses the preset sky when the skybox is absent; curriculum videos show a fallback message on load error.
