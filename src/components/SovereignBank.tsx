import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { 
  X, 
  CreditCard, 
  Smartphone, 
  Wallet, 
  Zap, 
  ShieldCheck,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';

interface SovereignBankProps {
  onClose: () => void;
  onSuccess: (amount: number) => void;
}

const SovereignBank: React.FC<SovereignBankProps> = ({ onClose, onSuccess }) => {
  const [step, setStep] = useState<'select' | 'processing' | 'success'>('select');
  const [selectedAmount, setSelectedAmount] = useState<number>(1000);
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);

  const amounts = [
    { value: 500, label: '500 SHARDS', price: '$4.99' },
    { value: 1000, label: '1000 SHARDS', price: '$9.99', popular: true },
    { value: 5000, label: '5000 SHARDS', price: '$39.99' },
  ];

  const handlePayment = (method: string) => {
    setPaymentMethod(method);
    setStep('processing');
    
    // Simulate processing for non-PayPal methods
    // In a real app, this would redirect to the provider's checkout
    setTimeout(() => {
      setStep('success');
      onSuccess(selectedAmount);
    }, 2500);
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 z-[2000]">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]"
      >
        {/* Header */}
        <div className="p-6 border-b border-zinc-900 flex justify-between items-center bg-zinc-900/30">
          <div>
            <h2 className="text-xl font-bold tracking-tighter text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
              SOVEREIGN BANK
            </h2>
            <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest mt-1">Secure Asset Acquisition</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8">
          <AnimatePresence mode="wait">
            {step === 'select' && (
              <motion.div 
                key="select"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                {/* Amount Selection */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {amounts.map((amt) => (
                    <button
                      key={amt.value}
                      onClick={() => setSelectedAmount(amt.value)}
                      className={`relative p-4 rounded-2xl border transition-all ${
                        selectedAmount === amt.value 
                        ? 'bg-cyan-500/10 border-cyan-500 shadow-[0_0_15px_rgba(34,211,238,0.2)]' 
                        : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      {amt.popular && (
                        <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-cyan-500 text-[10px] font-bold text-black rounded-full uppercase tracking-tighter">
                          Popular
                        </span>
                      )}
                      <div className="text-lg font-bold text-white">{amt.label}</div>
                      <div className="text-sm text-zinc-500 font-mono">{amt.price}</div>
                    </button>
                  ))}
                </div>

                {/* Payment Methods */}
                <div className="space-y-4">
                  <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-500">Select Payment Method</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* PayPal */}
                    <div className="col-span-full">
                      <PayPalScriptProvider options={{ clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID || "test" }}>
                        <PayPalButtons 
                          style={{ layout: "horizontal", color: "blue", shape: "pill", label: "pay" }}
                          createOrder={(_data, actions) => {
                            return actions.order.create({
                              intent: "CAPTURE",
                              purchase_units: [{
                                amount: {
                                  currency_code: "USD",
                                  value: (selectedAmount / 100).toFixed(2),
                                },
                              }],
                            });
                          }}
                          onApprove={(_data, actions) => {
                            if (actions.order) {
                              return actions.order.capture().then(() => {
                                handlePayment('PayPal');
                              });
                            }
                            return Promise.resolve();
                          }}
                        />
                      </PayPalScriptProvider>
                    </div>

                    {/* Apple Pay & Google Pay */}
                    <button 
                      onClick={() => handlePayment('Apple Pay')}
                      className="flex items-center justify-center gap-3 p-4 bg-white text-black rounded-xl font-bold hover:bg-zinc-200 transition-all"
                    >
                      <Smartphone className="w-5 h-5" />
                      Apple Pay
                    </button>
                    <button 
                      onClick={() => handlePayment('Google Pay')}
                      className="flex items-center justify-center gap-3 p-4 bg-zinc-900 border border-zinc-800 text-white rounded-xl font-bold hover:bg-zinc-800 transition-all"
                    >
                      <Smartphone className="w-5 h-5" />
                      Google Pay
                    </button>

                    {/* BNPL Options */}
                    <button 
                      onClick={() => handlePayment('Klarna')}
                      className="flex items-center justify-between p-4 bg-[#FFB3C7] text-black rounded-xl font-bold hover:opacity-90 transition-all"
                    >
                      <span className="flex items-center gap-2"><Wallet className="w-4 h-4" /> Klarna</span>
                      <span className="text-[10px] uppercase tracking-tighter opacity-70">Pay in 4</span>
                    </button>
                    <button 
                      onClick={() => handlePayment('Afterpay')}
                      className="flex items-center justify-between p-4 bg-[#B2FCE4] text-black rounded-xl font-bold hover:opacity-90 transition-all"
                    >
                      <span className="flex items-center gap-2"><Zap className="w-4 h-4" /> Afterpay</span>
                      <span className="text-[10px] uppercase tracking-tighter opacity-70">Interest-Free</span>
                    </button>
                    <button 
                      onClick={() => handlePayment('Affirm')}
                      className="flex items-center justify-between p-4 bg-[#004AD7] text-white rounded-xl font-bold hover:opacity-90 transition-all"
                    >
                      <span className="flex items-center gap-2"><CreditCard className="w-4 h-4" /> Affirm</span>
                      <span className="text-[10px] uppercase tracking-tighter opacity-70">Monthly</span>
                    </button>
                    <button 
                      onClick={() => handlePayment('Venmo')}
                      className="flex items-center justify-center gap-3 p-4 bg-[#3D95CE] text-white rounded-xl font-bold hover:opacity-90 transition-all"
                    >
                      <Wallet className="w-5 h-5" />
                      Venmo
                    </button>
                    <button 
                      onClick={() => handlePayment('Card')}
                      className="flex items-center justify-center gap-3 p-4 bg-zinc-800 text-white rounded-xl font-bold hover:bg-zinc-700 transition-all"
                    >
                      <CreditCard className="w-5 h-5" />
                      Credit Card
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 'processing' && (
              <motion.div 
                key="processing"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-20 flex flex-col items-center justify-center text-center space-y-6"
              >
                <div className="relative w-20 h-20">
                  <div className="absolute inset-0 border-4 border-cyan-500/20 rounded-full" />
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 border-4 border-t-cyan-500 rounded-full"
                  />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">AUTHORIZING {paymentMethod?.toUpperCase()}</h3>
                  <p className="text-zinc-500 font-mono text-xs mt-2 uppercase tracking-widest">Secure Handshake in Progress...</p>
                </div>
              </motion.div>
            )}

            {step === 'success' && (
              <motion.div 
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-20 flex flex-col items-center justify-center text-center space-y-6"
              >
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-green-500" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">ASSETS ACQUIRED</h3>
                  <p className="text-zinc-500 font-mono text-xs mt-2 uppercase tracking-widest">+{selectedAmount} SHARDS CREDITED TO WALLET</p>
                </div>
                <button 
                  onClick={onClose}
                  className="px-8 py-3 bg-white text-black font-bold rounded-full hover:bg-zinc-200 transition-all flex items-center gap-2"
                >
                  RETURN TO LAB <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-4 bg-zinc-900/50 border-t border-zinc-900 text-center">
          <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-[0.2em]">
            Sovereign Encryption Standard v4.2 // No Data Persisted Locally
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default SovereignBank;
