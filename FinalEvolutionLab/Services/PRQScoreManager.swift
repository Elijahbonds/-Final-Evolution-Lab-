import Foundation
import Combine

class PRQScoreManager: ObservableObject {
    @Published var currentPRQ: Double = 0.0
    @Published var stiffness: Double = 1.0
    
    func calculateFinalMetrics(tapCount: Int, pogoHeight: Double) {
        self.stiffness = BondsBounceBlueprint.calculateStiffness(pogoHeight: pogoHeight, tapSpeed: Double(tapCount))
        // PRQ is derived from the aggregate of neural drive and explosive output
        self.currentPRQ = (Double(tapCount) * 0.8) + (pogoHeight * 1.2)
    }
    
    func exportToUnreal() -> String {
        let snapshot = [
            "PRQScore": currentPRQ,
            "AnklePistonStiffness": stiffness,
            "NeuralDrive": currentPRQ * 0.9, // Heuristic
            "HipHingeExplosion": stiffness * 1.1
        ]
        
        if let jsonData = try? JSONSerialization.data(withJSONObject: snapshot, options: .prettyPrinted) {
            return String(data: jsonData, encoding: .utf8) ?? "{}"
        }
        return "{}"
    }
}
