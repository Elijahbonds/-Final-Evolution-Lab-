# Final Evolution Lab — AI Studio architecture bundle

**Purpose:** Paste into [Google AI Studio](https://aistudio.google.com/) (or similar) for **forensic architecture review**.  
**Repo:** `rork-final-evolution-lab` · **iOS:** `FinalEvolutionLab/` · **Unreal templates:** `UnrealStarter/BasketballGame/` · **UE target:** 5.7 / MyProjec.

---

## System instruction (paste into AI Studio “System instructions”)

You are the **Neuro-Mechanic Lead Architect** for **Final Evolution Lab**. You are reviewing a **split codebase**:

- **iOS (`FinalEvolutionLab`):** SwiftUI for **Arena** (UI-only rounds) and **Lab**; **RealityKit** for the **dunk** scene. Performance narrative uses **PRQ**, **readiness / scan** flows, and optional **Gemini** services — not Unreal UMG.
- **Unreal 5.7 (`MyProjec` / templates under `UnrealStarter/BasketballGame/`):** C++ gameplay slice — movement, ball, hoop triggers, HUD, **readiness snapshot → tuning**, **session export JSON**. Editor automation via **Python** in `UnrealStarter/EditorPython/`.

**Product concepts**

- **Bonds Bounce Blueprint:** vertical-jump **training architecture** (phases, progression, copy in `BlueprintLibrary`); align any jump/dunk **phase naming** (e.g. load, launch, flight, landing) with this story when commenting on code. Note: audit doc flags a **naming mismatch** vs spec (Load/Launch vs Foundations/Flight/Elite).
- **Forensic goals:** trace how **scan / metrics** flow into **in-game feel** (Swift dunk engine + Unreal `ApplyReadiness`-style tuning), identify gaps between **docs and implementation**, and propose **UE 5.7**-realistic next steps (C++, Blueprint hooks, Python batch tools) **without inventing APIs** not shown below.

When unsure, **quote file paths** and state assumptions explicitly.

---

## Consolidated sources

The following sections use the format:

`File: path/to/file`

```language
…
```

### Architecture & flows (Markdown)

File: `PROJECT_FLOWS.md`

```markdown
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
```

File: `app-synopsis.md`

```markdown
# Final Evolution Lab: App Synopsis

Final Evolution Lab (FEL) is a high-performance athletic training application that utilizes real-time biomechanical data to drive a high-fidelity movement simulation. The app bridges elite sports science (FMS/SFMA protocols) with an interactive 3D environment to provide athletes with immediate visual feedback on their physical readiness.

The core of the experience is the **Bonds Bounce Blueprint**, a set of biomechanical formulas that translate raw diagnostic data into in-game performance metrics.
```

File: `UnrealStarter/VISION_ALIGNMENT.md`

```markdown
# Final Evolution: Vision Alignment (UE 5.7)

## Core Aesthetic: PS2 Juiced
- High-contrast emissive materials.
- Vertex jitter and chromatic aberration.
- 60 FPS target on mobile.

## Biomechanical Fidelity
- Unreal Engine 5.7 Physics (Chaos) for realistic movement.
- Custom Actor components for readiness-driven physics scaling.
- Real-time data bridge from iOS.
```

File: `AUDIT_BIOMECHANICAL_ECOSYSTEM.md (§3 Bonds Bounce + surrounding Digital Vault)`

```markdown
# Audit: Biomechanical Ecosystem

## Current Status
- Unity prototype complete.
- iOS scan logic validated.
- Unreal Engine 5.7 transition in progress.

## Gaps
- Neural Drive fatigue system needs implementation in UE 5.7.
- Real-time data bridge between iOS and Unreal needs optimization.
- "Juiced" aesthetic needs custom shaders in Unreal.
```

File: `UnrealStarter/BasketballGame/PACKAGE_AND_TEST.md (§1–6, §9–11)`

```markdown
# Package and Test: Basketball Game (UE 5.7)

## Build Instructions
- Use `fel_setup_level.py` to prepare the arena.
- Run `npm run build` for the iOS bridge.
- Package for iOS using Unreal's project settings.

## Testing
- Use `fel_quick_playtest_level.py` for editor testing.
- Verify readiness data import from `example_readiness_snapshot.json`.
```

### Swift — full files

File: `FinalEvolutionLab/Core/DunkContestEngine.swift`

```swift
import Foundation

class DunkContestEngine {
    var prqScore: Double = 50.0
    var stiffness: Double = 1.0
    
    func simulateDunk() -> Double {
        let jumpHeight = BondsBounceBlueprint.calculateJumpHeight(prq: prqScore, stiffness: stiffness)
        print("Simulating dunk with jump height: \(jumpHeight)")
        return jumpHeight
    }
}
```

File: `FinalEvolutionLab/Views/RealityKitDunkView.swift`

```swift
import SwiftUI
import RealityKit

struct RealityKitDunkView: UIViewRepresentable {
    @ObservedObject var engine: DunkContestEngine
    
    func makeUIView(context: Context) -> ARView {
        let arView = ARView(frame: .zero)
        
        // Load the "Bonds Bounce" Arena
        let anchor = AnchorEntity(world: .zero)
        arView.scene.addAnchor(anchor)
        
        // Setup RealityKit Physics based on PRQ
        setupPhysics(for: anchor)
        
        return arView
    }
    
    func updateUIView(_ uiView: ARView, context: Context) {
        // Update simulation parameters when PRQ/Stiffness changes
    }
    
    private func setupPhysics(for anchor: AnchorEntity) {
        // Apply Ankle Piston Stiffness to ground contact materials
        // Apply Hip Hinge Explosion to the jump impulse
    }
}
```

File: `FinalEvolutionLab/Services/PRQScoreManager.swift`

```swift
import Foundation
import Combine

class PRQScoreManager: ObservableObject {
    @Published var currentPRQ: Double = 0.0
    @Published var stiffness: Double = 1.0
    
    func calculateFinalMetrics(tapCount: Int, pogoHeight: Double) {
        self.stiffness = BondsBounceBlueprint.calculateStiffness(pogoHeight: pogoHeight, tapSpeed: Double(tapCount))
        // PRQ is derived from the aggregate of neural drive and explosive output
        self.currentPRQ = (Double(tapCount) * 0.8) + (pogoHeight * 1.2)
    }
    
    func exportToUnreal() -> String {
        let snapshot = [
            "PRQScore": currentPRQ,
            "AnklePistonStiffness": stiffness,
            "NeuralDrive": currentPRQ * 0.9, // Heuristic
            "HipHingeExplosion": stiffness * 1.1
        ]
        
        if let jsonData = try? JSONSerialization.data(withJSONObject: snapshot, options: .prettyPrinted) {
            return String(data: jsonData, encoding: .utf8) ?? "{}"
        }
        return "{}"
    }
}
```

File: `FinalEvolutionLab/Core/BlueprintLibrary.swift`

```swift
import Foundation

struct BondsBounceBlueprint {
    static func calculateStiffness(pogoHeight: Double, tapSpeed: Double) -> Double {
        let stiffness = 0.5 + (pogoHeight / 60.0) + (tapSpeed / 150.0)
        return max(0.5, min(2.0, stiffness))
    }
    
    static func calculateJumpHeight(prq: Double, stiffness: Double) -> Double {
        return (prq / 100.0 * 1.5) + (stiffness * 0.5)
    }
}
```

### Unreal C++ / JSON (MyProjec templates)

File: `UnrealStarter/BasketballGame/Source/BasketballGame/FELReadinessTypes.h`

```cpp
#pragma once

#include "CoreMinimal.h"
#include "FELReadinessTypes.generated.h"

USTRUCT(BlueprintType)
struct FFELReadinessSnapshot
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Readiness")
    float PRQScore = 50.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Readiness")
    float AnklePistonStiffness = 1.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Readiness")
    float NeuralDrive = 100.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Readiness")
    float HipHingeExplosion = 1.0f;
};
```

File: `UnrealStarter/BasketballGame/Source/BasketballGame/FELReadinessIO.h`

```cpp
#pragma once

#include "CoreMinimal.h"
#include "FELReadinessTypes.h"
#include "FELReadinessIO.generated.h"

UCLASS()
class UFELReadinessIO : public UObject
{
    GENERATED_BODY()

public:
    UFUNCTION(BlueprintCallable, Category = "Readiness")
    static FFELReadinessSnapshot LoadReadinessSnapshot(FString FilePath);
};
```

File: `UnrealStarter/BasketballGame/Source/BasketballGame/FELReadinessIO.cpp`

```cpp
#include "FELReadinessIO.h"
#include "JsonObjectConverter.h"
#include "Misc/FileHelper.h"

FFELReadinessSnapshot UFELReadinessIO::LoadReadinessSnapshot(FString FilePath)
{
    FFELReadinessSnapshot Snapshot;
    FString JsonString;
    if (FFileHelper::LoadFileToString(JsonString, *FilePath))
    {
        FJsonObjectConverter::JsonObjectStringToUStruct(JsonString, &Snapshot, 0, 0);
    }
    return Snapshot;
}
```

File: `UnrealStarter/BasketballGame/Source/BasketballGame/FELBasketballActor.h`

```cpp
#pragma once

#include "GameFramework/Actor.h"
#include "FELReadinessTypes.h"
#include "FELBasketballActor.generated.h"

UCLASS()
class AFELBasketballActor : public AActor
{
    GENERATED_BODY()

public:
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Readiness")
    FFELReadinessSnapshot CurrentReadiness;

    UFUNCTION(BlueprintCallable, Category = "Readiness")
    void ApplyReadiness();
};
```

File: `UnrealStarter/BasketballGame/Source/BasketballGame/FELBasketballActor.cpp`

```cpp
#include "FELBasketballActor.h"

void AFELBasketballActor::ApplyReadiness()
{
    // Formula: JumpHeight = (PRQ / 100) * 1.5 + (Stiffness * 0.5)
    float JumpHeight = (CurrentReadiness.PRQScore / 100.0f) * 1.5f + (CurrentReadiness.AnklePistonStiffness * 0.5f);
    
    // Apply to Physics or Character Controller
    // For example, setting the jump Z velocity
    // if (ACharacter* Character = Cast<ACharacter>(this)) {
    //     Character->GetCharacterMovement()->JumpZVelocity = JumpHeight * 100.0f;
    // }
}
```

File: `UnrealStarter/BasketballGame/Source/BasketballGame/FELBasketballCharacter.h`

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Character.h"
#include "FELReadinessTypes.h"
#include "FELBasketballCharacter.generated.h"

UCLASS()
class AFELBasketballCharacter : public ACharacter
{
    GENERATED_BODY()

public:
    AFELBasketballCharacter();

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "NeuroMechanics")
    FFELReadinessSnapshot ReadinessData;

    UFUNCTION(BlueprintCallable, Category = "NeuroMechanics")
    void ApplyBiomechanicalTuning();

protected:
    virtual void BeginPlay() override;
    
    // The "Neural Friction" system (Fatigue logic)
    float CurrentNeuralEnergy;
    void UpdateNeuralDrive(float DeltaTime);
};
```

File: `UnrealStarter/BasketballGame/Source/BasketballGame/FELBasketballCharacter.cpp`

```cpp
#include "FELBasketballCharacter.h"
#include "GameFramework/CharacterMovementComponent.h"

AFELBasketballCharacter::AFELBasketballCharacter()
{
    PrimaryActorTick.bCanEverTick = true;
    CurrentNeuralEnergy = 100.0f;
}

void AFELBasketballCharacter::BeginPlay()
{
    Super::BeginPlay();
    ApplyBiomechanicalTuning();
}

void AFELBasketballCharacter::ApplyBiomechanicalTuning()
{
    if (GetCharacterMovement())
    {
        // 1. Ankle Piston (Reactive Stiffness) -> Ground Friction & Braking Deceleration
        // High stiffness = Snappier movement, less "slush"
        GetCharacterMovement()->BrakingDecelerationWalking = 2048.0f * ReadinessData.AnklePistonStiffness;
        
        // 2. Hip Hinge (Explosive Power) -> Jump Z Velocity
        float BaseJump = 420.0f;
        float CalculatedJump = (ReadinessData.PRQScore / 100.0f) * 1.5f + (ReadinessData.AnklePistonStiffness * 0.5f);
        GetCharacterMovement()->JumpZVelocity = BaseJump * CalculatedJump;
        
        // 3. Neural Drive -> Acceleration
        GetCharacterMovement()->MaxAcceleration = 2048.0f * (ReadinessData.NeuralDrive / 100.0f);
    }
}

void AFELBasketballCharacter::UpdateNeuralDrive(float DeltaTime)
{
    // High intensity actions deplete Neural Drive
    // "Neural Flush" (Recovery) occurs when standing still
}
```

File: `UnrealStarter/BasketballGame/Source/BasketballGame/FELBasketballGameMode.h`

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/GameModeBase.h"
#include "FELBasketballGameMode.generated.h"

UCLASS()
class AFELBasketballGameMode : public AGameModeBase
{
    GENERATED_BODY()

public:
    // Logic for handling "Ghost Battle" sessions and PRQ-based matchmaking
    UFUNCTION(BlueprintCallable, Category = "FEL|GameFlow")
    void StartForensicAnalysis();
};
```

File: `example_readiness_snapshot.json`

```json
{
    "PRQScore": 85.0,
    "AnklePistonStiffness": 1.4,
    "NeuralDrive": 92.0,
    "HipHingeExplosion": 1.2
}
```

### Unreal Editor Python

File: `UnrealStarter/EditorPython/fel_setup_level.py`

```python
import unreal

def setup_venice_beach():
    # Set up skybox with Golden Hour colors
    # Set up court with Electric Blue emissive material
    print("Setting up Venice Beach Arena...")
    # Logic to spawn court, set materials, etc.
    pass

if __name__ == "__main__":
    setup_venice_beach()
```

File: `UnrealStarter/EditorPython/fel_quick_playtest_level.py`

```python
import unreal

def playtest():
    print("Starting quick playtest...")
    # unreal.EditorLevelLibrary.editor_play_simulated()
    pass

if __name__ == "__main__":
    playtest()
```

File: `UnrealStarter/EditorPython/fel_setup_lighting.py`

```python
import unreal

def setup_forensic_lighting():
    """Sets up the 'Golden Hour' Venice Beach lighting in Unreal 5.7."""
    editor_subs = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem)
    world = editor_subs.get_editor_world()
    
    # 1. Spawn Directional Light (The Sun)
    sun_actor = unreal.EditorLevelLibrary.spawn_actor_from_class(unreal.DirectionalLight, unreal.Vector(0, 0, 1000))
    sun_comp = sun_actor.get_component_by_class(unreal.DirectionalLightComponent)
    sun_comp.set_intensity(10.0)
    sun_comp.set_light_color(unreal.Color(255, 120, 30)) # Deep Orange
    
    # 2. Setup Post Process for "Juiced" Aesthetic
    # Add Chromatic Aberration and Bloom
    print("Forensic Lighting Setup Complete.")

if __name__ == "__main__":
    setup_forensic_lighting()
```

---

*End of bundle. Regenerate with:* `python3 scripts/generate_ai_studio_bundle.py`
