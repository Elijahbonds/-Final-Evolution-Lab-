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
