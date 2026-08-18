# Optional game assets

The app runs without these files. Add them to improve visuals or enable features.

| Path | Purpose |
|------|---------|
| `skyboxes/venice-360.jpg` | Venice Beach skybox in Basketball Lab (HDRI). If missing, a preset environment is used. |
| `dunker-transformed.glb` | Mixamo-rigged dunker (Soldier GLB, Idle/Walk/Run/TPose). Venice dunk loads this as the visible athlete. |
| `curriculum/*.mp4`, `curriculum/*.jpg` | Blueprint videos/thumbnails (foot-tripod, ankle-piston, hip-hinge). If missing, the guide modal shows a "Clinic Session Required" message. |

No 404s during gameplay: basketball uses the preset sky when the skybox is absent; curriculum videos show a fallback message on load error.
