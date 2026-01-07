
import React, { useState, useEffect } from 'react';
import { Question, GameMode } from '../types';

interface QuizProps {
  questions: Question[];
  mode: GameMode;
  onComplete: (score: number) => void;
  onCancel: () => void;
}

const Quiz: React.FC<QuizProps> = ({ questions, mode, onComplete, onCancel }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isChecked, setIsChecked] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15); // 15 seconden per vraag in Play mode
  const [combo, setCombo] = useState(0);

  const currentQuestion = questions[currentIndex];

  useEffect(() => {
    if (mode === 'play' && !isChecked) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleCheck(true); // Automatisch fout rekenen als tijd op is
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [currentIndex, isChecked, mode]);

  const handleCheck = (timeOut = false) => {
    const isCorrect = !timeOut && selectedAnswer === currentQuestion.correctAnswer;
    if (isCorrect) {
      setScore(s => s + (mode === 'play' ? 1 + Math.floor(combo / 2) : 1));
      setCombo(c => c + 1);
    } else {
      setCombo(0);
    }
    setIsChecked(true);

    // In 'play' mode gaan we sneller door naar de volgende vraag
    if (mode === 'play') {
      setTimeout(() => {
        handleNext();
      }, 1500);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer(null);
      setIsChecked(false);
      setTimeLeft(15);
    } else {
      onComplete(score);
    }
  };

  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className={`max-w-2xl mx-auto bg-white rounded-[3rem] shadow-2xl overflow-hidden border-4 transition-colors duration-500 ${mode === 'play' ? (timeLeft < 5 ? 'border-red-400' : 'border-orange-400') : 'border-slate-100'}`}>
      <div className={`${mode === 'play' ? 'bg-orange-500' : 'bg-indigo-600'} h-3 transition-all duration-500`} style={{ width: `${progress}%` }} />
      
      <div className="p-10">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-3">
             <span className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-500">
               {mode === 'play' ? 'Time Attack' : 'Studie Modus'}
             </span>
             {mode === 'play' && combo > 1 && (
               <span className="px-3 py-1 bg-orange-100 text-orange-600 rounded-full text-[10px] font-black animate-bounce">
                 {combo}x COMBO!
               </span>
             )}
          </div>
          {mode === 'play' && (
            <div className={`text-2xl font-black ${timeLeft < 5 ? 'text-red-500 animate-pulse' : 'text-orange-500'}`}>
              <i className="fas fa-clock mr-2"></i>{timeLeft}s
            </div>
          )}
          <button onClick={onCancel} className="text-slate-300 hover:text-slate-500 transition-colors">
            <i className="fas fa-times-circle text-2xl"></i>
          </button>
        </div>

        <h2 className="text-2xl font-black text-slate-800 mb-10 leading-snug">
          {currentQuestion.question}
        </h2>

        <div className="grid gap-4 mb-10">
          {currentQuestion.options.map((option) => {
            let style = "bg-slate-50 border-slate-200 text-slate-700 hover:border-indigo-300";
            if (isChecked) {
              if (option === currentQuestion.correctAnswer) style = "bg-green-500 border-green-500 text-white shadow-lg shadow-green-200";
              else if (option === selectedAnswer) style = "bg-red-500 border-red-500 text-white shadow-lg shadow-red-200";
              else style = "bg-slate-50 border-slate-100 text-slate-300 opacity-50";
            } else if (option === selectedAnswer) {
              style = `border-2 ${mode === 'play' ? 'border-orange-500 bg-orange-50' : 'border-indigo-500 bg-indigo-50'}`;
            }

            return (
              <button
                key={option}
                disabled={isChecked}
                onClick={() => setSelectedAnswer(option)}
                className={`w-full text-left p-6 rounded-2xl border-2 font-bold transition-all duration-300 transform active:scale-95 ${style}`}
              >
                {option}
              </button>
            );
          })}
        </div>

        {isChecked && mode === 'study' && (
          <div className="mb-10 p-6 bg-indigo-50 rounded-3xl border border-indigo-100 animate-fadeIn">
            <p className="text-indigo-900 font-medium leading-relaxed">
              <span className="font-black uppercase text-[10px] block mb-1 opacity-50 tracking-widest">Uitleg</span>
              {currentQuestion.explanation}
            </p>
          </div>
        )}

        {mode === 'study' && (
          <div className="flex justify-end">
            {!isChecked ? (
              <button
                disabled={!selectedAnswer}
                onClick={() => handleCheck()}
                className="px-12 py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-30 transition-all"
              >
                Controleer
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="px-12 py-5 bg-slate-900 text-white rounded-2xl font-black text-lg shadow-xl hover:bg-black transition-all"
              >
                {currentIndex < questions.length - 1 ? 'Volgende Vraag' : 'Bekijk Resultaat'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Quiz;
