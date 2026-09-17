import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import { 
  Users, Play, ArrowRight, Volume2, VolumeX, Award, CheckCircle2, 
  XCircle, Sparkles, RefreshCw, MessageSquare, Trophy, Home, SkipForward,
  Maximize, Minimize, Shuffle, Download
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { sound } from '../utils/audioEngine';

export default function HostScreen({ socket, quiz, level, onExit, currentUser }) {
  const [pin, setPin] = useState('');
  const [joinUrl, setJoinUrl] = useState('');
  const [publicJoinUrl, setPublicJoinUrl] = useState(null);
  const [use4G, setUse4G] = useState(false); // Toggle between WiFi and 4G
  const [players, setPlayers] = useState([]);
  const [gameState, setGameState] = useState('LOBBY'); // LOBBY, QUESTION, RESULT, LEADERBOARD, PODIUM
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [timeLeft, setTimeLeft] = useState(20);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [allAnswered, setAllAnswered] = useState(false);
  const [resultData, setResultData] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [podiumData, setPodiumData] = useState(null);
  const [peerDiscussActive, setPeerDiscussActive] = useState(false);
  const [peerDiscussTime, setPeerDiscussTime] = useState(45);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [shuffleNotice, setShuffleNotice] = useState('');

  const isFree = !currentUser || currentUser.license === 'free';

  const pinRef = useRef(pin);
  pinRef.current = pin;

  const timerRef = useRef(null);
  const discussTimerRef = useRef(null);

  const handleShuffleQuiz = () => {
    sound.playClick();
    socket.emit('host:shuffle-quiz', { pin: pinRef.current });
  };

  const toggleFullscreen = () => {
    sound.playClick();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.log('Fullscreen error:', err));
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  const exportToExcel = () => {
    if (!podiumData?.allPlayers || podiumData.allPlayers.length === 0) {
      alert("មិនមានទិន្នន័យសម្រាប់ទាញយកទេ!");
      return;
    }

    const exportData = podiumData.allPlayers.map((p, idx) => ({
      "ចំណាត់ថ្នាក់": idx + 1,
      "ឈ្មោះសិស្ស": p.nickname,
      "ពិន្ទុសរុប": p.score,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    
    // Add title row
    XLSX.utils.sheet_add_aoa(ws, [["របាយការណ៍លទ្ធផល: " + (quiz?.title || "AC-Kahoot")]], { origin: "A1" });
    ws['!merges'] = [ { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } } ]; // Merge A1:C1
    
    // Push the json data down by 2 rows to make space for the title
    XLSX.utils.sheet_add_json(ws, exportData, { origin: "A3" });

    // Set column widths
    ws['!cols'] = [
      { wch: 15 }, // Rank
      { wch: 30 }, // Name
      { wch: 15 }, // Score
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "លទ្ធផលសិស្ស");

    // Save the file
    XLSX.writeFile(wb, `AC-Kahoot-Results-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Initialize Host Room
  useEffect(() => {
    if (!socket) return;

    socket.emit('host:create-room', { 
      quiz, 
      level, 
      hostLicense: currentUser?.license || 'free' 
    });

    socket.on('host:room-created', (data) => {
      setPin(data.pin);
      pinRef.current = data.pin;
      setJoinUrl(data.joinUrl);
      if (data.publicJoinUrl) {
        setPublicJoinUrl(data.publicJoinUrl);
        setUse4G(true);
      }
      sound.startLobbyMusic();
    });

    socket.on('server:public-url-updated', (data) => {
      if (data.publicUrl) {
        const currentPin = pinRef.current || '';
        setPublicJoinUrl(`${data.publicUrl}/?pin=${currentPin}`);
        setUse4G(true);
      }
    });

    socket.on('room:players-updated', (data) => {
      setPlayers(data.players || []);
    });

    socket.on('host:quiz-shuffled', (data) => {
      sound.playCorrect();
      setShuffleNotice(data.message || 'វិញ្ញាសាត្រូវបានច្របល់ដោយចៃដន្យរួចរាល់!');
      setTimeout(() => setShuffleNotice(''), 3500);
    });

    socket.on('host:question-started', (data) => {
      sound.stopLobbyMusic();
      setCurrentQIndex(data.questionIndex);
      setCurrentQuestion(data.question);
      setTimeLeft(data.question.timeLimit || 20);
      setTotalAnswered(0);
      setAllAnswered(false);
      setResultData(null);
      setPeerDiscussActive(false);
      setGameState('QUESTION');
    });

    socket.on('host:player-answered', (data) => {
      setTotalAnswered(data.totalAnswered);
      if (data.allAnswered) {
        setAllAnswered(true);
      }
    });

    socket.on('host:results-shown', (data) => {
      if (timerRef.current) clearInterval(timerRef.current);
      setResultData(data);
      setGameState('RESULT');
      sound.playCorrect();
    });

    socket.on('game:leaderboard', (data) => {
      setLeaderboard(data.leaderboard || []);
      setGameState('LEADERBOARD');
      sound.playFanfare();
    });

    socket.on('game:podium', (data) => {
      if (timerRef.current) clearInterval(timerRef.current);
      setPodiumData(data);
      setGameState('PODIUM');
      sound.playFanfare();

      // Trigger Confetti Party
      const duration = 4 * 1000;
      const end = Date.now() + duration;
      (function frame() {
        confetti({
          particleCount: 4,
          angle: 60,
          spread: 55,
          origin: { x: 0 }
        });
        confetti({
          particleCount: 4,
          angle: 120,
          spread: 55,
          origin: { x: 1 }
        });
        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      })();
    });

    return () => {
      sound.stopLobbyMusic();
      if (timerRef.current) clearInterval(timerRef.current);
      if (discussTimerRef.current) clearInterval(discussTimerRef.current);
    };
  }, [socket, quiz, level]);

  // Fire confetti when PODIUM is shown
  useEffect(() => {
    if (gameState === 'PODIUM') {
      const duration = 5 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 10000 };

      const interval = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti(Object.assign({}, defaults, { particleCount, origin: { x: Math.random(), y: Math.random() - 0.2 } }));
      }, 250);
    }
  }, [gameState]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (discussTimerRef.current) clearInterval(discussTimerRef.current);
    };
  }, []);

  // Auto-fetch 4G public URL if not ready when room was first created
  useEffect(() => {
    if (publicJoinUrl || !pin) return;

    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch('/api/network-info');
        const data = await res.json();
        if (data.rawPublicUrl) {
          setPublicJoinUrl(`${data.rawPublicUrl}/?pin=${pin}`);
          clearInterval(interval);
        }
      } catch {}
      if (attempts >= 15) clearInterval(interval);
    }, 2000);

    return () => clearInterval(interval);
  }, [publicJoinUrl, pin]);

  // Question Countdown Timer & In-Game Thinking Music
  useEffect(() => {
    if (gameState !== 'QUESTION') {
      sound.stopThinkingMusic();
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    if (timerRef.current) clearInterval(timerRef.current);

    // Start in-game rhythmic thinking groove
    sound.startThinkingMusic();

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          sound.stopThinkingMusic();
          socket.emit('host:show-results', { pin: pinRef.current });
          return 0;
        }
        if (prev <= 6) {
          sound.playTickTock(true);
          sound.playHeartbeat();
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      sound.stopThinkingMusic();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState, currentQIndex, socket]);

  // Peer Discussion Timer
  useEffect(() => {
    if (peerDiscussActive && peerDiscussTime > 0) {
      discussTimerRef.current = setInterval(() => {
        setPeerDiscussTime((prev) => {
          if (prev <= 1) {
            clearInterval(discussTimerRef.current);
            setPeerDiscussActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (discussTimerRef.current) clearInterval(discussTimerRef.current);
    };
  }, [peerDiscussActive, peerDiscussTime]);

  const handleStartGame = () => {
    sound.playClick();
    socket.emit('host:next-question', { pin: pinRef.current });
  };

  const handleShowResults = () => {
    socket.emit('host:show-results', { pin: pinRef.current });
  };

  const handleShowLeaderboard = () => {
    sound.playClick();
    socket.emit('host:show-leaderboard', { pin: pinRef.current });
  };

  const handleNextQuestion = () => {
    sound.playClick();
    socket.emit('host:next-question', { pin: pinRef.current });
  };

  const handleStartPeerDiscussion = () => {
    sound.playClick();
    setPeerDiscussActive(true);
    setPeerDiscussTime(45);
    socket.emit('host:peer-discuss', { pin: pinRef.current, duration: 45 });
  };

  const handleKickPlayer = (socketId) => {
    socket.emit('host:kick-player', { pin: pinRef.current, socketId });
  };

  const choiceIcons = ['▲', '◆', '●', '■'];
  const choiceColors = ['bg-[#e21b3c]', 'bg-[#1368ce]', 'bg-[#d89e00]', 'bg-[#26890c]'];

  // ==========================================
  // 1. LOBBY VIEW
  // ==========================================
  if (gameState === 'LOBBY') {
    return (
      <div className="min-h-screen flex flex-col justify-between p-4 sm:p-8 font-khmer bg-gradient-to-b from-[#2d0f5e] via-[#1a0538] to-[#0d021c]">
        {/* Top Bar */}
        <div className="flex items-center justify-between glass-panel p-4 rounded-2xl">
          <button
            onClick={onExit}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-2 transition-all"
          >
            <Home className="w-4 h-4" />
            <span>ចាកចេញ</span>
          </button>

          <div className="text-center">
            <h2 className="text-sm sm:text-base font-bold text-purple-200">{quiz.title}</h2>
            <span className="text-xs text-yellow-300 font-semibold bg-yellow-500/20 px-3 py-0.5 rounded-full border border-yellow-400/30">
              កម្រិត៖ {level === 'university' ? '🏛️ ឧត្តមសិក្សា' : level === 'highschool' ? '🎓 វិទ្យាល័យ' : level === 'primary' ? '👦 បឋមសិក្សា' : '🧑‍🎓 មធ្យមសិក្សា'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleFullscreen}
              className="bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-md"
              title="ពេញអេក្រង់ (Full Screen)"
            >
              {isFullscreen ? <Minimize className="w-4 h-4 text-cyan-300" /> : <Maximize className="w-4 h-4 text-cyan-300" />}
              <span className="hidden sm:inline">{isFullscreen ? 'បិទ Fullscreen' : 'ពេញអេក្រង់ (Full Screen)'}</span>
            </button>

            <div className="bg-white/10 px-4 py-2 rounded-xl flex items-center gap-2 text-white font-bold text-sm">
              <Users className="w-4 h-4 text-emerald-400" />
              <span>{players.length}{isFree ? '/5 (Free)' : ' នាក់ (Pro)'}</span>
            </div>
          </div>
        </div>

        {/* Center PIN & QR Banner */}
        <div className="max-w-4xl mx-auto w-full my-6 flex flex-col md:flex-row items-center justify-center gap-8 glass-panel p-8 sm:p-12 rounded-3xl border border-white/20 shadow-2xl shadow-purple-950/80 relative">
          
          {/* Network Toggle Button (Top Right of Banner) */}
          {publicJoinUrl && (
            <div className="absolute top-4 right-4 flex items-center bg-black/40 rounded-full p-1 border border-white/10 shadow-inner">
              <button
                onClick={() => { sound.playClick(); setUse4G(false); }}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                  !use4G ? 'bg-cyan-500 text-white shadow-md' : 'text-gray-400 hover:text-white'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-cyan-200 animate-pulse" />
                WiFi សាលា
              </button>
              <button
                onClick={() => { sound.playClick(); setUse4G(true); }}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                  use4G ? 'bg-fuchsia-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-fuchsia-200 animate-pulse" />
                4G (សិស្ស)
              </button>
            </div>
          )}

          {/* QR Code */}
          <div className="bg-white p-4 rounded-2xl shadow-2xl flex flex-col items-center gap-2 mt-4 md:mt-0">
            <QRCodeSVG 
              value={(use4G && publicJoinUrl) ? publicJoinUrl : (joinUrl || `${window.location.origin}/?pin=${pin}`)} 
              size={175} 
              level="M"
              includeMargin={true}
            />
            <span className={`text-[11px] font-bold tracking-tight ${use4G ? 'text-fuchsia-700' : 'text-cyan-700'}`}>
              Scan {use4G ? 'ដោយប្រើ 4G (ទូរស័ព្ទដៃ)' : 'តាម WiFi សាលា'}
            </span>
          </div>

          {/* PIN Display */}
          <div className="text-center md:text-left space-y-3">
            <p className="text-purple-200 text-sm font-semibold tracking-wider">
              ចូលតាម Browser: <br/>
              <span className={`font-bold underline ${use4G ? 'text-fuchsia-300' : 'text-cyan-300'} text-xs sm:text-sm break-all`}>
                {(use4G && publicJoinUrl) ? publicJoinUrl.split('?')[0] : (joinUrl ? joinUrl.split('?')[0] : window.location.host)}
              </span>
            </p>
            <div>
              <p className="text-sm font-bold text-gray-300 mb-1">លេខកូដ PIN ថ្នាក់រៀន</p>
              <div className="text-6xl sm:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-yellow-200 to-amber-500 drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] tracking-widest leading-none">
                {pin || '------'}
              </div>
            </div>
            <p className="text-xs text-purple-300/80">
              រង់ចាំសិស្សចូលរួម... ពេលគ្រប់ចំនួនសូមចុច "ចាប់ផ្តើម"
            </p>
          </div>
        </div>

        {/* Player Avatars Grid */}
        <div className="flex-1 max-w-5xl mx-auto w-full space-y-3">
          <div className="flex items-center justify-between text-xs text-purple-300 font-semibold px-2">
            <span>បញ្ជីឈ្មោះសិស្ស ({players.length}):</span>
            <span>(ចុចលើឈ្មោះដើម្បីដកចេញ)</span>
          </div>

          {players.length === 0 ? (
            <div className="text-center py-12 glass-card rounded-2xl border border-dashed border-white/20">
              <p className="text-sm text-purple-200/60 animate-pulse">កំពុងរង់ចាំសិស្សដំបូងចូលរួម...</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2.5 max-h-48 overflow-y-auto p-2">
              {players.map((p) => (
                <div
                  key={p.socketId}
                  onClick={() => handleKickPlayer(p.socketId)}
                  className="bg-white/10 hover:bg-red-500/30 border border-white/15 px-3.5 py-1.5 rounded-full text-xs font-bold text-white flex items-center gap-2 cursor-pointer transition-all hover:scale-105"
                  title="ចុចដើម្បីដកចេញ (Kick)"
                >
                  <span className="text-base">{p.avatar || '🐱'}</span>
                  <span>{p.nickname}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Shuffle Notice */}
        {shuffleNotice && (
          <div className="max-w-md mx-auto w-full bg-emerald-500/20 border border-emerald-400/50 p-2.5 rounded-2xl text-center text-emerald-300 text-xs font-bold animate-bounce-short">
            ✨ {shuffleNotice}
          </div>
        )}

        {/* Start Game Action */}
        <div className="max-w-md mx-auto w-full pt-2 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={handleShuffleQuiz}
            className="w-full py-2.5 px-4 rounded-2xl font-bold text-xs bg-purple-600/40 hover:bg-purple-600/70 border border-purple-400/30 text-yellow-300 flex items-center justify-center gap-2 transition-all hover:scale-105"
            title="ច្របល់លំដាប់សំណួរ និងទីតាំងជម្រើសចម្លើយទាំងអស់ដោយចៃដន្យមុនពេលចាប់ផ្តើម"
          >
            <Shuffle className="w-4 h-4" />
            <span>🔀 ច្របល់វិញ្ញាសា & ចម្លើយ (Shuffle Quiz)</span>
          </button>

          <button
            onClick={handleStartGame}
            disabled={players.length === 0}
            className={`w-full py-4 rounded-2xl font-extrabold text-base sm:text-lg flex items-center justify-center gap-3 shadow-2xl transition-all ${
              players.length > 0
                ? 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white shadow-emerald-950/60 hover:scale-105 active:scale-95'
                : 'bg-gray-700 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Play className="w-6 h-6 fill-current" />
            <span>ចាប់ផ្តើមការប្រកួត ({players.length} នាក់)</span>
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // 2. QUESTION SCREEN
  // ==========================================
  if (gameState === 'QUESTION' && currentQuestion) {
    const isEveryoneDone = (totalAnswered >= players.length && players.length > 0) || allAnswered;

    return (
      <div className="min-h-screen flex flex-col justify-between p-4 sm:p-8 font-khmer bg-[#190432]">
        {/* Top Info Bar */}
        <div className="flex items-center justify-between glass-panel px-6 py-3 rounded-2xl">
          <span className="text-sm font-bold text-purple-200">
            សំណួរទី {currentQIndex + 1} នៃ {quiz.questions.length}
          </span>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleFullscreen}
              className="bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all"
              title="ពេញអេក្រង់ (Full Screen)"
            >
              {isFullscreen ? <Minimize className="w-3.5 h-3.5 text-cyan-300" /> : <Maximize className="w-3.5 h-3.5 text-cyan-300" />}
              <span className="hidden sm:inline">{isFullscreen ? 'បិទ Fullscreen' : 'ពេញអេក្រង់'}</span>
            </button>

            <span className={`text-xs px-3.5 py-1.5 rounded-full font-bold transition-all ${
              isEveryoneDone
                ? 'bg-emerald-500 text-white shadow-lg animate-pulse'
                : 'bg-purple-600/80 text-white'
            }`}>
              ឆ្លើយរួច៖ {totalAnswered} / {players.length} {isEveryoneDone && '✅ (គ្រប់គ្នា)'}
            </span>
            <button
              type="button"
              onClick={handleShowResults}
              className={`px-4 py-2 rounded-xl flex items-center gap-1.5 text-xs font-bold transition-all shadow-lg ${
                isEveryoneDone || timeLeft === 0
                  ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-500 text-black font-black ring-4 ring-yellow-400/50 hover:scale-105 animate-pulse'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <SkipForward className="w-4 h-4" />
              <span>{isEveryoneDone || timeLeft === 0 ? '👉 បង្ហាញចម្លើយឥឡូវនេះ' : 'បង្ហាញចម្លើយ'}</span>
            </button>
          </div>
        </div>

        {/* Prompt when all students finished */}
        {isEveryoneDone && (
          <div className="max-w-xl mx-auto w-full bg-emerald-500/20 border border-emerald-400/50 p-3 rounded-2xl text-center text-emerald-300 text-xs sm:text-sm font-bold animate-bounce-short shadow-xl">
            🎉 សិស្សទាំងអស់បានឆ្លើយរួចរាល់ហើយ! លោកគ្រូអាចចុចប៊ូតុង <b>[👉 បង្ហាញចម្លើយឥឡូវនេះ]</b> ដើម្បីពិភាក្សា និងបន្តទៅសំណួរបន្ទាប់។
          </div>
        )}

        {/* Question Title & Media */}
        <div className="max-w-5xl mx-auto w-full my-auto text-center space-y-6">
          <div className="glass-panel p-6 sm:p-10 rounded-3xl border border-white/20 shadow-2xl flex flex-col items-center gap-4">
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white leading-snug">
              {currentQuestion.question}
            </h1>
            {currentQuestion.image && (
              <img src={currentQuestion.image} alt="Question Context" className="max-h-64 object-contain rounded-xl border border-white/20 mt-4 shadow-lg bg-black/40" />
            )}
          </div>

          {/* Countdown Ring & Answered Counter */}
          <div className="flex items-center justify-center gap-8">
            <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 flex items-center justify-center shadow-xl shadow-purple-950/80 transition-all ${
              timeLeft <= 5 ? 'bg-red-600/80 border-red-400 animate-pulse-fast' : 'bg-purple-700/60 border-yellow-400 animate-pulse-fast'
            }`}>
              <span className="text-3xl sm:text-4xl font-black text-white font-['Outfit']">
                {timeLeft}
              </span>
            </div>
          </div>
        </div>

        {/* 4 Choices Grid or Fill Blank / Matching Info */}
        {currentQuestion.type === 'fill_blank' ? (
          <div className="max-w-3xl mx-auto w-full glass-panel p-8 rounded-3xl text-center space-y-4 border border-cyan-500/30 bg-cyan-950/20 shadow-2xl">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/20 text-cyan-300 text-sm font-bold">
              ✍️ សំណួរបំពេញចន្លោះ (Fill in the Blank)
            </div>
            <p className="text-lg sm:text-xl font-medium text-white/90">
              សិស្សកំពុងវាយបញ្ចូលចម្លើយនៅលើទូរសព្ទ ឬឧបករណ៍ផ្ទាល់ខ្លួន...
            </p>
            <div className="flex justify-center items-center gap-2 text-cyan-400/80 text-sm animate-pulse">
              <Sparkles className="w-4 h-4" />
              <span>ប្រព័ន្ធនឹងពិនិត្យអក្ខរាវិរុទ្ធដោយស្វ័យប្រវត្តិ</span>
            </div>
          </div>
        ) : currentQuestion.type === 'matching' ? (
          <div className="max-w-4xl mx-auto w-full glass-panel p-6 sm:p-8 rounded-3xl text-center space-y-5 border border-indigo-500/30 bg-indigo-950/20 shadow-2xl">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/20 text-indigo-300 text-sm font-bold">
              🧩 ល្បែងផ្គូផ្គង (Matching Pairs Puzzle)
            </div>
            <p className="text-base sm:text-lg font-medium text-white/90">
              សិស្សកំពុងផ្គូផ្គងធាតុឆ្វេង និងស្ដាំឱ្យត្រូវគ្នានៅលើទូរសព្ទ...
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              {(currentQuestion.pairs || []).map((p, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-white/10 border border-white/20 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-xs flex items-center justify-center">{idx + 1}</span>
                  <span className="truncate">{p.left}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(currentQuestion.options || []).map((opt, idx) => (
              <div
                key={idx}
                className={`${choiceColors[idx]} p-5 sm:p-6 rounded-2xl text-white font-bold text-base sm:text-lg flex items-center gap-4 shadow-xl shadow-black/30 border border-white/20`}
              >
                <span className="w-9 h-9 rounded-xl bg-black/30 flex items-center justify-center text-xl font-bold font-['Outfit']">
                  {choiceIcons[idx]}
                </span>
                <span className="flex-1">{opt}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // 3. RESULTS & EXPLANATION SCREEN
  // ==========================================
  if (gameState === 'RESULT' && currentQuestion) {
    const distribution = resultData?.answersDistribution || [0, 0, 0, 0];
    const maxVal = Math.max(...distribution, 1);
    const isLastQuestion = currentQIndex >= quiz.questions.length - 1;

    return (
      <div className="min-h-screen flex flex-col justify-between p-4 sm:p-8 font-khmer bg-[#190432]">
        {/* Top Header */}
        <div className="flex items-center justify-between glass-panel px-6 py-3 rounded-2xl">
          <span className="text-sm font-bold text-purple-200">
            លទ្ធផលសំណួរទី {currentQIndex + 1} នៃ {quiz.questions.length} {isLastQuestion && '🏁 (សំណួរចុងក្រោយ)'}
          </span>
          
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleFullscreen}
              className="bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all"
              title="ពេញអេក្រង់ (Full Screen)"
            >
              {isFullscreen ? <Minimize className="w-3.5 h-3.5 text-cyan-300" /> : <Maximize className="w-3.5 h-3.5 text-cyan-300" />}
              <span className="hidden sm:inline">{isFullscreen ? 'បិទ Fullscreen' : 'ពេញអេក្រង់'}</span>
            </button>

            {level === 'university' && (
              <button
                type="button"
                onClick={handleStartPeerDiscussion}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-lg transition-all"
              >
                <MessageSquare className="w-4 h-4" />
                <span>👥 Peer Discussion & Re-poll</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleShowLeaderboard}
              className={`text-xs font-bold px-5 py-2 rounded-xl flex items-center gap-1.5 shadow-lg hover:scale-105 transition-all ${
                isLastQuestion
                  ? 'bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 text-black font-black shadow-yellow-950/60'
                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white'
              }`}
            >
              <span>{isLastQuestion ? '🏆 បង្ហាញតារាងពិន្ទុចុងក្រោយ' : 'តារាងពិន្ទុ (Leaderboard)'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Peer Discussion Active Banner */}
        {peerDiscussActive && (
          <div className="max-w-4xl mx-auto w-full bg-indigo-600/90 text-white p-4 rounded-2xl text-center space-y-1 shadow-2xl animate-bounce-short">
            <h3 className="text-base font-bold">👥 ម៉ោងពិភាក្សាជាក្រុម (Peer Discussion Mode)</h3>
            <p className="text-xs text-indigo-100">
              សូមនិស្សិតពិភាក្សាគ្នាជាមួយមិត្តរួមថ្នាក់ជុំវិញចម្លើយនេះ (នៅសល់ {peerDiscussTime} វិនាទី)
            </p>
          </div>
        )}

        {/* Question Review & Explanation */}
        <div className="max-w-4xl mx-auto w-full space-y-4 text-center my-auto">
          <div className="glass-panel p-5 rounded-2xl flex flex-col items-center gap-3">
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              {currentQuestion.question}
            </h2>
            {currentQuestion.image && (
              <img src={currentQuestion.image} alt="Question Context" className="max-h-40 object-contain rounded-xl border border-white/20 shadow-md bg-black/40" />
            )}
          </div>

          {/* Fill Blank Results View */}
          {currentQuestion.type === 'fill_blank' ? (
            <div className="glass-panel p-6 rounded-2xl space-y-4 border border-cyan-500/30 bg-cyan-950/20">
              <div className="flex items-center justify-center gap-2 text-cyan-300 font-bold text-base">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>ចម្លើយត្រឹមត្រូវដែលប្រព័ន្ធទទួលស្គាល់ (Accepted Answers)៖</span>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {(resultData?.acceptedAnswers || currentQuestion.acceptedAnswers || []).map((ans, idx) => (
                  <span
                    key={idx}
                    className="px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-400 text-emerald-300 font-bold text-sm shadow-md"
                  >
                    ✓ {ans}
                  </span>
                ))}
              </div>
            </div>
          ) : currentQuestion.type === 'matching' ? (
            /* Matching Results View */
            <div className="glass-panel p-6 rounded-2xl space-y-4 border border-indigo-500/30 bg-indigo-950/20">
              <div className="flex items-center justify-center gap-2 text-indigo-300 font-bold text-base">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>គូផ្គូផ្គងត្រឹមត្រូវ (Correct Matching Pairs)៖</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto text-left">
                {(resultData?.pairs || currentQuestion.pairs || []).map((pair, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-white/10 border border-white/20 flex items-center justify-between text-sm shadow-md"
                  >
                    <span className="font-bold text-cyan-300 truncate">{pair.left}</span>
                    <ArrowRight className="w-4 h-4 text-amber-400 shrink-0 mx-2" />
                    <span className="font-bold text-emerald-300 truncate">{pair.right}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Standard Multiple Choice / True-False Bar Chart */
            <div className={`grid ${currentQuestion.options?.length === 2 ? 'grid-cols-2 max-w-xl mx-auto' : 'grid-cols-4'} gap-4 h-44 items-end glass-panel p-6 rounded-2xl`}>
              {(currentQuestion.options || []).map((opt, idx) => {
                const count = distribution[idx] || 0;
                const isCorrect = idx === resultData?.correctIndex;
                const heightPercent = Math.round((count / maxVal) * 100);

                return (
                  <div key={idx} className="flex flex-col items-center gap-2 h-full justify-end">
                    <span className="text-sm font-bold text-white">{count} នាក់</span>
                    <div
                      style={{ height: `${Math.max(heightPercent, 12)}%` }}
                      className={`w-full max-w-[70px] rounded-t-xl transition-all duration-700 flex items-center justify-center ${choiceColors[idx]} ${
                        isCorrect ? 'ring-4 ring-yellow-400 shadow-xl' : 'opacity-60'
                      }`}
                    >
                      {isCorrect && <CheckCircle2 className="w-6 h-6 text-white" />}
                    </div>
                    <span className="text-xs font-bold text-gray-300 font-['Outfit']">{choiceIcons[idx]}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Explanation Box */}
          {resultData?.explanation && (
            <div className="glass-panel p-4 rounded-2xl text-left border-l-4 border-emerald-400 bg-emerald-950/20">
              <span className="text-xs font-bold text-emerald-400 block mb-1">💡 ការពន្យល់អំពីចម្លើយត្រឹមត្រូវ៖</span>
              <p className="text-xs sm:text-sm text-purple-100/90 leading-relaxed">
                {resultData.explanation}
              </p>
            </div>
          )}
        </div>

        {/* Bottom Options List (Only for multiple choice & true_false) */}
        {(!currentQuestion.type || currentQuestion.type === 'multiple_choice' || currentQuestion.type === 'true_false') && (
          <div className="max-w-4xl mx-auto w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(currentQuestion.options || []).map((opt, idx) => {
              const isCorrect = idx === resultData?.correctIndex;
              return (
                <div
                  key={idx}
                  className={`p-3.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-3 transition-all ${
                    isCorrect
                      ? `${choiceColors[idx]} text-white ring-2 ring-yellow-400`
                      : 'bg-white/5 text-gray-400 opacity-50'
                  }`}
                >
                  <span>{choiceIcons[idx]}</span>
                  <span className="flex-1">{opt}</span>
                  {isCorrect && <CheckCircle2 className="w-4 h-4 text-yellow-300" />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // 4. LEADERBOARD SCREEN
  // ==========================================
  if (gameState === 'LEADERBOARD') {
    const isLastQuestion = currentQIndex >= quiz.questions.length - 1;

    return (
      <div className="min-h-screen flex flex-col justify-between p-4 sm:p-8 font-khmer bg-gradient-to-b from-[#2d0f5e] via-[#1a0538] to-[#0d021c]">
        <div className="flex items-center justify-between glass-panel px-6 py-3 rounded-2xl">
          <span className="text-sm font-bold text-purple-200">
            {isLastQuestion ? '🏁 តារាងពិន្ទុផ្លូវការចុងក្រោយ' : 'តារាងពិន្ទុបច្ចុប្បន្ន'}
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleFullscreen}
              className="bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-md"
              title="ពេញអេក្រង់ (Full Screen)"
            >
              {isFullscreen ? <Minimize className="w-4 h-4 text-cyan-300" /> : <Maximize className="w-4 h-4 text-cyan-300" />}
              <span className="hidden sm:inline">{isFullscreen ? 'បិទ Fullscreen' : 'ពេញអេក្រង់'}</span>
            </button>

            <button
              type="button"
              onClick={handleNextQuestion}
              className={`text-xs font-bold px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-xl hover:scale-105 transition-all ${
                isLastQuestion
                  ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-500 text-black font-black text-sm shadow-yellow-950/60 animate-bounce'
                  : 'bg-gradient-to-r from-emerald-500 to-green-600 text-white'
              }`}
            >
              {isLastQuestion ? (
                <>
                  <Trophy className="w-5 h-5 text-amber-950 fill-current" />
                  <span>🎉 បង្ហាញវេទិកាជ័យលាភី (Show Grand Podium)</span>
                </>
              ) : (
                <>
                  <span>សំណួរបន្ទាប់</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Leaderboard Top 5 Cards */}
        <div className="max-w-2xl mx-auto w-full space-y-3 my-auto">
          <h2 className="text-3xl font-black text-center text-yellow-400 tracking-tight font-['Outfit'] mb-6">
            {isLastQuestion ? '🏆 FINAL SCORES 🏆' : 'TOP PLAYERS 🔥'}
          </h2>

          {leaderboard.length === 0 ? (
            <div className="text-center py-8 glass-panel rounded-2xl text-purple-200/70 text-sm">
              មិនទាន់មានពិន្ទុនៅឡើយទេ
            </div>
          ) : (
            leaderboard.map((p, idx) => (
              <div
                key={p.socketId || idx}
                className={`p-4 rounded-2xl flex items-center justify-between glass-card border transition-all animate-pop-in ${
                  idx === 0
                    ? 'bg-yellow-500/20 border-yellow-400/50 shadow-xl shadow-yellow-950/40'
                    : 'bg-white/10 border-white/10'
                }`}
                style={{ animationDelay: `${idx * 150}ms` }}
              >
                <div className="flex items-center gap-4">
                  <span className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center font-bold text-sm text-yellow-300 font-['Outfit']">
                    #{idx + 1}
                  </span>
                  <span className="text-2xl">{p.avatar || '🐱'}</span>
                  <span className="font-bold text-base text-white">{p.nickname}</span>
                </div>

                <div className="text-right">
                  <span className="font-extrabold text-xl text-yellow-300 font-['Outfit']">
                    {p.score?.toLocaleString() || 0}
                  </span>
                  <span className="text-xs text-purple-300 block">pts</span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="text-center text-xs text-purple-300/60 pb-2">
          សំណួរទី {currentQIndex + 1} នៃ {quiz.questions.length}
        </div>
      </div>
    );
  }

  // ==========================================
  // 5. GRAND PODIUM SCREEN (TOP 5 DANCING CHAMPIONS)
  // ==========================================
  if (gameState === 'PODIUM' && podiumData) {
    const all = podiumData.allPlayers || [];
    const top1 = podiumData.podium?.[0] || all[0];
    const top2 = podiumData.podium?.[1] || all[1];
    const top3 = podiumData.podium?.[2] || all[2];
    const top4 = all[3];
    const top5 = all[4];

    return (
      <div className="min-h-screen flex flex-col justify-between p-4 sm:p-8 font-khmer bg-gradient-to-b from-[#35106b] via-[#1e073b] to-[#0d021c]">
        <div className="flex items-center justify-between glass-panel px-6 py-3 rounded-2xl">
          <span className="text-sm font-bold text-yellow-300 flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-yellow-400" />
            <span>ជ័យលាភីចុងក្រោយ (Top 5 Grand Champions)</span>
          </span>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={exportToExcel}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-md hover:scale-105"
              title="ទាញយករបាយការណ៍ (Excel)"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">ទាញយក (Excel)</span>
            </button>

            <button
              type="button"
              onClick={toggleFullscreen}
              className="bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-md"
              title="ពេញអេក្រង់ (Full Screen)"
            >
              {isFullscreen ? <Minimize className="w-4 h-4 text-cyan-300" /> : <Maximize className="w-4 h-4 text-cyan-300" />}
              <span className="hidden sm:inline">{isFullscreen ? 'បិទ Fullscreen' : 'ពេញអេក្រង់'}</span>
            </button>

            <button
              type="button"
              onClick={onExit}
              className="bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all"
            >
              <Home className="w-4 h-4" />
              <span>ត្រឡប់ទៅទំព័រដើម</span>
            </button>
          </div>
        </div>

        {/* 3D Olympic Style Top 5 Grand Dancing Podium */}
        <div className="max-w-5xl mx-auto w-full my-auto space-y-6">
          <div className="text-center space-y-1">
            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              🎉 វេទិកាជ័យលាភីកំពូលទាំង ៥ 🎉
            </h1>
            <p className="text-xs sm:text-sm text-yellow-300 font-bold">
              សូមអបអរសាទរដល់សិស្សពូកែដែលមានពិន្ទុខ្ពស់ជាងគេប្រចាំវគ្គ! 👏
            </p>
          </div>

          <div className="flex items-end justify-center gap-2 sm:gap-4 md:gap-6 h-96 pt-6">
            {/* 4th Place (Star Runner-up) */}
            {top4 ? (
              <div className="flex flex-col items-center w-20 sm:w-28 md:w-36 animate-pop-in" style={{ animationDelay: '150ms' }}>
                <div className="text-3xl sm:text-4xl mb-1.5 animate-dance-wobble cursor-pointer" title="រាំអបអរ">
                  {top4.avatar || '🐼'}
                </div>
                <span className="text-[10px] sm:text-xs font-bold text-indigo-300 truncate max-w-full mb-0.5">🎖️ 4th Place</span>
                <span className="font-bold text-xs text-white truncate max-w-full mb-0.5">{top4.nickname}</span>
                <span className="text-[11px] text-yellow-300 font-black font-['Outfit'] mb-2">{top4.score} pts</span>
                <div className="w-full h-24 rounded-t-2xl podium-star flex flex-col items-center justify-center text-white font-black shadow-xl border-t border-indigo-400/40">
                  <span className="text-2xl font-['Outfit']">4</span>
                  <span className="text-[10px] uppercase font-bold text-indigo-200">Star</span>
                </div>
              </div>
            ) : (
              <div className="w-16 sm:w-24 opacity-10 flex flex-col items-center">
                <div className="w-full h-12 rounded-t-xl bg-white/10" />
              </div>
            )}

            {/* 2nd Place (Silver) */}
            {top2 ? (
              <div className="flex flex-col items-center w-24 sm:w-36 md:w-44 animate-pop-in" style={{ animationDelay: '350ms' }}>
                <div className="text-4xl sm:text-5xl mb-1.5 animate-dance-wobble cursor-pointer" title="រាំអបអរ">
                  {top2.avatar || '🥈'}
                </div>
                <span className="text-[11px] sm:text-xs font-bold text-gray-200 truncate max-w-full mb-0.5">🥈 2nd Place</span>
                <span className="font-bold text-xs sm:text-sm text-white truncate max-w-full mb-0.5">{top2.nickname}</span>
                <span className="text-xs text-purple-200 font-black font-['Outfit'] mb-2">{top2.score} pts</span>
                <div className="w-full h-44 rounded-t-2xl podium-2 flex flex-col items-center justify-center text-gray-900 font-black shadow-2xl border-t-2 border-white/60">
                  <span className="text-4xl font-['Outfit']">2</span>
                  <span className="text-xs uppercase font-extrabold">Silver</span>
                </div>
              </div>
            ) : (
              <div className="w-20 sm:w-32 opacity-20 flex flex-col items-center">
                <div className="w-full h-24 rounded-t-2xl bg-white/10" />
              </div>
            )}

            {/* 1st Place (Gold Champion) */}
            {top1 ? (
              <div className="flex flex-col items-center w-28 sm:w-44 md:w-56 animate-pop-in" style={{ animationDelay: '600ms' }}>
                <div className="relative flex flex-col items-center mb-1.5 cursor-pointer" title="ជើងឯកលេខ ១ រាំអបអរសាទរ">
                  <span className="text-2xl sm:text-3xl animate-crown-pulse mb-[-8px] z-10">👑</span>
                  <span className="text-5xl sm:text-7xl animate-dance-joy filter drop-shadow-[0_0_15px_rgba(255,215,0,0.6)]">
                    {top1.avatar || '🏆'}
                  </span>
                </div>
                <span className="text-xs sm:text-sm font-extrabold text-yellow-300 truncate max-w-full mb-0.5 flex items-center gap-1">
                  <span>🥇 Champion</span>
                </span>
                <span className="font-black text-xs sm:text-base text-white truncate max-w-full mb-0.5">{top1.nickname}</span>
                <span className="text-xs sm:text-sm text-yellow-300 font-black font-['Outfit'] mb-2">{top1.score} pts</span>
                <div className="w-full h-60 rounded-t-2xl podium-1 flex flex-col items-center justify-center text-amber-950 font-black shadow-2xl border-t-2 border-yellow-200">
                  <span className="text-6xl font-['Outfit'] font-black">1</span>
                  <span className="text-xs sm:text-sm uppercase font-black tracking-wider">CHAMPION</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-purple-200">មិនមានអ្នកចូលរួមប្រកួតឡើយ</p>
              </div>
            )}

            {/* 3rd Place (Bronze) */}
            {top3 ? (
              <div className="flex flex-col items-center w-24 sm:w-36 md:w-44 animate-pop-in" style={{ animationDelay: '250ms' }}>
                <div className="text-4xl sm:text-5xl mb-1.5 animate-dance-jump cursor-pointer" title="រាំអបអរ">
                  {top3.avatar || '🥉'}
                </div>
                <span className="text-[11px] sm:text-xs font-bold text-amber-200 truncate max-w-full mb-0.5">🥉 3rd Place</span>
                <span className="font-bold text-xs sm:text-sm text-white truncate max-w-full mb-0.5">{top3.nickname}</span>
                <span className="text-xs text-purple-200 font-black font-['Outfit'] mb-2">{top3.score} pts</span>
                <div className="w-full h-34 rounded-t-2xl podium-3 flex flex-col items-center justify-center text-amber-100 font-black shadow-2xl border-t border-amber-300/40">
                  <span className="text-3xl font-['Outfit']">3</span>
                  <span className="text-xs uppercase font-extrabold">Bronze</span>
                </div>
              </div>
            ) : (
              <div className="w-20 sm:w-32 opacity-20 flex flex-col items-center">
                <div className="w-full h-16 rounded-t-2xl bg-white/10" />
              </div>
            )}

            {/* 5th Place (Star Runner-up) */}
            {top5 ? (
              <div className="flex flex-col items-center w-20 sm:w-28 md:w-36 animate-pop-in" style={{ animationDelay: '100ms' }}>
                <div className="text-3xl sm:text-4xl mb-1.5 animate-dance-joy cursor-pointer" title="រាំអបអរ">
                  {top5.avatar || '🦁'}
                </div>
                <span className="text-[10px] sm:text-xs font-bold text-indigo-300 truncate max-w-full mb-0.5">🏅 5th Place</span>
                <span className="font-bold text-xs text-white truncate max-w-full mb-0.5">{top5.nickname}</span>
                <span className="text-[11px] text-yellow-300 font-black font-['Outfit'] mb-2">{top5.score} pts</span>
                <div className="w-full h-20 rounded-t-2xl podium-star flex flex-col items-center justify-center text-white font-black shadow-xl border-t border-indigo-400/40">
                  <span className="text-xl font-['Outfit']">5</span>
                  <span className="text-[10px] uppercase font-bold text-indigo-200">Star</span>
                </div>
              </div>
            ) : (
              <div className="w-16 sm:w-24 opacity-10 flex flex-col items-center">
                <div className="w-full h-10 rounded-t-xl bg-white/10" />
              </div>
            )}
          </div>

          {/* Full Player Scores Table */}
          {all && all.length > 0 && (
            <div className="max-w-3xl mx-auto w-full glass-panel p-4 rounded-2xl border border-white/15 space-y-2 mt-4 animate-pop-in">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold text-purple-200 uppercase tracking-wider">
                  តារាងចំណាត់ថ្នាក់សិស្សទាំងអស់ក្នុងបន្ទប់ ({all.length} នាក់)៖
                </h3>
                <span className="text-[11px] text-yellow-300 font-bold font-khmer">
                  Top 5 កំពុងរាំអបអរលើវេទិកា ☝️
                </span>
              </div>

              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {all.map((p, idx) => (
                  <div key={idx} className={`flex items-center justify-between p-2 rounded-xl text-xs transition-all ${
                    idx < 5 ? 'bg-purple-900/40 border border-purple-400/30 font-bold' : 'bg-white/5'
                  }`}>
                    <div className="flex items-center gap-2.5">
                      <span className="font-['Outfit'] font-bold text-yellow-400">
                        {idx === 0 ? '👑 #1' : idx === 1 ? '🥈 #2' : idx === 2 ? '🥉 #3' : idx === 3 ? '🎖️ #4' : idx === 4 ? '🏅 #5' : `#${idx + 1}`}
                      </span>
                      <span>{p.avatar || '🐱'}</span>
                      <span className="font-semibold text-white">{p.nickname}</span>
                    </div>
                    <span className="font-bold font-['Outfit'] text-yellow-300">{p.score} pts</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="text-center text-xs text-purple-300/60 pb-2">
          សូមអបអរសាទរដល់អ្នកឈ្នះ និងសិស្សទាំងអស់ដែលបានចូលរួម! 👏
        </div>
      </div>
    );
  }

  return null;
}
