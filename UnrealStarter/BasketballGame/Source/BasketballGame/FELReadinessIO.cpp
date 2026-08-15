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
