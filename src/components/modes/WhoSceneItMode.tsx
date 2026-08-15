import React, { useState, useEffect, useCallback } from 'react';
import { 
  ArrowLeft, RotateCcw, Volume2, VolumeX, Film, 
  Award, Play, CheckCircle2, XCircle, Timer, Trophy
} from 'lucide-react';
import { SoundJuice } from '../../lib/judgeScoring';

interface WhoSceneItModeProps {
  onBack: () => void;
}

type TriviaQuestion = {
  id: number;
  category: string;
  clue: string;
  options: string[];
  correctIndex: number;
  momentContext: string;
  icon: string;
};

const SCENE_QUESTIONS: TriviaQuestion[] = [
  {
    id: 1,
    category: 'BASKETBALL ICONIC CLUTCH',
    clue: '"The Last Shot" in Utah, 1998 Finals Game 6 — who crossed Bryon Russell at the top of the key to hit the series winner?',
    options: ['Kobe Bryant', 'Michael Jordan', 'Reggie Miller', 'Allen Iverson'],
    correctIndex: 1,
    momentContext: 'Michael Jordan sealed Chicago’s 6th NBA Championship with 5.2 seconds remaining.',
    icon: '🏀'
  },
  {
    id: 2,
    category: 'SOCCER WORLD CUP GLORY',
    clue: 'In the 2022 World Cup Final in Qatar, which French superstar scored a legendary hat-trick in regulation and extra time?',
    options: ['Kylian Mbappé', 'Karim Benzema', 'Antoine Griezmann', 'Thierry Henry'],
    correctIndex: 0,
    momentContext: 'Kylian Mbappé rallied France back twice in one of the greatest finals in sporting history.',
    icon: '⚽'
  },
  {
    id: 3,
    category: 'COMBAT SPORTS LEGEND',
    clue: '1974 "Rumble in the Jungle" in Kinshasa, Zaire — which champion utilized the "Rope-a-Dope" strategy against George Foreman?',
    options: ['Joe Frazier', 'Mike Tyson', 'Muhammad Ali', 'Sugar Ray Leonard'],
    correctIndex: 2,
    momentContext: 'Muhammad Ali absorbed power punches on the ropes before knocking out Foreman in the 8th round.',
    icon: '🥊'
  },
  {
    id: 4,
    category: 'BASEBALL OCTOBER MAGIC',
    clue: '1988 World Series Game 1 — who hit the iconic pinch-hit walk-off home run off Dennis Eckersley while severely injured?',
    options: ['Kirk Gibson', 'Barry Bonds', 'Ken Griffey Jr.', 'Cal Ripken Jr.'],
    correctIndex: 0,
    momentContext: 'Kirk Gibson limped around the bases pumping his fist into Dodgers lore.',
    icon: '⚾'
  }
];

export const WhoSceneItMode: React.FC<WhoSceneItModeProps> = ({ onBack }) => {
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(0);
  const [clockSeconds, setClockSeconds] = useState<number>(10);
  const [isQuestionActive, setIsQuestionActive] = useState<boolean>(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [wagerMultiplier, setWagerMultiplier] = useState<number>(2); // 1x, 2x, 3x risk
  const [currentScore, setCurrentScore] = useState<number>(0);

  // Result Report
  const [roundReport, setRoundReport] = useState<{
    isCorrect: boolean;
    pointsEarned: number;
    explanation: string;
  } | null>(null);

  const [gameOverSummary, setGameOverSummary] = useState<{
    grade: string;
    finalScore: number;
    accuracy: number;
    whyExplainer: string;
  } | null>(null);

  const q = SCENE_QUESTIONS[currentQuestionIdx];

  const playSfx = useCallback((fn: () => void) => {
    if (soundEnabled) fn();
  }, [soundEnabled]);

  const handleAnswer = useCallback((optionIdx: number) => {
    setIsQuestionActive(false);
    setSelectedOption(optionIdx);

    const isCorrect = optionIdx === q.correctIndex;
    const timeBonus = Math.max(1, clockSeconds);
    const pts = isCorrect ? Math.round(500 * wagerMultiplier * (1 + timeBonus / 10)) : 0;

    if (isCorrect) {
      playSfx(() => SoundJuice.playVictory());
      setCurrentScore(s => s + pts);
    } else {
      playSfx(() => SoundJuice.playHit());
    }

    setRoundReport({
      isCorrect,
      pointsEarned: pts,
      explanation: q.momentContext
    });
  }, [q, clockSeconds, wagerMultiplier, playSfx]);

  // Question Clock
  useEffect(() => {
    if (isQuestionActive && clockSeconds > 0) {
      const timer = setInterval(() => {
        setClockSeconds(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            handleAnswer(-1); // timeout
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isQuestionActive, clockSeconds, handleAnswer]);

  const startNextQuestion = () => {
    setSelectedOption(null);
    setRoundReport(null);
    setClockSeconds(10);
    setIsQuestionActive(true);
    playSfx(() => SoundJuice.playZoneBeep());
  };

  const advanceQuestion = () => {
    if (currentQuestionIdx + 1 < SCENE_QUESTIONS.length) {
      setCurrentQuestionIdx(prev => prev + 1);
      startNextQuestion();
    } else {
      // Game over
      const accuracy = (currentScore / (SCENE_QUESTIONS.length * 1500)) * 100;
      setGameOverSummary({
        grade: currentScore >= 4000 ? 'CINEMATIC MASTER // S+' : 'SPORT HISTORIAN // A',
        finalScore: currentScore,
        accuracy: Math.round(accuracy),
        whyExplainer: 'Lightning buzzer response times and maximum wager confidence in high-leverage sports memory rounds.'
      });
    }
  };

  const restartQuiz = () => {
    setCurrentQuestionIdx(0);
    setCurrentScore(0);
    setGameOverSummary(null);
    startNextQuestion();
  };

  return (
    <div className="relative w-full h-[720px] rounded-3xl overflow-hidden bg-[#100C1F] border border-white/10 flex flex-col justify-between shadow-2xl">
      {/* Top Header HUD */}
      <div className="relative z-10 p-6 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-3 rounded-2xl bg-black/60 border border-white/10 text-white hover:border-purple-400 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/40 font-bold uppercase">
                WHO SCENE IT // CINEMATIC MEMORY SHOWDOWN
              </span>
              <span className="text-xs font-mono text-zinc-400">• SCENE {currentQuestionIdx + 1} OF {SCENE_QUESTIONS.length}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-orbitron font-black text-white uppercase tracking-tight mt-0.5">
              {q.category}
            </h1>
          </div>
        </div>

        {/* Timer & Wager Multiplier HUD */}
        <div className="flex items-center gap-4">
          <div className="px-4 py-2 rounded-2xl bg-black/60 border border-white/10 flex items-center gap-2">
            <Timer className="w-4 h-4 text-purple-400" />
            <span className="text-lg font-orbitron font-black text-white">{clockSeconds}s</span>
          </div>

          <div className="px-4 py-2 rounded-2xl bg-black/60 border border-white/10 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-purple-400" />
            <span className="text-lg font-orbitron font-black text-purple-400">{currentScore}</span>
          </div>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-3 rounded-2xl bg-black/60 border border-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-purple-400" /> : <VolumeX className="w-4 h-4 text-zinc-600" />}
          </button>
        </div>
      </div>

      {/* Main Question & Option Theater */}
      <div className="relative flex-1 mx-6 rounded-3xl bg-zinc-950/80 border border-purple-500/20 overflow-hidden flex flex-col justify-between p-6">
        {/* Film Screen Visual */}
        <div className="relative w-full p-6 sm:p-8 rounded-2xl bg-gradient-to-b from-[#22133c] to-[#120722] border border-purple-400/30 overflow-hidden space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono text-purple-300 font-bold uppercase">
              <Film className="w-4 h-4" />
              CINEMATIC ARCHIVE MOMENT
            </div>
            <div className="text-2xl">{q.icon}</div>
          </div>

          <h2 className="text-lg sm:text-xl font-orbitron font-black text-white leading-relaxed">
            "{q.clue}"
          </h2>
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
          {q.options.map((opt, idx) => {
            const isChosen = selectedOption === idx;
            const isCorrect = idx === q.correctIndex;
            let btnStyle = 'bg-white/5 border-white/10 text-white hover:border-purple-400';

            if (selectedOption !== null) {
              if (isCorrect) btnStyle = 'bg-[#00FF9D]/20 border-[#00FF9D] text-[#00FF9D] font-black';
              else if (isChosen) btnStyle = 'bg-red-500/20 border-red-500 text-red-400 font-black';
            }

            return (
              <button
                key={idx}
                onClick={() => handleAnswer(idx)}
                disabled={!isQuestionActive}
                className={`p-4 rounded-2xl border text-left font-orbitron text-sm transition-all cursor-pointer flex items-center justify-between ${btnStyle}`}
              >
                <span>{opt}</span>
                {selectedOption !== null && isCorrect && <CheckCircle2 className="w-5 h-5 text-[#00FF9D]" />}
                {selectedOption !== null && isChosen && !isCorrect && <XCircle className="w-5 h-5 text-red-400" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Round Explainer Modal */}
      {roundReport && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
          <div className="max-w-md w-full p-8 rounded-3xl bg-zinc-950 border border-purple-500/40 shadow-[0_0_80px_rgba(168,85,247,0.3)] space-y-6 text-center">
            <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center mx-auto ${
              roundReport.isCorrect 
                ? 'bg-[#00FF9D]/20 border-[#00FF9D]/40 text-[#00FF9D]' 
                : 'bg-red-500/20 border-red-500/40 text-red-400'
            }`}>
              {roundReport.isCorrect ? <CheckCircle2 className="w-7 h-7" /> : <XCircle className="w-7 h-7" />}
            </div>

            <div>
              <span className="text-[10px] font-mono text-purple-400 uppercase tracking-widest font-bold">
                RECALL VERIFICATION
              </span>
              <h2 className="text-2xl sm:text-3xl font-orbitron font-black text-white mt-1">
                {roundReport.isCorrect ? 'BUZZER ACCURACY +100%' : 'INCORRECT CALL'}
              </h2>
            </div>

            <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-2 text-left">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-zinc-400">POINTS EARNED:</span>
                <span className="font-bold text-purple-300">+{roundReport.pointsEarned} PTS</span>
              </div>
              <p className="text-[11px] font-mono text-zinc-300 pt-2 border-t border-white/10 leading-relaxed">
                <span className="text-purple-400 font-bold">CONTEXT:</span> {roundReport.explanation}
              </p>
            </div>

            <button
              onClick={advanceQuestion}
              className="w-full py-4 bg-purple-500 text-black font-orbitron font-black text-sm rounded-2xl hover:bg-purple-400 transition-all shadow-[0_0_25px_rgba(168,85,247,0.4)] flex items-center justify-center gap-2 cursor-pointer"
            >
              {currentQuestionIdx + 1 < SCENE_QUESTIONS.length ? 'NEXT SCENE' : 'VIEW SHOWDOWN REPORT'}
            </button>
          </div>
        </div>
      )}

      {/* Game Over Summary Modal */}
      {gameOverSummary && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
          <div className="max-w-md w-full p-8 rounded-3xl bg-zinc-950 border border-purple-500/40 shadow-[0_0_80px_rgba(168,85,247,0.3)] space-y-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/20 border border-purple-500/40 text-purple-300 flex items-center justify-center mx-auto">
              <Award className="w-7 h-7" />
            </div>

            <div>
              <span className="text-[10px] font-mono text-purple-400 uppercase tracking-widest font-bold">
                SHOWDOWN COMPLETED
              </span>
              <h2 className="text-3xl font-orbitron font-black text-white mt-1">
                {gameOverSummary.grade}
              </h2>
            </div>

            <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-2 text-left">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-zinc-400">FINAL SCORE:</span>
                <span className="font-bold text-purple-400">{gameOverSummary.finalScore} PTS</span>
              </div>
              <p className="text-[11px] font-mono text-zinc-300 pt-2 border-t border-white/10 leading-relaxed">
                <span className="text-purple-400 font-bold">EXPLAINER:</span> {gameOverSummary.whyExplainer}
              </p>
            </div>

            <button
              onClick={restartQuiz}
              className="w-full py-4 bg-purple-500 text-black font-orbitron font-black text-sm rounded-2xl hover:bg-purple-400 transition-all shadow-[0_0_25px_rgba(168,85,247,0.4)] flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              PLAY AGAIN
            </button>
          </div>
        </div>
      )}

      {/* Bottom Confidence Wager Controls */}
      <div className="relative z-10 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-zinc-400">CONFIDENCE WAGER:</span>
          {([1, 2, 3] as const).map((w) => (
            <button
              key={w}
              onClick={() => setWagerMultiplier(w)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                wagerMultiplier === w 
                  ? 'bg-purple-500 text-black shadow-[0_0_15px_rgba(168,85,247,0.4)]' 
                  : 'bg-white/5 text-zinc-400 hover:text-white border border-white/10'
              }`}
            >
              {w}x RISK
            </button>
          ))}
        </div>

        {!isQuestionActive && !roundReport && !gameOverSummary && (
          <button
            onClick={startNextQuestion}
            className="px-8 py-4 rounded-2xl bg-purple-500 text-black font-orbitron font-black text-sm tracking-wider hover:bg-purple-400 transition-all shadow-[0_0_35px_rgba(168,85,247,0.4)] flex items-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-black" />
            <span>START SCENE BUZZER</span>
          </button>
        )}
      </div>
    </div>
  );
};
