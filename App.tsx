
import React, { useState, useEffect } from 'react';
import { Difficulty, LessonConfig, Question, StudentProfile } from './types';
import { generateLessonContent } from './services/geminiService';
import Quiz from './components/Quiz';

const AVATARS = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Guest',
];

const FIXED_INITIAL_PROFILES: StudentProfile[] = [
  {
    id: 'prive-1',
    name: 'Leerling 1',
    grade: 'Klas 2',
    schoolType: 'middelbare',
    avatar: AVATARS[0],
    password: '123',
    stats: { points: 0, streak: 0, completedLessons: 0, accuracy: 0 }
  },
  {
    id: 'prive-2',
    name: 'Leerling 2',
    grade: 'Klas 4',
    schoolType: 'middelbare',
    avatar: AVATARS[1],
    password: '456',
    stats: { points: 0, streak: 0, completedLessons: 0, accuracy: 0 }
  },
  {
    id: 'openbaar',
    name: 'Gast Gebruiker',
    grade: 'Groep 8',
    schoolType: 'basisschool',
    avatar: AVATARS[2],
    stats: { points: 0, streak: 0, completedLessons: 0, accuracy: 0 }
  }
];

const App: React.FC = () => {
  const [profiles, setProfiles] = useState<StudentProfile[]>(() => {
    const saved = localStorage.getItem('linguist_profiles_final');
    return saved ? JSON.parse(saved) : FIXED_INITIAL_PROFILES;
  });

  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [view, setView] = useState<'profile-select' | 'login' | 'home' | 'setup' | 'quiz' | 'results' | 'loading'>('profile-select');
  const [pendingProfileId, setPendingProfileId] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [config, setConfig] = useState<LessonConfig>({
    subject: 'Algemeen',
    topic: '',
    difficulty: Difficulty.MEDIUM,
    gameMode: 'study'
  });

  const [questions, setQuestions] = useState<Question[]>([]);

  useEffect(() => {
    localStorage.setItem('linguist_profiles_final', JSON.stringify(profiles));
  }, [profiles]);

  const activeProfile = profiles.find(p => p.id === activeProfileId);
  const pendingProfile = profiles.find(p => p.id === pendingProfileId);

  const handleProfileClick = (id: string) => {
    const profile = profiles.find(p => p.id === id);
    if (profile?.password) {
      setPendingProfileId(id);
      setPasswordInput('');
      setErrorMessage(null);
      setView('login');
    } else {
      setActiveProfileId(id);
      setView('home');
    }
  };

  const handleLogin = () => {
    if (pendingProfile && passwordInput === pendingProfile.password) {
      setActiveProfileId(pendingProfile.id);
      setView('home');
    } else {
      setErrorMessage('Onjuist wachtwoord. Probeer het opnieuw.');
    }
  };

  const startLesson = async () => {
    if (!activeProfile) return;
    setErrorMessage(null);
    setView('loading');
    try {
      const newQuestions = await generateLessonContent(config, activeProfile);
      setQuestions(newQuestions);
      setView('quiz');
    } catch (error: any) {
      setErrorMessage(error.message);
      setView('setup');
    }
  };

  const handleQuizComplete = (score: number) => {
    if (activeProfileId) {
      setProfiles(prev => prev.map(p => {
        if (p.id === activeProfileId) {
          return {
            ...p,
            stats: { 
              ...p.stats, 
              points: p.stats.points + (score * 50), 
              completedLessons: p.stats.completedLessons + 1,
              streak: p.stats.streak + 1
            }
          };
        }
        return p;
      }));
    }
    setView('results');
  };

  if (view === 'profile-select') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white">
        <h1 className="text-4xl font-black mb-4">Linguist<span className="text-indigo-500">Pro</span></h1>
        <p className="text-slate-400 mb-12">Kies je profiel om te beginnen</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-4xl">
          {profiles.map(p => (
            <button key={p.id} onClick={() => handleProfileClick(p.id)} className="bg-slate-900 p-8 rounded-[2rem] border-2 border-slate-800 hover:border-indigo-500 transition-all transform hover:scale-105 flex flex-col items-center">
              <div className="w-24 h-24 mb-4 bg-slate-800 rounded-full p-2">
                <img src={p.avatar} alt="Avatar" className="w-full h-full" />
              </div>
              <p className="font-bold text-xl">{p.name}</p>
              <p className="text-xs text-slate-500 uppercase tracking-widest mt-1">{p.grade}</p>
              {p.password && <div className="mt-4 text-slate-600"><i className="fas fa-lock text-sm"></i></div>}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (view === 'login') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white">
        <div className="bg-slate-900 p-10 rounded-[2.5rem] border-2 border-slate-800 w-full max-w-md text-center">
          <div className="w-24 h-24 mx-auto mb-6 bg-slate-800 rounded-full p-2">
            <img src={pendingProfile?.avatar} alt="avatar" className="w-full h-full" />
          </div>
          <h2 className="text-2xl font-black mb-6">Welkom terug, {pendingProfile?.name}</h2>
          <input 
            type="password" 
            autoFocus
            placeholder="Voer wachtwoord in" 
            className="w-full bg-slate-800 border-2 border-slate-700 p-4 rounded-2xl mb-4 text-center text-xl focus:border-indigo-500 outline-none transition-all"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          />
          {errorMessage && <p className="text-red-400 mb-4 text-sm font-medium">{errorMessage}</p>}
          <button onClick={handleLogin} className="w-full bg-indigo-600 p-4 rounded-2xl font-black text-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-900/20">Inloggen</button>
          <button onClick={() => setView('profile-select')} className="mt-6 text-slate-500 hover:text-white transition-colors text-sm font-bold uppercase tracking-widest">Wissel van account</button>
        </div>
      </div>
    );
  }

  if (view === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-10 text-center">
        <div className="w-20 h-20 border-8 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-8"></div>
        <h2 className="text-3xl font-black text-slate-800">AI stelt je les samen...</h2>
        <p className="text-slate-500 mt-3 text-lg">We maken op maat gemaakte vragen voor {activeProfile?.grade}</p>
      </div>
    );
  }

  if (view === 'quiz') return <Quiz questions={questions} mode={config.gameMode || 'study'} onComplete={handleQuizComplete} onCancel={() => setView('home')} />;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-5xl mx-auto">
        <header className="flex justify-between items-center mb-10">
          <div className="flex items-center space-x-4 bg-white p-2 pr-6 rounded-full shadow-sm border border-slate-100">
             <img src={activeProfile?.avatar} className="w-12 h-12 bg-slate-100 rounded-full" alt="avatar" />
             <div>
               <p className="font-black text-slate-900 leading-none">{activeProfile?.name}</p>
               <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-1">{activeProfile?.grade}</p>
             </div>
          </div>
          <button onClick={() => setView('profile-select')} className="w-12 h-12 flex items-center justify-center rounded-full bg-white border border-slate-100 text-slate-400 hover:text-red-500 hover:border-red-100 transition-all shadow-sm">
            <i className="fas fa-power-off"></i>
          </button>
        </header>

        {view === 'home' && (
          <div className="space-y-8 animate-fadeIn">
            <div className="relative overflow-hidden bg-indigo-600 p-12 rounded-[3rem] text-white shadow-2xl shadow-indigo-200">
              <div className="relative z-10">
                <h1 className="text-4xl font-black mb-4">Klaar om te knallen? 🚀</h1>
                <p className="text-indigo-100 text-lg mb-8 max-w-md">Je hebt al {activeProfile?.stats.completedLessons} lessen afgerond. Laten we je streak van {activeProfile?.stats.streak} dagen volhouden!</p>
                <button onClick={() => setView('setup')} className="bg-white text-indigo-600 px-10 py-5 rounded-2xl font-black text-xl shadow-xl hover:scale-105 active:scale-95 transition-all">Nieuwe Oefening</button>
              </div>
              <div className="absolute top-[-20%] right-[-5%] w-64 h-64 bg-indigo-500 rounded-full opacity-50 blur-3xl"></div>
              <div className="absolute bottom-[-20%] left-[-5%] w-48 h-48 bg-indigo-400 rounded-full opacity-30 blur-2xl"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                <div className="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-2xl flex items-center justify-center mb-4 text-xl">
                  <i className="fas fa-star"></i>
                </div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Totaal Punten</p>
                <p className="text-4xl font-black text-slate-800">{activeProfile?.stats.points}</p>
              </div>
              <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mb-4 text-xl">
                  <i className="fas fa-fire"></i>
                </div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Dagelijkse Streak</p>
                <p className="text-4xl font-black text-slate-800">{activeProfile?.stats.streak} Dagen</p>
              </div>
              <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-4 text-xl">
                  <i className="fas fa-graduation-cap"></i>
                </div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Lessen Voltooid</p>
                <p className="text-4xl font-black text-slate-800">{activeProfile?.stats.completedLessons}</p>
              </div>
            </div>
          </div>
        )}

        {view === 'setup' && (
          <div className="max-w-xl mx-auto bg-white p-12 rounded-[3rem] shadow-xl border border-slate-100 animate-fadeIn">
            <h2 className="text-3xl font-black mb-8 text-slate-800">Wat wil je leren?</h2>
            <div className="space-y-8">
              <div>
                <label className="text-xs font-black text-slate-400 uppercase mb-3 block tracking-widest">Onderwerp of Hoofdstuk</label>
                <input 
                  type="text" 
                  autoFocus
                  placeholder="bijv. Franse werkwoorden, Spelling hoofdstuk 4" 
                  className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 focus:bg-white outline-none transition-all text-lg font-medium"
                  value={config.topic}
                  onChange={(e) => setConfig({...config, topic: e.target.value})}
                  onKeyDown={(e) => e.key === 'Enter' && config.topic && startLesson()}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setConfig({...config, gameMode: 'study'})}
                  className={`p-4 rounded-2xl border-2 font-bold transition-all ${config.gameMode === 'study' ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-100 text-slate-400'}`}
                >
                  <i className="fas fa-book-open mr-2"></i> Studie
                </button>
                <button 
                  onClick={() => setConfig({...config, gameMode: 'play'})}
                  className={`p-4 rounded-2xl border-2 font-bold transition-all ${config.gameMode === 'play' ? 'border-orange-500 bg-orange-50 text-orange-500' : 'border-slate-100 text-slate-400'}`}
                >
                  <i className="fas fa-bolt mr-2"></i> Time Attack
                </button>
              </div>

              <button 
                onClick={startLesson}
                disabled={!config.topic}
                className="w-full bg-indigo-600 text-white p-6 rounded-[1.5rem] font-black text-xl disabled:opacity-30 shadow-xl shadow-indigo-100 hover:bg-indigo-700 hover:translate-y-[-2px] active:translate-y-[0px] transition-all"
              >
                Start Oefening
              </button>
              <button onClick={() => setView('home')} className="w-full text-slate-400 text-sm font-bold uppercase tracking-widest hover:text-slate-600 transition-colors">Terug</button>
            </div>
          </div>
        )}

        {view === 'results' && (
          <div className="max-w-md mx-auto bg-white p-12 rounded-[3.5rem] text-center shadow-2xl border border-slate-100 animate-bounceIn">
            <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-8 text-4xl shadow-inner">
              <i className="fas fa-check"></i>
            </div>
            <h2 className="text-4xl font-black mb-4 text-slate-800">Lekker bezig!</h2>
            <p className="text-slate-500 mb-10 text-lg leading-relaxed">Je hebt de oefening afgerond en je voortgang is opgeslagen in je profiel.</p>
            <div className="bg-slate-50 p-6 rounded-3xl mb-10">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Verdiende Punten</p>
              <p className="text-3xl font-black text-indigo-600">+ 250 XP</p>
            </div>
            <button onClick={() => setView('home')} className="w-full bg-slate-900 text-white p-6 rounded-2xl font-black text-lg hover:bg-black hover:scale-105 active:scale-95 transition-all shadow-xl">Terug naar Dashboard</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;

