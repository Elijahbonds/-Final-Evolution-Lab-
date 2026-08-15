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
