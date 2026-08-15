import SwiftUI

struct FirstRunView: View {
    @AppStorage("hasAcceptedDisclaimer") var hasAcceptedDisclaimer: Bool = false
    @State private var showDisclaimer: Bool = true
    
    var body: some View {
        ZStack {
            if hasAcceptedDisclaimer {
                // Main App View
                ContentView()
            } else {
                // Dark Clinical Disclaimer
                Color.black.ignoresSafeArea()
                
                VStack(spacing: 30) {
                    Image(systemName: "shield.fill")
                        .font(.system(size: 60))
                        .foregroundColor(Color(red: 0, green: 0.95, blue: 1.0)) // Neon Cyan
                    
                    Text("MEDICAL DISCLAIMER")
                        .font(.headline)
                        .fontWeight(.black)
                        .foregroundColor(.white)
                        .tracking(2)
                    
                    Text("The Final Evolution Lab provides biomechanical recommendations for performance optimization. These are not medical diagnoses. Consult a physician before starting any high-intensity training program.")
                        .font(.body)
                        .multilineTextAlignment(.center)
                        .foregroundColor(.white.opacity(0.8))
                        .padding(.horizontal, 40)
                    
                    Button(action: {
                        hasAcceptedDisclaimer = true
                    }) {
                        Text("I UNDERSTAND & ACCEPT")
                            .font(.caption)
                            .fontWeight(.black)
                            .padding()
                            .frame(maxWidth: .infinity)
                            .background(Color(red: 0, green: 0.95, blue: 1.0))
                            .foregroundColor(.black)
                            .cornerRadius(12)
                    }
                    .padding(.horizontal, 40)
                }
            }
        }
    }
}

struct FirstRunView_Previews: PreviewProvider {
    static var previews: some View {
        FirstRunView()
    }
}
