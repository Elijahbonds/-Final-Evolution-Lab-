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
