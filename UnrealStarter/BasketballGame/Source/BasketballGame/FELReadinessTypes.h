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
