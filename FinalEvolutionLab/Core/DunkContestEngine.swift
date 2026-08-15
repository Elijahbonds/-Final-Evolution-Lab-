import Foundation

class DunkContestEngine {
    var prqScore: Double = 50.0
    var stiffness: Double = 1.0
    
    func simulateDunk() -> Double {
        let jumpHeight = BondsBounceBlueprint.calculateJumpHeight(prq: prqScore, stiffness: stiffness)
        print("Simulating dunk with jump height: \(jumpHeight)")
        return jumpHeight
    }
}
