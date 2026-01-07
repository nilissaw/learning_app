
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";

// --- TYPES ---
type GameMode = 'study' | 'play';

interface StudentProfile {
  id: string;
  name: string;
  grade: string;
  avatar: string;
  password?: string;
  stats: { points: number; streak: number; completedLessons: number; };
}

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

// --- CONSTANTS ---
const AVATARS = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Guest',
];

const INITIAL_PROFILES: StudentProfile[] = [
  { id: 'prive-1', name: 'Leerling 1', grade: 'Klas 2', avatar: AVATARS[0], password: '123', stats: { points: 0, streak: 0, completedLessons: 0 } },
  { id: 'prive-2', name: 'Leerling 2', grade: 'Klas 4', avatar: AVATARS[1], password: '456', stats: { points: 0, streak: 0, completedLessons: 0 } },
  { id: 'openbaar', name: 'Gast Gebruiker', grade: 'Groep 8', avatar: AVATARS[2], stats: { points: 0, streak: 0, completedLessons: 0 } }
];

// --- QUIZ COMPONENT ---
const Quiz: React.FC<{ questions: Question[], mode: GameMode, onComplete: (score: number) => void, onCancel: () => void }> = ({ questions, mode, onComplete, onCancel }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isChecked, setIsChecked] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);

  const currentQuestion = questions[currentIndex];

  useEffect(() => {
    if (mode === 'play' && !isChecked) {
      const timer = setInterval(() => setTimeLeft(t => t > 0 ? t - 1 : 0), 1000);
      if (timeLeft === 0) setIsChecked(true);
      return () => clearInterval(timer);
    }
  }, [timeLeft, isChecked, mode, currentIndex]);

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

  const check = () => {
    if (selectedAnswer === currentQuestion.correctAnswer) setScore(s => s + 1);
    setIsChecked(true);
    if (mode === 'play') setTimeout(handleNext, 1500);
  };

  return (
    <div className="max-w-2xl w-full bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border-2 border-slate-100 p-8 animate-fadeIn">
      <div className="flex justify-between mb-8 items-center">
        <span className="font-black text-indigo-600 uppercase text-xs tracking-widest bg-indigo-50 px-3 py-1 rounded-full">{mode === 'study' ? 'Studie' : 'Time Attack'}</span>
        {mode === 'play' && <span className={`font-black text-xl ${timeLeft < 5 ? 'text-red-500 animate-pulse' : 'text-orange-500'}`}>{timeLeft}s</span>}
        <button onClick={onCancel} className="text-slate-300 hover:text-red-500 transition-colors"><i className="fas fa-times-circle text-2xl"></i></button>
      </div>
      <div className="mb-8">
        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 transition-all duration-500" style={{width: `${((currentIndex + 1) / questions.length) * 100}%`}}></div>
        </div>
      </div>
      <h2 className="text-2xl font-black mb-8 text-slate-800">{currentQuestion.question}</h2>
      <div className="space-y-3 mb-8">
        {currentQuestion.options.map(opt => (
          <button key={opt} disabled={isChecked} onClick={() => setSelectedAnswer(opt)} className={`w-full p-5 rounded-2xl text-left font-bold border-2 transition-all transform active:scale-95 ${isChecked ? (opt === currentQuestion.correctAnswer ? 'bg-green-500 border-green-500 text-white' : opt === selectedAnswer ? 'bg-red-500 border-red-500 text-white' : 'opacity-40 border-slate-100') : (selectedAnswer === opt ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-100 hover:border-slate-300 text-slate-600')}`}>
            {opt}
          </button>
        ))}
      </div>
      {isChecked && mode === 'study' && (
        <div className="p-5 bg-indigo-50 rounded-2xl mb-8 text-indigo-900 text-sm border border-indigo-100 animate-fadeIn">{currentQuestion.explanation}</div>
      )}
      {!isChecked ? (
        <button onClick={check} disabled={!selectedAnswer} className="w-full bg-indigo-600 text-white p-5 rounded-2xl font-black text-lg shadow-lg disabled:opacity-30 transition-all">Controleer</button>
      ) : (
        mode === 'study' && <button onClick={handleNext} className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black text-lg hover:bg-black transition-all">Volgende</button>
      )}
    </div>
  );
};

// --- MAIN APP ---
const App: React.FC = () => {
  const [profiles, setProfiles] = useState<StudentProfile[]>(() => {
    const s = localStorage.getItem('linguist_p_v2');
    return s ? JSON.parse(s) : INITIAL_PROFILES;
  });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [view, setView] = useState<'profiles'|'login'|'home'|'setup'|'loading'|'quiz'|'results'>('profiles');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pass, setPass] = useState('');
  const [topic, setTopic] = useState('');
  const [mode, setMode] = useState<GameMode>('study');
  const [questions, setQuestions] = useState<Question[]>([]);

  useEffect(() => { localStorage.setItem('linguist_p_v2', JSON.stringify(profiles)); }, [profiles]);

  const activeP = profiles.find(p => p.id === activeId);
  const pendingP = profiles.find(p => p.id === pendingId);

  const startLesson = async () => {
    if (!topic) return;
    setView('loading');
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const prompt = `Genereer 5 Nederlandse meerkeuzevragen voor niveau ${activeP?.grade} over "${topic}". Output JSON array met id, question, options (4 stuks), correctAnswer, explanation.`;
      
      const res = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: prompt }] }],
        config: { 
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                question: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctAnswer: { type: Type.STRING },
                explanation: { type: Type.STRING }
              },
              required: ["id", "question", "options", "correctAnswer", "explanation"]
            }
          }
        }
      });
      setQuestions(JSON.parse(res.text));
      setView('quiz');
    } catch (err) { 
      alert("AI fout. Controleer je API_KEY in Vercel."); 
      setView('setup'); 
    }
  };

  if (view === 'profiles') return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white text-center">
      <h1 className="text-5xl font-black mb-12 italic">Linguist<span className="text-indigo-500">Pro</span></h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 w-full max-w-4xl">
        {profiles.map(p => (
          <button key={p.id} onClick={() => { if(p.password){setPendingId(p.id); setView('login'); setPass('');}else{setActiveId(p.id); setView('home');} }} className="bg-slate-900 p-10 rounded-[2.5rem] border-2 border-slate-800 hover:border-indigo-500 transition-all transform hover:scale-105 group">
            <img src={p.avatar} className="w-24 h-24 mx-auto mb-6 bg-slate-800 rounded-full p-2" alt="p" />
            <p className="font-black text-xl mb-1">{p.name}</p>
            <p className="text-xs text-slate-500 uppercase tracking-widest">{p.grade}</p>
          </button>
        ))}
      </div>
    </div>
  );

  if (view === 'login') return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white text-center">
      <div className="bg-slate-900 p-12 rounded-[3rem] border-2 border-slate-800 w-full max-w-md">
        <img src={pendingP?.avatar} className="w-28 h-28 mx-auto mb-8 bg-slate-800 rounded-full p-2" alt="p" />
        <h2 className="text-3xl font-black mb-8">Hoi {pendingP?.name}!</h2>
        <input type="password" autoFocus placeholder="Wachtwoord" className="w-full bg-slate-800 border-2 border-slate-700 p-5 rounded-2xl mb-6 text-center text-3xl outline-none focus:border-indigo-500" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === 'Enter' && pass === pendingP?.password && (setActiveId(pendingId), setView('home'))} />
        <button onClick={() => { if(pass === pendingP?.password){setActiveId(pendingId); setView('home');}else{alert('Onjuist!');} }} className="w-full bg-indigo-600 p-5 rounded-2xl font-black text-xl">Inloggen</button>
        <button onClick={() => setView('profiles')} className="mt-8 text-slate-500 text-xs font-bold uppercase tracking-widest">Terug</button>
      </div>
    </div>
  );

  if (view === 'loading') return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white text-center">
      <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-6"></div>
      <h2 className="text-2xl font-black text-slate-800">Even geduld...</h2>
    </div>
  );

  if (view === 'quiz') return <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center"><Quiz questions={questions} mode={mode} onCancel={() => setView('home')} onComplete={() => {
    setProfiles(prev => prev.map(p => p.id === activeId ? {...p, stats: {...p.stats, points: p.stats.points + 250, completedLessons: p.stats.completedLessons + 1}} : p));
    setView('results');
  }} /></div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-5xl mx-auto">
        <header className="flex justify-between items-center mb-12">
          <div className="flex items-center space-x-4 bg-white p-2 pr-6 rounded-full shadow-sm border border-slate-100">
            <img src={activeP?.avatar} className="w-12 h-12 bg-slate-100 rounded-full border-2 border-white shadow-sm" alt="p" />
            <div>
                <p className="font-black text-slate-900 leading-none">{activeP?.name}</p>
                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-1">{activeP?.grade}</p>
            </div>
          </div>
          <button onClick={() => setView('profiles')} className="w-12 h-12 flex items-center justify-center rounded-full bg-white text-slate-300 hover:text-red-500 transition-all border border-slate-100"><i className="fas fa-power-off"></i></button>
        </header>

        {view === 'home' && (
          <div className="space-y-8 animate-fadeIn">
            <div className="bg-indigo-600 p-12 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden">
                <h2 className="text-4xl font-black mb-4">Klaar om te leren?</h2>
                <p className="mb-10 text-indigo-100 text-lg">Je hebt al {activeP?.stats.completedLessons} lessen afgerond.</p>
                <button onClick={() => { setView('setup'); setTopic(''); }} className="bg-white text-indigo-600 px-10 py-5 rounded-2xl font-black text-xl hover:scale-105 transition-all">Start Nieuwe Oefening</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Punten</p>
                <p className="text-4xl font-black text-slate-800">{activeP?.stats.points} XP</p>
              </div>
              <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Streak</p>
                <p className="text-4xl font-black text-slate-800">🔥 {activeP?.stats.streak} Dagen</p>
              </div>
            </div>
          </div>
        )}

        {view === 'setup' && (
          <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl border border-slate-100 max-w-xl mx-auto">
            <h3 className="text-3xl font-black mb-8 text-slate-800">Wat gaan we doen?</h3>
            <div className="space-y-8">
                <input type="text" autoFocus placeholder="Onderwerp (bijv. Franse tijden)" className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xl font-bold outline-none focus:border-indigo-500" value={topic} onChange={e => setTopic(e.target.value)} />
                <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => setMode('study')} className={`p-5 rounded-2xl font-black text-lg border-2 transition-all ${mode === 'study' ? 'border-indigo-600 bg-indigo-50 text-indigo-600 shadow-md' : 'border-slate-100 text-slate-400'}`}>Studie</button>
                    <button onClick={() => setMode('play')} className={`p-5 rounded-2xl font-black text-lg border-2 transition-all ${mode === 'play' ? 'border-orange-500 bg-orange-50 text-orange-500 shadow-md' : 'border-slate-100 text-slate-400'}`}>Play</button>
                </div>
                <button onClick={startLesson} disabled={!topic} className="w-full bg-indigo-600 text-white p-6 rounded-[1.5rem] font-black text-2xl shadow-xl disabled:opacity-30 transition-all">Start Les</button>
                <button onClick={() => setView('home')} className="w-full text-slate-400 font-bold uppercase text-xs text-center">Terug</button>
            </div>
          </div>
        )}

        {view === 'results' && (
          <div className="bg-white p-16 rounded-[4rem] shadow-2xl text-center max-w-md mx-auto animate-bounceIn">
            <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-8 text-4xl shadow-inner"><i className="fas fa-check"></i></div>
            <h3 className="text-4xl font-black mb-4 text-slate-800">Top!</h3>
            <p className="text-slate-500 mb-10 text-lg leading-relaxed">Je hebt weer 250 XP verdiend.</p>
            <button onClick={() => setView('home')} className="w-full bg-slate-900 text-white p-6 rounded-2xl font-black text-xl">Terug naar Dashboard</button>
          </div>
        )}
      </div>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<React.StrictMode><App /></React.StrictMode>);
