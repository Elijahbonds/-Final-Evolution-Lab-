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
