import Foundation

/**
 * Final Evolution Lab — Readiness Snapshot Export
 * This JSON is exported by the iOS app and consumed by the Unreal 5.7 Emulator.
 */
struct FELReadinessSnapshotExport: Codable {
    let athleteId: String
    let timestamp: Date
    
    // Biomechanical Metrics
    let prqScore: Float
    let ankleStiffness: Float
    let neuralDriveTapCount: Int
    
    // SFMA Synchronization (The Mirror)
    // Maps directly to the Unreal/Unity 3D Spiral Line overlay.
    // If False, trigger the 'Red Congestion' shader to visualize the movement roadblock.
    let sfmaMultiSegmentalRotationPassed: Bool
    
    // Haptic Bridge Metadata
    let hapticProfile: String // e.g., "pushPenultimateStrideClinical"
    
    enum CodingKeys: String, CodingKey {
        case athleteId = "athlete_id"
        case timestamp = "timestamp"
        case prqScore = "prq_score"
        case ankleStiffness = "ankle_stiffness"
        case neuralDriveTapCount = "neural_drive_tap_count"
        case sfmaMultiSegmentalRotationPassed = "sfma_multi_segmental_rotation_passed"
        case hapticProfile = "haptic_profile"
    }
}
