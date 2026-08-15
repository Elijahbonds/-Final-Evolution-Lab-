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
