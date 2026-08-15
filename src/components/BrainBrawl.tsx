import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Brain, 
  CheckCircle2, 
  XCircle, 
  ArrowRight,
  Trophy,
  Zap
} from 'lucide-react';
import fitnessProtocols from '../constants/fitness_protocols.json';

interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
  module: string;
}

const BrainBrawl: React.FC = () => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  // Generate questions from curriculum JSON
  const questions: Question[] = fitnessProtocols.vva_curriculum_mapping.map((module, index) => ({
    id: `q-${index}`,
    module: module.title,
    text: `Which SFMA/FMS fail-state is primarily addressed by the ${module.title} module?`,
    options: [
      module.fms_sfma_trigger,
      'General Fatigue',
      'Poor Hydration',
      'Lack of Motivation'
    ].sort(() => Math.random() - 0.5),
    correctAnswer: 0 // Will find actual index after sort
  })).map(q => {
    const correctIdx = q.options.indexOf(fitnessProtocols.vva_curriculum_mapping.find(m => m.title === q.module)!.fms_sfma_trigger);
    return { ...q, correctAnswer: correctIdx };
  });

  const handleOptionSelect = (index: number) => {
    if (selectedOption !== null) return;
    
    setSelectedOption(index);
    const correct = index === questions[currentQuestionIndex].correctAnswer;
    setIsCorrect(correct);
    if (correct) setScore(prev => prev + 1);

    setTimeout(() => {
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setSelectedOption(null);
        setIsCorrect(null);
      } else {
        setShowResult(true);
      }
    }, 1500);
  };

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-[#050505] p-8 flex items-center justify-center">
      <div className="max-w-2xl w-full">
        <AnimatePresence mode="wait">
          {!showResult ? (
            <motion.div
              key="quiz"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="glass-card p-12 flex flex-col gap-8 border-white/5"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#7000FF] rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(112,0,255,0.3)]">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="font-orbitron text-lg font-black tracking-tighter text-white uppercase">BRAIN_BRAWL</h2>
                    <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">NEURO_MECHANIC_COGNITIVE_SYNC</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">PROGRESS</div>
                  <div className="text-xl font-orbitron font-black text-[#00F2FF]">
                    {currentQuestionIndex + 1}<span className="text-zinc-700">/</span>{questions.length}
                  </div>
                </div>
              </div>

              {/* Question */}
              <div className="space-y-4">
                <div className="px-4 py-2 glass rounded-lg inline-block">
                  <span className="text-[9px] font-mono text-[#7000FF] uppercase tracking-widest font-bold">MODULE: {currentQuestion.module}</span>
                </div>
                <h3 className="text-2xl font-orbitron font-black tracking-tight text-white leading-tight">
                  {currentQuestion.text}
                </h3>
              </div>

              {/* Options */}
              <div className="grid grid-cols-1 gap-4">
                {currentQuestion.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleOptionSelect(index)}
                    className={`p-6 rounded-3xl border text-left transition-all relative overflow-hidden group ${
                      selectedOption === index
                        ? isCorrect 
                          ? 'bg-green-500/10 border-green-500 text-green-400'
                          : 'bg-red-500/10 border-red-500 text-red-400'
                        : selectedOption !== null && index === currentQuestion.correctAnswer
                          ? 'bg-green-500/10 border-green-500 text-green-400'
                          : 'bg-white/5 border-white/5 hover:border-white/20 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between relative z-10">
                      <span className="font-orbitron text-sm font-bold tracking-tight uppercase">{option}</span>
                      {selectedOption === index && (
                        isCorrect ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />
                      )}
                      {selectedOption !== null && index === currentQuestion.correctAnswer && index !== selectedOption && (
                        <CheckCircle2 className="w-5 h-5" />
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <div className="flex items-center gap-2">
                  <Zap className="w-3 h-3 text-[#00F2FF]" />
                  <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">STREAK: {score}</span>
                </div>
                <div className="text-[9px] font-mono text-zinc-700 uppercase tracking-widest">
                  SOVEREIGN_COGNITIVE_VALIDATION_ACTIVE
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-16 flex flex-col items-center text-center gap-8 border-white/5"
            >
              <div className="w-24 h-24 bg-gradient-to-br from-[#00F2FF] to-[#7000FF] rounded-3xl flex items-center justify-center shadow-[0_0_50px_rgba(0,242,255,0.3)]">
                <Trophy className="w-12 h-12 text-white" />
              </div>
              
              <div>
                <h2 className="font-orbitron text-3xl font-black tracking-tighter text-white uppercase">SYNC_COMPLETE</h2>
                <p className="text-sm font-mono text-zinc-500 mt-2 uppercase tracking-widest">Cognitive Alignment Verified</p>
              </div>

              <div className="grid grid-cols-2 gap-8 w-full">
                <div className="glass p-6 rounded-3xl">
                  <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1">ACCURACY</div>
                  <div className="text-3xl font-orbitron font-black text-[#00F2FF]">{Math.round((score / questions.length) * 100)}%</div>
                </div>
                <div className="glass p-6 rounded-3xl">
                  <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1">SHARDS_EARNED</div>
                  <div className="text-3xl font-orbitron font-black text-[#7000FF]">+{score * 10}</div>
                </div>
              </div>

              <button 
                onClick={() => {
                  setCurrentQuestionIndex(0);
                  setScore(0);
                  setShowResult(false);
                  setSelectedOption(null);
                  setIsCorrect(null);
                }}
                className="w-full py-4 bg-white text-black font-orbitron font-black text-sm rounded-full flex items-center justify-center gap-3 hover:scale-105 transition-all"
              >
                RESTART_SYNC <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default BrainBrawl;
