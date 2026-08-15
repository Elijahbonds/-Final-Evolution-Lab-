import SwiftUI

struct MedicalDisclaimerView: View {
    @AppStorage("felHasAcceptedMedicalDisclaimer") var hasAccepted: Bool = false
    
    var body: some View {
        ZStack {
            Color.black.edgesIgnoringSafeArea(.all)
            
            VStack(spacing: 30) {
                Text("MEDICAL DISCLAIMER")
                    .font(.custom("Inter-Bold", size: 24))
                    .foregroundColor(.cyan)
                    .tracking(2)
                
                ScrollView {
                    Text("""
                        Final Evolution Lab is a biomechanical performance tool, not a medical device. 
                        
                        The data provided, including PRQ scores, stiffness metrics, and neural drive snapshots, are for performance optimization and educational purposes only. 
                        
                        By entering the lab, you acknowledge:
                        1. This is not medical advice.
                        2. You are physically cleared for high-intensity explosive testing.
                        3. Final Evolution Lab is not liable for injuries sustained during testing.
                        
                        Consult a physician before beginning any new athletic protocol.
                        """)
                        .font(.custom("Inter-Regular", size: 16))
                        .foregroundColor(.white.opacity(0.8))
                        .lineSpacing(6)
                        .multilineTextAlignment(.center)
                }
                .frame(maxHeight: 300)
                
                Button(action: {
                    withAnimation {
                        hasAccepted = true
                    }
                }) {
                    Text("I ACCEPT THE RISK")
                        .font(.custom("Inter-Bold", size: 14))
                        .foregroundColor(.black)
                        .padding(.horizontal, 40)
                        .padding(.vertical, 15)
                        .background(Color.cyan)
                        .cornerRadius(999)
                }
            }
            .padding(40)
            .background(
                RoundedRectangle(cornerRadius: 24)
                    .stroke(Color.cyan.opacity(0.3), lineWidth: 1)
                    .background(Color.black.opacity(0.9))
            )
            .padding(20)
        }
        .zIndex(1100)
    }
}
