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
