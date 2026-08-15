import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  Brain, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  Award, 
  Send, 
  Bot, 
  User, 
  MessageSquare, 
  ChevronRight,
  ShieldAlert,
  Zap
} from 'lucide-react';
import { BLUEPRINT_MODULES } from '../../constants/university_curriculum';
import { EducationalModule } from '../../types/university';
import { CreatorCardBadge } from './CreatorCardBadge';

type EducationalTab = 'curriculum' | 'ai_coach' | 'assessment' | 'credentials' | 'facilitator_tier';

export const EducationalTrackView: React.FC = () => {
  const [selectedModuleIndex, setSelectedModuleIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<EducationalTab>('curriculum');
  
  // Assessment state
  const [selectedScenarioIndex, setSelectedScenarioIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [passedModules, setPassedModules] = useState<string[]>(['module_01_foundations', 'module_02_strategy_cognition']);

  // AI Coach Interactive State
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'ai' | 'user'; text: string }>>([
    {
      sender: 'ai',
      text: "Greetings, Athlete. I am the Gemini AI Coach powered by the Neuro-Mechanic's Blueprint. Ask me anything regarding motor learning, Stretch-Shortening Cycle (SSC) physics, Reactive Neuromuscular Training (RNT), or game state cognition."
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const currentModule: EducationalModule = BLUEPRINT_MODULES[selectedModuleIndex] || BLUEPRINT_MODULES[0];
  const currentScenario = currentModule.appliedScenarios[selectedScenarioIndex] || currentModule.appliedScenarios[0];

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userText = inputMessage;
    setChatMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setInputMessage('');
    setIsTyping(true);

    setTimeout(() => {
      let aiResponse = "";
      const lower = userText.toLowerCase();

      if (lower.includes('rnt') || lower.includes('reactive neuromuscular')) {
        aiResponse = "Reactive Neuromuscular Training (RNT) employs external resistance to 'feed the dysfunction'. For instance, applying an elastic band to exaggerate knee valgus forces your central nervous system to fire the glute medius reflexively (< 180ms) rather than relying on delayed conscious verbal cues.";
      } else if (lower.includes('ssc') || lower.includes('stretch') || lower.includes('elastic')) {
        aiResponse = "The Stretch-Shortening Cycle (SSC) harnesses passive elastic strain energy in the tendon matrix (specifically the Achilles and patellar tendons). If ground contact time exceeds 250ms or muscle yields eccentrically, that kinetic energy dissipates as heat rather than vertical impulse.";
      } else if (lower.includes('card') || lower.includes('credential') || lower.includes('career')) {
        aiResponse = `Completing Module 0${currentModule.number} unlocks the '${currentModule.creatorCardCredential.cardName}' Creator Card. This on-chain artifact acts as verifiable credit for college scouts and the Facilitator-in-Training apprenticeship ladder.`;
      } else {
        aiResponse = `Regarding '${userText}' in the context of ${currentModule.title}: The Neuro-Mechanic framework teaches that supreme force output is governed by neuromuscular coordination and autonomous self-regulation under fatigue. Review the applied scenarios to test this principle!`;
      }

      setChatMessages(prev => [...prev, { sender: 'ai', text: aiResponse }]);
      setIsTyping(false);
    }, 1000);
  };

  const handleSelectOption = (optionId: string) => {
    if (hasAnswered) return;
    setSelectedOptionId(optionId);
    setHasAnswered(true);

    const option = currentScenario.options.find(o => o.id === optionId);
    if (option?.isCorrect && !passedModules.includes(currentModule.id)) {
      setPassedModules(prev => [...prev, currentModule.id]);
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-[#140428] via-[#090514] to-[#04151D] border border-white/10">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-[#7000FF]/20 text-[#00F2FF] border border-[#7000FF]/40">
              TRACK 02 // EDUCATIONAL CURRICULUM
            </span>
            <span className="text-[10px] font-mono text-zinc-400">THE NEURO-MECHANIC BLUEPRINT (~161K WORDS)</span>
          </div>
          <h2 className="font-orbitron text-2xl font-black tracking-tight text-white uppercase">
            THE NEURO-MECHANIC'S BLUEPRINT CURRICULUM
          </h2>
          <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
            *What does this person understand about their own development, and can they apply it under pressure?* Delivered through interactive AI Coach check-ins, applied scenarios, Creator Card credentials, and in-person facilitator reinforcement.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'curriculum', label: '2.1 CURRICULUM CORE', icon: BookOpen },
            { id: 'ai_coach', label: '2.2 AI COACH (GEMINI)', icon: Bot },
            { id: 'assessment', label: '2.3 APPLIED SCENARIOS', icon: Brain },
            { id: 'credentials', label: 'CREATOR CARDS', icon: Award },
            { id: 'facilitator_tier', label: '2.4 FACILITATOR TIER', icon: ShieldAlert },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as EducationalTab)}
              className={`px-4 py-2.5 rounded-xl font-orbitron text-xs font-bold uppercase flex items-center gap-2 transition-all ${
                activeTab === tab.id
                  ? 'bg-[#7000FF] text-white shadow-[0_0_20px_rgba(112,0,255,0.4)]'
                  : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 border border-white/5'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Module Selector Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {BLUEPRINT_MODULES.map((mod, idx) => {
          const isSelected = selectedModuleIndex === idx;
          const isPassed = passedModules.includes(mod.id);

          return (
            <button
              key={mod.id}
              onClick={() => {
                setSelectedModuleIndex(idx);
                setSelectedScenarioIndex(0);
                setSelectedOptionId(null);
                setHasAnswered(false);
              }}
              className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden group ${
                isSelected
                  ? 'bg-gradient-to-b from-[#180830] to-[#0D041A] border-[#7000FF] shadow-lg shadow-purple-950/40'
                  : 'bg-white/5 border-white/5 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[9px] font-mono uppercase tracking-widest ${isSelected ? 'text-[#00F2FF]' : 'text-zinc-500'}`}>
                  MODULE 0{mod.number}
                </span>
                {isPassed && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
              </div>
              <h4 className="font-orbitron text-xs font-black text-white uppercase mt-1 line-clamp-1">
                {mod.title.split(' ')[0]} {mod.title.split(' ')[1] || ''}
              </h4>
              <p className="text-[9px] font-mono text-zinc-500 mt-1 truncate">
                {mod.wordCountEstimate.split(' ')[0]} words
              </p>
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <AnimatePresence mode="wait">
        {/* 2.1 Curriculum Core */}
        {activeTab === 'curriculum' && (
          <motion.div
            key="curriculum"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Left 2 Cols: Detailed Module Breakdown */}
            <div className="lg:col-span-2 glass-card p-8 border-white/5 space-y-6">
              <div className="space-y-2 border-b border-white/5 pb-4">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#7000FF]/20 text-[#00F2FF] border border-[#7000FF]/40 text-[9px] font-mono uppercase font-bold">
                    MODULE 0{currentModule.number} CORE TEXT
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500">{currentModule.wordCountEstimate}</span>
                </div>
                <h3 className="font-orbitron text-xl font-black text-white uppercase">
                  {currentModule.title}
                </h3>
                <p className="text-xs font-mono text-purple-400 uppercase tracking-wider">
                  {currentModule.subtitle}
                </p>
              </div>

              {/* Core Concepts */}
              <div className="space-y-3">
                <h4 className="font-orbitron text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-[#00F2FF]" />
                  CORE CURRICULUM CONCEPTS:
                </h4>
                <div className="grid grid-cols-1 gap-2.5">
                  {currentModule.coreConcepts.map((concept, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-zinc-300 flex items-start gap-3">
                      <span className="w-5 h-5 rounded-full bg-[#7000FF]/30 text-[#00F2FF] font-mono text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="leading-relaxed">{concept}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* In-Game Mechanics Mirror */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-[#031820] to-[#0A071E] border border-white/10 space-y-2">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-[#00F2FF]" />
                  <span className="font-orbitron text-xs font-bold text-white uppercase tracking-widest">
                    IN-GAME MECHANIC TRANSLATION:
                  </span>
                </div>
                <p className="text-xs text-zinc-300 font-mono leading-relaxed">
                  {currentModule.inGameMechanicMirror}
                </p>
              </div>

              {/* Facilitator Discussion Prompts */}
              <div className="space-y-3 pt-2">
                <h4 className="font-orbitron text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
                  FACILITATOR IN-PERSON DISCUSSION SCAFFOLD:
                </h4>
                <div className="space-y-2">
                  {currentModule.facilitatorDiscussionPrompts.map((prompt, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-white/5 text-xs text-zinc-400 font-sans italic border border-white/5">
                      "{prompt}"
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Creator Card Credential for this module */}
            <div className="space-y-6">
              <div className="glass-card p-6 border-white/5 space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <span className="text-[10px] font-mono text-[#00F2FF] uppercase font-bold tracking-widest">
                    MODULE CREDENTIAL
                  </span>
                  <span className="text-[9px] font-mono text-emerald-400">
                    {passedModules.includes(currentModule.id) ? 'EARNED' : 'PENDING EXAM'}
                  </span>
                </div>

                <CreatorCardBadge
                  cardName={currentModule.creatorCardCredential.cardName}
                  moduleNumber={currentModule.number}
                  rarity={currentModule.creatorCardCredential.rarity}
                  description={currentModule.creatorCardCredential.description}
                  isUnlocked={passedModules.includes(currentModule.id)}
                />

                <div className="pt-2 text-center">
                  <button
                    onClick={() => setActiveTab('assessment')}
                    className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-orbitron text-xs font-bold rounded-xl uppercase tracking-wider transition-all"
                  >
                    TAKE APPLIED SCENARIO CHECKPOINT →
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* 2.2 AI Coach (Gemini Layer) */}
        {activeTab === 'ai_coach' && (
          <motion.div
            key="ai_coach"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="glass-card p-6 border-white/5 max-w-3xl mx-auto space-y-4"
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#7000FF] to-[#00F2FF] flex items-center justify-center shadow-lg shadow-purple-950/50">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-orbitron text-sm font-black text-white uppercase">
                    AI COACH (GEMINI LAYER)
                  </h3>
                  <p className="text-[10px] font-mono text-zinc-400">
                    Adaptive Lesson Delivery • Comprehension Check • Neuro-Mechanic Knowledge Base
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[9px] font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                AI COACH READY
              </div>
            </div>

            {/* Chat Messages */}
            <div className="h-80 overflow-y-auto space-y-4 pr-2 font-sans">
              {chatMessages.map((msg, idx) => (
                <div 
                  key={idx}
                  className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.sender === 'ai' && (
                    <div className="w-7 h-7 rounded-lg bg-[#7000FF]/30 border border-[#7000FF]/50 flex items-center justify-center shrink-0 mt-1">
                      <Sparkles className="w-3.5 h-3.5 text-[#00F2FF]" />
                    </div>
                  )}
                  <div className={`p-4 rounded-2xl max-w-lg text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-[#00F2FF]/20 border border-[#00F2FF]/40 text-white rounded-br-none'
                      : 'bg-white/5 border border-white/10 text-zinc-200 rounded-bl-none'
                  }`}>
                    {msg.text}
                  </div>
                  {msg.sender === 'user' && (
                    <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0 mt-1">
                      <User className="w-3.5 h-3.5 text-zinc-300" />
                    </div>
                  )}
                </div>
              ))}
              {isTyping && (
                <div className="flex gap-2 items-center text-xs font-mono text-zinc-500">
                  <Sparkles className="w-3.5 h-3.5 animate-spin text-[#00F2FF]" />
                  <span>AI Coach synthesizing Neuro-Mechanic response...</span>
                </div>
              )}
            </div>

            {/* Quick Prompt Suggestions */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
              {[
                'Explain Reactive Neuromuscular Training (RNT)',
                'Why does GCT matter in the penultimate stride?',
                'How do I earn the Creator Card credential?'
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => {
                    setInputMessage(suggestion);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-mono text-zinc-400 hover:text-white border border-white/5 transition-all"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask the AI Coach regarding this module's principles..."
                className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#00F2FF]"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isTyping}
                className="px-4 py-2.5 bg-[#00F2FF] hover:bg-[#00F2FF]/80 text-black font-orbitron font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all disabled:opacity-30"
              >
                <Send className="w-3.5 h-3.5" />
                <span>ASK</span>
              </button>
            </form>
          </motion.div>
        )}

        {/* 2.3 Applied Scenarios Checkpoints */}
        {activeTab === 'assessment' && (
          <motion.div
            key="assessment"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="glass-card p-8 border-white/5 max-w-3xl mx-auto space-y-6"
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div>
                <span className="text-[10px] font-mono text-[#00F2FF] uppercase font-bold tracking-widest">
                  APPLIED SCENARIO CHECKPOINT // MOD 0{currentModule.number}
                </span>
                <h3 className="font-orbitron text-base font-black text-white uppercase mt-1">
                  {currentScenario.scenario}
                </h3>
              </div>
              <div className="text-right">
                <span className="text-[9px] font-mono text-zinc-500">SCENARIO</span>
                <div className="font-orbitron text-sm font-bold text-white">
                  {selectedScenarioIndex + 1}/{currentModule.appliedScenarios.length}
                </div>
              </div>
            </div>

            {/* Context Box */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-xs text-zinc-300 font-sans leading-relaxed">
              <strong className="text-[#00F2FF] font-mono block mb-1">FIELD SITUATION:</strong>
              {currentScenario.context}
            </div>

            {/* Question Prompt */}
            <h4 className="font-orbitron text-sm font-black text-white uppercase leading-snug">
              {currentScenario.prompt}
            </h4>

            {/* Options */}
            <div className="space-y-3">
              {currentScenario.options.map((opt) => {
                const isSelected = selectedOptionId === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleSelectOption(opt.id)}
                    className={`w-full p-4 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? opt.isCorrect
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                          : 'bg-red-500/20 border-red-500 text-red-300'
                        : hasAnswered && opt.isCorrect
                          ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
                          : 'bg-white/5 border-white/5 hover:border-white/20 text-zinc-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-xs font-sans leading-relaxed">{opt.text}</span>
                      {isSelected && (
                        opt.isCorrect 
                          ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          : <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      )}
                    </div>
                    {hasAnswered && (
                      <div className="mt-2 pt-2 border-t border-white/5 text-[10px] font-mono text-zinc-400">
                        <strong>RATIONALE:</strong> {opt.rationale}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Action Bar */}
            <div className="pt-4 border-t border-white/5 flex items-center justify-between">
              <div className="text-xs font-mono text-zinc-400">
                {hasAnswered && (
                  passedModules.includes(currentModule.id) ? (
                    <span className="text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> MODULE 0{currentModule.number} CREDENTIAL UNLOCKED!
                    </span>
                  ) : (
                    <span className="text-amber-400">Review the rationale and try again to unlock credential.</span>
                  )
                )}
              </div>

              {hasAnswered && (
                <button
                  onClick={() => {
                    setSelectedOptionId(null);
                    setHasAnswered(false);
                    if (selectedScenarioIndex < currentModule.appliedScenarios.length - 1) {
                      setSelectedScenarioIndex(prev => prev + 1);
                    } else {
                      setActiveTab('credentials');
                    }
                  }}
                  className="px-6 py-2.5 bg-white text-black font-orbitron font-bold text-xs rounded-full flex items-center gap-2 hover:scale-105 transition-all"
                >
                  <span>{selectedScenarioIndex < currentModule.appliedScenarios.length - 1 ? 'NEXT SCENARIO' : 'VIEW CREATOR CARDS'}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* Creator Cards Credential Showcase */}
        {activeTab === 'credentials' && (
          <motion.div
            key="credentials"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-orbitron text-lg font-black text-white uppercase">
                  EARNED CREATOR CARD CREDENTIALS
                </h3>
                <p className="text-xs font-mono text-zinc-400">
                  On-chain status symbol • Verifiable portfolio artifact • Transferable accreditation analog
                </p>
              </div>
              <span className="text-xs font-mono text-[#00F2FF] font-bold">
                {passedModules.length}/4 EARNED
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {BLUEPRINT_MODULES.map((mod) => (
                <CreatorCardBadge
                  key={mod.id}
                  cardName={mod.creatorCardCredential.cardName}
                  moduleNumber={mod.number}
                  rarity={mod.creatorCardCredential.rarity}
                  description={mod.creatorCardCredential.description}
                  isUnlocked={passedModules.includes(mod.id)}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* 2.4 Facilitator Educational Tier */}
        {activeTab === 'facilitator_tier' && (
          <motion.div
            key="facilitator_tier"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="glass-card p-8 border-white/5 max-w-4xl mx-auto space-y-6"
          >
            <div className="flex items-center gap-4 border-b border-white/5 pb-4">
              <div className="w-12 h-12 rounded-2xl bg-[#7000FF]/20 border border-[#7000FF]/40 flex items-center justify-center">
                <ShieldAlert className="w-6 h-6 text-[#00F2FF]" />
              </div>
              <div>
                <h3 className="font-orbitron text-lg font-black text-white uppercase">
                  FACILITATOR CERTIFICATION — EDUCATIONAL TIER
                </h3>
                <p className="text-xs font-mono text-zinc-400">
                  Blueprint Content Delivery • Guided Application Technique • Youth Mental Health Referral Protocols
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-orbitron text-xs font-bold text-white uppercase tracking-widest">
                EDUCATIONAL TIER SCOPE & REFERRAL BOUNDARY PROTOCOLS:
              </h4>
              <div className="space-y-3 text-xs text-zinc-300">
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <div className="font-orbitron text-white uppercase font-bold text-[11px]">
                    1. Guided Application (Not Lecturing)
                  </div>
                  <p className="text-zinc-400 text-xs">
                    The app and AI Coach deliver the core concept; the human facilitator exists to ground the concept in live physical movement and relational stability.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 space-y-1">
                  <div className="font-orbitron uppercase font-bold text-[11px] flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-400" />
                    2. Mandatory Referral Protocol for Non-Physical Concerns
                  </div>
                  <p className="text-xs text-amber-300/90 leading-relaxed font-sans">
                    Facilitators are trained to recognize when check-ins reveal emotional distress or psychological trauma beyond athletic scope, maintaining strict referral protocols to licensed mental health providers.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-mono text-white">
                  EDUCATIONAL TIER 1 SIGN-OFF: <strong className="text-emerald-400">COMPLETE</strong>
                </span>
              </div>
              <span className="text-[10px] font-mono text-zinc-500">AUTHORITY: FEL-UNIVERSITY-BOARD</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
