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
