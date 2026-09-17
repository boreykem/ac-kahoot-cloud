import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Flame, Trophy, Home, AlertCircle, Dices, Send, Link as LinkIcon, Check, Sparkles } from 'lucide-react';
import { sound } from '../utils/audioEngine';

export default function PlayerScreen({ socket, initialPin, onExit }) {
  const [pin, setPin] = useState(initialPin || '');
  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState('🐱');
  const [playerState, setPlayerState] = useState('JOIN'); // JOIN, LOBBY, QUESTION, ANSWERED, RESULT, PODIUM
  const [errorMessage, setErrorMessage] = useState('');
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState(null);
  const [resultData, setResultData] = useState(null);
  const [totalScore, setTotalScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [optionsCount, setOptionsCount] = useState(4);
  const [questionType, setQuestionType] = useState('multiple_choice');
  const [questionText, setQuestionText] = useState('');
  const [questionOptions, setQuestionOptions] = useState([]);
  const [questionImage, setQuestionImage] = useState(null);
  const [timeLeft, setTimeLeft] = useState(20);

  // New state for Fill in the Blank and Matching
  const [fillBlankInput, setFillBlankInput] = useState('');
  const [matchingLeft, setMatchingLeft] = useState([]);
  const [matchingRight, setMatchingRight] = useState([]);
  const [selectedLeftItem, setSelectedLeftItem] = useState(null);
  const [userMatches, setUserMatches] = useState({}); // { [left]: right }

  const avatars = ['🐱', '🐶', '🦊', '🦁', '🐯', '🐼', '🚀', '🎓', '👑', '🔥', '⚡', '💎'];

  useEffect(() => {
    if (!socket) return;

    socket.on('player:joined', (data) => {
      setPlayerState('LOBBY');
      setErrorMessage('');
      sound.playClick();
    });

    socket.on('player:error', (data) => {
      setErrorMessage(data.message);
      sound.playIncorrect();
    });

    socket.on('player:kicked', (data) => {
      alert(data.message || 'អ្នកត្រូវបានដកចេញពីបន្ទប់។');
      setPlayerState('JOIN');
    });

    socket.on('player:question-started', (data) => {
      setCurrentQIndex(data.questionIndex);
      setTotalQuestions(data.totalQuestions);
      setQuestionText(data.question || '');
      setQuestionOptions(data.options || []);
      setQuestionImage(data.image || null);
      setTimeLeft(data.timeLimit || 20);
      setOptionsCount(data.optionsCount || (data.type === 'true_false' ? 2 : (data.options ? data.options.length : 4)));
      setQuestionType(data.type || (data.optionsCount === 2 || (data.options && data.options.length === 2) ? 'true_false' : 'multiple_choice'));
      setSelectedChoice(null);
      setFillBlankInput('');
      setSelectedLeftItem(null);
      setUserMatches({});
      if (data.type === 'matching') {
        setMatchingLeft(data.leftItems || []);
        let rightItems = data.shuffledRightItems || [];
        // Client-side fallback if server sent unshuffled or identical order
        if (rightItems.length > 1 && data.leftItems && rightItems.length === data.leftItems.length) {
          // If rightItems identical to an aligned array, rotate by 1
          if (data.pairs && rightItems.every((r, i) => r === data.pairs[i]?.right)) {
            rightItems = [...rightItems.slice(1), rightItems[0]];
          }
        }
        setMatchingRight(rightItems);
      }
      setResultData(null);
      setPlayerState('QUESTION');
      sound.playCountdownTick();
    });

    socket.on('player:answer-result', (data) => {
      setResultData(data);
      setTotalScore(data.totalScore);
      setStreak(data.streak);
      setPlayerState('RESULT');

      if (data.isCorrect) {
        sound.playCorrect();
      } else {
        sound.playIncorrect();
      }
    });

    socket.on('game:leaderboard', () => {
      setPlayerState('LEADERBOARD');
    });

    socket.on('game:podium', () => {
      setPlayerState('PODIUM');
      sound.playFanfare();
    });

    socket.on('game:host-disconnected', (data) => {
      alert(data.message || 'Host បានចាកចេញពីបន្ទប់។');
      setPlayerState('JOIN');
    });

    return () => {
      socket.off('player:joined');
      socket.off('player:error');
      socket.off('player:kicked');
      socket.off('player:question-started');
      socket.off('player:answer-result');
      socket.off('game:leaderboard');
      socket.off('game:podium');
      socket.off('game:host-disconnected');
    };
  }, [socket]);

  const generateRandomNickname = () => {
    const adjectives = ['ឆ្លាតវៃ', 'លឿនស្លេវ', 'ក្លាហាន', 'គួរឱ្យស្រឡាញ់', 'រហ័សរហួន', 'រួសរាយ', 'ខ្លាំងពូកែ', 'ចិត្តល្អ'];
    const animals = ['ខ្លាឃ្មុំ', 'ទន្សាយ', 'ដំរី', 'សត្វតោ', 'ឆ្មា', 'ឆ្កែ', 'សត្វឥន្ទ្រី', 'ផ្សោត'];
    const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomAnimal = animals[Math.floor(Math.random() * animals.length)];
    setNickname(`${randomAnimal}${randomAdj}`);
    sound.playClick();
  };

  const handleJoin = (e) => {
    e.preventDefault();
    if (!pin.trim() || !nickname.trim()) {
      setErrorMessage('សូមបញ្ចូល Game PIN និង ឈ្មោះរបស់អ្នក!');
      return;
    }
    setErrorMessage('');
    socket.emit('player:join', { pin, nickname, avatar });
  };

  const handleSelectChoice = (idx) => {
    if (selectedChoice !== null || playerState !== 'QUESTION') return;
    setSelectedChoice(idx);
    setPlayerState('ANSWERED');
    sound.playAnswerLockIn();
    socket.emit('player:submit-answer', { pin, choiceIndex: idx });
  };

  const handleSubmitFillBlank = (e) => {
    if (e) e.preventDefault();
    if (!fillBlankInput.trim() || playerState !== 'QUESTION') return;
    setPlayerState('ANSWERED');
    sound.playAnswerLockIn();
    socket.emit('player:submit-answer', { pin, answerText: fillBlankInput.trim() });
  };

  const handleSelectLeft = (leftItem) => {
    sound.playClick();
    if (selectedLeftItem === leftItem) {
      setSelectedLeftItem(null);
    } else {
      setSelectedLeftItem(leftItem);
    }
  };

  const handleSelectRight = (rightItem) => {
    if (!selectedLeftItem) {
      sound.playClick();
      return;
    }
    sound.playClick();
    const newMatches = { ...userMatches };
    for (const [l, r] of Object.entries(newMatches)) {
      if (r === rightItem) delete newMatches[l];
    }
    newMatches[selectedLeftItem] = rightItem;
    setUserMatches(newMatches);
    setSelectedLeftItem(null);
  };

  const handleRemoveMatch = (leftItem) => {
    sound.playClick();
    const newMatches = { ...userMatches };
    delete newMatches[leftItem];
    setUserMatches(newMatches);
  };

  const handleSubmitMatching = () => {
    if (playerState !== 'QUESTION') return;
    setPlayerState('ANSWERED');
    sound.playAnswerLockIn();
    socket.emit('player:submit-answer', { pin, matches: userMatches });
  };

  const choiceButtons = [
    { icon: '▲', color: 'btn-red', bg: 'bg-[#e21b3c]' },
    { icon: '◆', color: 'btn-blue', bg: 'bg-[#1368ce]' },
    { icon: '●', color: 'btn-yellow', bg: 'bg-[#d89e00]' },
    { icon: '■', color: 'btn-green', bg: 'bg-[#26890c]' },
  ];

  // Question Timer Countdown for Student
  useEffect(() => {
    if (playerState !== 'QUESTION') return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [playerState, currentQIndex]);

  // ==========================================
  // 1. JOIN SCREEN
  // ==========================================
  if (playerState === 'JOIN') {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center p-4 sm:p-6 font-khmer bg-gradient-to-b from-[#2d0f5e] via-[#1a0538] to-[#0d021c]">
        <div className="max-w-md w-full glass-panel p-6 sm:p-8 rounded-3xl border border-white/20 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-[#e21b3c] via-[#1368ce] to-[#26890c] flex items-center justify-center text-white font-black text-2xl shadow-xl">
              AC
            </div>
            <h1 className="text-2xl font-black text-white font-['Outfit']">Kahoot<span className="text-yellow-400">!</span> Join</h1>
            <p className="text-xs text-purple-200/80">បញ្ចូល Game PIN ដើម្បីចូលលេងក្នុងថ្នាក់</p>
          </div>

          {errorMessage && (
            <div className="bg-red-500/20 border border-red-500/50 p-3 rounded-xl flex items-center gap-2 text-red-200 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleJoin} className="space-y-4">
            {/* PIN Input */}
            <div>
              <label className="block text-xs font-semibold text-purple-200 mb-1">Game PIN</label>
              <input
                type="text"
                pattern="[0-9]*"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="ឧ. 123456"
                className="w-full bg-black/40 border border-white/20 rounded-2xl px-4 py-3.5 text-center text-2xl sm:text-3xl font-black tracking-widest text-yellow-300 placeholder-purple-400/40 focus:outline-none focus:border-yellow-400 transition-all font-['Outfit']"
              />
            </div>

            {/* Nickname Input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-purple-200">ឈ្មោះរបស់អ្នក (Nickname)</label>
                <button
                  type="button"
                  onClick={generateRandomNickname}
                  className="text-[10px] flex items-center gap-1 bg-white/10 hover:bg-white/20 text-yellow-300 px-2 py-0.5 rounded-lg transition-all"
                  title="បង្កើតឈ្មោះចៃដន្យ (Random Name)"
                >
                  <Dices className="w-3 h-3" />
                  ចាប់ឈ្មោះ
                </button>
              </div>
              <input
                type="text"
                maxLength={20}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="ឧ. សុខា, Dara..."
                className="w-full bg-black/40 border border-white/20 rounded-2xl px-4 py-3 text-center text-base font-bold text-white placeholder-purple-400/40 focus:outline-none focus:border-purple-400 transition-all font-khmer"
              />
            </div>

            {/* Avatar Selector */}
            <div>
              <label className="block text-xs font-semibold text-purple-200 mb-2">ជ្រើសរើសរូបតំណាង (Avatar)</label>
              <div className="grid grid-cols-6 gap-2">
                {avatars.map((av) => (
                  <button
                    key={av}
                    type="button"
                    onClick={() => { sound.playClick(); setAvatar(av); }}
                    className={`h-11 rounded-xl flex items-center justify-center text-xl transition-all ${
                      avatar === av
                        ? 'bg-yellow-400 scale-110 shadow-lg ring-2 ring-white'
                        : 'bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-extrabold text-base shadow-xl shadow-emerald-950/60 hover:scale-105 active:scale-95 transition-all"
            >
              ចូលរួមលេង (Enter)
            </button>
          </form>

          <button
            onClick={onExit}
            className="w-full text-center text-xs text-purple-300 hover:text-white flex items-center justify-center gap-1 pt-2"
          >
            <Home className="w-3.5 h-3.5" />
            <span>ត្រឡប់ទៅទំព័រដើម</span>
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // 2. LOBBY WAITING SCREEN
  // ==========================================
  if (playerState === 'LOBBY') {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center p-6 font-khmer bg-gradient-to-b from-[#2d0f5e] via-[#1a0538] to-[#0d021c] text-center space-y-6">
        <div className="glass-panel p-8 sm:p-12 rounded-3xl border border-white/20 shadow-2xl max-w-sm w-full space-y-6 animate-pop-in">
          <div className="w-24 h-24 mx-auto rounded-full bg-yellow-400/20 border-4 border-yellow-400 flex items-center justify-center text-5xl shadow-xl animate-bounce">
            {avatar}
          </div>

          <div>
            <h2 className="text-2xl font-black text-white">{nickname}</h2>
            <p className="text-xs text-yellow-300 font-semibold mt-1">PIN: {pin}</p>
          </div>

          <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
            <p className="text-xs text-purple-200 animate-pulse font-medium">
              អ្នកបានចូលរួមជោគជ័យ! <br />
              សូមរង់ចាំគ្រូចាប់ផ្តើមសំណួរលើផ្ទាំងធំ...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // 3. ACTIVE QUESTION SCREEN (RECTANGLES WITH TEXT)
  // ==========================================
  if (playerState === 'QUESTION') {
    return (
      <div className="min-h-screen flex flex-col justify-between p-3 sm:p-5 font-khmer bg-[#140228]">
        {/* Player Header with Points & Countdown Timer */}
        <div className="flex items-center justify-between glass-panel px-3.5 py-2 rounded-2xl gap-2">
          <div className="flex items-center gap-2 truncate">
            <span className="text-xl shrink-0">{avatar}</span>
            <span className="text-xs font-bold text-white truncate max-w-[100px] sm:max-w-[150px]">{nickname}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {streak > 1 && (
              <span className="flex items-center gap-1 bg-orange-500/30 px-2 py-0.5 rounded-full border border-orange-400/40 text-xs text-yellow-300 font-['Outfit']">
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                <span>{streak}</span>
              </span>
            )}
            <span className="px-2 py-0.5 rounded-lg bg-purple-950/80 border border-purple-400/30 text-[11px] font-bold text-purple-200 font-['Outfit']">
              {currentQIndex + 1}/{totalQuestions}
            </span>
            <span className={`px-2 py-0.5 rounded-lg font-black text-xs font-['Outfit'] transition-all ${
              timeLeft <= 5 ? 'bg-red-600 text-white animate-pulse' : 'bg-yellow-400 text-black'
            }`}>
              ⏱️ {timeLeft}s
            </span>
          </div>
        </div>

        {/* Question Text Box on Mobile */}
        {questionText && (
          <div className="glass-panel px-4 py-2.5 rounded-2xl text-center my-1.5 text-xs sm:text-sm font-bold text-white leading-relaxed line-clamp-3 border border-white/15 bg-black/40 shadow-md">
            {questionText}
          </div>
        )}

        {/* Dynamic Question Body by Type */}
        {questionType === 'fill_blank' ? (
          /* Fill-in-the-Blank Mobile Screen */
          <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full my-auto space-y-4 px-1">
            <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-amber-400/30 bg-black/60 shadow-2xl space-y-4">
              <label className="block text-xs sm:text-sm font-bold text-amber-200 text-center font-khmer flex items-center justify-center gap-1.5">
                <span>✍️ វាយបញ្ចូលចម្លើយរបស់អ្នកខាងក្រោម៖</span>
              </label>

              <form onSubmit={handleSubmitFillBlank} className="space-y-4">
                <input
                  type="text"
                  autoFocus
                  value={fillBlankInput}
                  onChange={(e) => setFillBlankInput(e.target.value)}
                  placeholder="វាយចម្លើយនៅទីនេះ..."
                  className="w-full bg-white/10 border-2 border-amber-400/50 focus:border-amber-400 rounded-2xl py-3.5 px-4 text-center text-base sm:text-xl font-black text-white placeholder-white/40 focus:outline-none font-khmer shadow-inner transition-all"
                />

                <button
                  type="submit"
                  disabled={!fillBlankInput.trim()}
                  className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-40 disabled:pointer-events-none text-black font-black text-base font-khmer shadow-xl flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <Send className="w-5 h-5" />
                  <span>👉 បញ្ជូនចម្លើយ (Submit Answer)</span>
                </button>
              </form>
            </div>
          </div>
        ) : questionType === 'matching' ? (
          /* Matching Pairs Mobile Screen (Tap to Match) */
          <div className="flex-1 flex flex-col justify-between max-w-xl mx-auto w-full my-auto space-y-3 px-1">
            <div className="text-center">
              <p className="text-[11px] sm:text-xs text-cyan-200 font-bold bg-cyan-950/60 border border-cyan-400/30 px-3 py-1.5 rounded-full inline-block">
                {selectedLeftItem ? `👉 ចុចជ្រើសរើសចម្លើយខាងស្តាំដែលត្រូវនឹង «${selectedLeftItem}»` : '👉 ចុចលើពាក្យខាងឆ្វេង រួចចុចលើពាក្យខាងស្តាំដើម្បីផ្គូផ្គង៖'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:gap-4 flex-1">
              {/* Left Items Column */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-cyan-300 block text-center">សំណួរ (ឆ្វេង)</span>
                {matchingLeft.map((item, idx) => {
                  const isSelected = selectedLeftItem === item;
                  const isMatched = !!userMatches[item];
                  const pairIdx = Object.keys(userMatches).indexOf(item);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectLeft(item)}
                      className={`w-full p-2.5 sm:p-3 rounded-2xl border text-xs sm:text-sm font-bold font-khmer text-left transition-all flex items-center justify-between gap-1.5 shadow-md ${
                        isSelected
                          ? 'border-yellow-400 bg-yellow-400/30 text-yellow-200 scale-105 ring-2 ring-yellow-400 animate-pulse'
                          : isMatched
                          ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200'
                          : 'border-white/15 bg-white/10 text-white hover:bg-white/15'
                      }`}
                    >
                      <span className="truncate">{item}</span>
                      {isMatched && (
                        <span className="text-[10px] bg-emerald-500 text-black px-1.5 py-0.5 rounded-md font-black shrink-0">
                          #{pairIdx + 1}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Right Items Column */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-teal-300 block text-center">ចម្លើយ (ស្តាំ)</span>
                {matchingRight.map((rItem, rIdx) => {
                  const matchedLeft = Object.keys(userMatches).find(l => userMatches[l] === rItem);
                  const isMatched = !!matchedLeft;
                  const pairIdx = matchedLeft ? Object.keys(userMatches).indexOf(matchedLeft) : -1;
                  return (
                    <button
                      key={rIdx}
                      type="button"
                      onClick={() => handleSelectRight(rItem)}
                      className={`w-full p-2.5 sm:p-3 rounded-2xl border text-xs sm:text-sm font-bold font-khmer text-left transition-all flex items-center justify-between gap-1.5 shadow-md ${
                        isMatched
                          ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200'
                          : selectedLeftItem
                          ? 'border-teal-400/60 bg-teal-500/15 text-white hover:bg-teal-500/30 hover:scale-105'
                          : 'border-white/15 bg-white/10 text-white'
                      }`}
                    >
                      <span className="truncate">{rItem}</span>
                      {isMatched && (
                        <span
                          onClick={(e) => { e.stopPropagation(); handleRemoveMatch(matchedLeft); }}
                          className="text-[10px] bg-emerald-500 hover:bg-red-500 text-black hover:text-white px-1.5 py-0.5 rounded-md font-black shrink-0 transition-colors"
                          title="ចុចដើម្បីដោះគូនេះ"
                        >
                          #{pairIdx + 1} ✕
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleSubmitMatching}
                disabled={Object.keys(userMatches).length === 0}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 disabled:opacity-40 disabled:pointer-events-none text-black font-black text-sm font-khmer shadow-xl flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>🔒 បញ្ជាក់ការផ្គូផ្គង ({Object.keys(userMatches).length}/{matchingLeft.length} គូ)</span>
              </button>
            </div>
          </div>
        ) : optionsCount === 2 || questionType === 'true_false' ? (
          /* True / False Screen */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 my-auto h-[65vh]">
            <button
              onClick={() => handleSelectChoice(0)}
              className="bg-[#e21b3c] btn-red btn-3d rounded-3xl flex flex-col items-center justify-center text-white shadow-2xl transition-all gap-2 p-5"
            >
              <span className="text-5xl sm:text-7xl font-black font-['Outfit']">▲</span>
              <span className="text-xl sm:text-2xl font-extrabold font-khmer text-center">
                {questionOptions[0] || 'ត្រូវ (True)'}
              </span>
            </button>

            <button
              onClick={() => handleSelectChoice(1)}
              className="bg-[#1368ce] btn-blue btn-3d rounded-3xl flex flex-col items-center justify-center text-white shadow-2xl transition-all gap-2 p-5"
            >
              <span className="text-5xl sm:text-7xl font-black font-['Outfit']">◆</span>
              <span className="text-xl sm:text-2xl font-extrabold font-khmer text-center">
                {questionOptions[1] || 'ខុស (False)'}
              </span>
            </button>
          </div>
        ) : (
          /* Multiple Choice 4 Screen */
          <div className="grid grid-cols-2 gap-2.5 sm:gap-4 my-auto h-[65vh]">
            {choiceButtons.map((btn, idx) => {
              const optText = questionOptions[idx];
              return (
                <button
                  key={idx}
                  onClick={() => handleSelectChoice(idx)}
                  className={`${btn.bg} ${btn.color} btn-3d rounded-2xl sm:rounded-3xl flex flex-col items-center justify-center text-white shadow-2xl transition-all p-3 sm:p-4 gap-1.5`}
                >
                  <span className="text-3xl sm:text-5xl font-black font-['Outfit']">{btn.icon}</span>
                  {optText && (
                    <span className="text-xs sm:text-sm md:text-base font-extrabold font-khmer text-center line-clamp-3 leading-snug break-words px-1">
                      {optText}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // 4. ANSWERED / WAITING RESULT SCREEN
  // ==========================================
  if (playerState === 'ANSWERED') {
    const chosen = choiceButtons[selectedChoice] || choiceButtons[0];
    const chosenText = questionType === 'fill_blank' 
      ? fillBlankInput 
      : questionType === 'matching' 
      ? `បានផ្គូផ្គង ${Object.keys(userMatches).length} គូ` 
      : (questionOptions[selectedChoice] || chosen.icon);

    return (
      <div className="min-h-screen flex flex-col justify-center items-center p-6 font-khmer bg-[#140228] text-center">
        <div className="glass-panel p-8 rounded-3xl border border-white/20 max-w-sm w-full space-y-5">
          <div className={`w-20 h-20 mx-auto rounded-2xl ${
            questionType === 'fill_blank' ? 'bg-amber-500' : questionType === 'matching' ? 'bg-cyan-500' : chosen.bg
          } flex items-center justify-center text-white text-4xl font-['Outfit'] shadow-2xl animate-pulse`}>
            {questionType === 'fill_blank' ? '✍️' : questionType === 'matching' ? '🧩' : chosen.icon}
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">បានបញ្ជូនចម្លើយរួចរាល់!</h2>
            <p className="text-xs text-yellow-300 font-bold mt-2 px-3 py-1.5 bg-white/10 rounded-xl inline-block font-khmer max-w-[260px] truncate">
              {chosenText}
            </p>
          </div>
          <p className="text-xs text-purple-200/70">សូមរង់ចាំមើលលទ្ធផលលើផ្ទាំងធំ...</p>
        </div>
      </div>
    );
  }

  // ==========================================
  // 5. RESULT OUTCOME SCREEN
  // ==========================================
  if (playerState === 'RESULT') {
    const isCorrect = (resultData && resultData.isCorrect) || false;
    const points = (resultData && resultData.pointsEarned) || 0;

    return (
      <div className={`min-h-screen flex flex-col justify-center items-center p-6 font-khmer text-center ${
        isCorrect ? 'bg-emerald-950' : 'bg-red-950'
      }`}>
        <div className="glass-panel p-8 sm:p-10 rounded-3xl border border-white/20 max-w-sm w-full space-y-6 animate-pop-in">
          <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center text-white">
            {isCorrect ? (
              <CheckCircle2 className="w-20 h-20 text-emerald-400 animate-bounce" />
            ) : (
              <XCircle className="w-20 h-20 text-red-400" />
            )}
          </div>

          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              {isCorrect ? 'ត្រឹមត្រូវ! 🎉' : 'មិនត្រឹមត្រូវ ❌'}
            </h2>
            {isCorrect && (
              <p className="text-sm font-bold text-yellow-300 font-['Outfit'] mt-1">
                +{points} Points
              </p>
            )}
          </div>

          {/* Show correct details if fill_blank or matching */}
          {!isCorrect && resultData?.type === 'fill_blank' && resultData.acceptedAnswers?.length > 0 && (
            <div className="bg-black/40 border border-amber-400/30 p-3 rounded-2xl text-left text-xs text-amber-200">
              <span className="font-bold block mb-1">ចម្លើយត្រឹមត្រូវ៖</span>
              <span className="text-white font-bold">{resultData.acceptedAnswers.join(' ឬ ')}</span>
            </div>
          )}

          {resultData?.type === 'matching' && resultData.pairs?.length > 0 && (
            <div className="bg-black/40 border border-cyan-400/30 p-3 rounded-2xl text-left text-xs text-cyan-200 space-y-1">
              <span className="font-bold block mb-1">គូផ្គូផ្គងត្រឹមត្រូវ៖</span>
              {resultData.pairs.map((p, idx) => (
                <div key={idx} className="flex items-center justify-between text-[11px] text-white bg-white/5 px-2 py-1 rounded-lg">
                  <span>{p.left}</span>
                  <span className="text-cyan-400 font-bold">↔</span>
                  <span>{p.right}</span>
                </div>
              ))}
            </div>
          )}

          {streak > 1 && isCorrect && (
            <div className="bg-orange-500/20 border border-orange-400/40 px-4 py-2 rounded-2xl flex items-center justify-center gap-2 text-orange-300 font-bold text-xs">
              <Flame className="w-4 h-4 text-orange-400" />
              <span>Streak Bonus: {streak} ជាប់គ្នា! 🔥</span>
            </div>
          )}

          <div className="bg-black/30 p-4 rounded-2xl">
            <span className="text-xs text-purple-300 block">ពិន្ទុសរុបរបស់អ្នក</span>
            <span className="text-2xl font-black text-white font-['Outfit']">{totalScore} pts</span>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // 6. LEADERBOARD WAITING SCREEN
  // ==========================================
  if (playerState === 'LEADERBOARD') {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center p-6 font-khmer bg-[#140228] text-center">
        <div className="glass-panel p-8 rounded-3xl border border-white/20 max-w-sm w-full space-y-6 animate-pop-in">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-yellow-400/20 border-2 border-yellow-400 flex items-center justify-center text-4xl shadow-xl animate-bounce">
            🔥
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">កំពុងបង្ហាញតារាងពិន្ទុ...</h2>
            <p className="text-xs text-purple-200/70 mt-1">សូមសម្លឹងមើលផ្ទាំងធំ និងត្រៀមសំណួរបន្ទាប់!</p>
          </div>
          <div className="bg-black/40 p-4 rounded-2xl border border-white/10">
            <span className="text-xs text-yellow-300 font-bold block">ពិន្ទុសរុបរបស់អ្នក</span>
            <span className="text-2xl font-black text-white font-['Outfit']">{totalScore} pts</span>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // 7. FINAL PODIUM SCREEN
  // ==========================================
  if (playerState === 'PODIUM') {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center p-6 font-khmer bg-gradient-to-b from-[#35106b] to-[#0d021c] text-center space-y-6">
        <div className="glass-panel p-8 sm:p-10 rounded-3xl border border-white/20 max-w-sm w-full space-y-6 animate-pop-in">
          <Trophy className="w-20 h-20 text-yellow-400 mx-auto animate-bounce" />
          <h1 className="text-2xl font-black text-white">ចប់ការប្រកួត!</h1>
          <div className="bg-yellow-400/20 p-4 rounded-2xl border border-yellow-400/40">
            <span className="text-xs text-yellow-200 block">ពិន្ទុចុងក្រោយរបស់អ្នក</span>
            <span className="text-3xl font-black text-yellow-300 font-['Outfit']">{totalScore}</span>
            <span className="text-xs text-yellow-200 block mt-1">ពិន្ទុ (Points)</span>
          </div>

          <button
            onClick={onExit}
            className="w-full py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all"
          >
            <Home className="w-4 h-4" />
            <span>ត្រឡប់ទៅទំព័រដើម</span>
          </button>
        </div>
      </div>
    );
  }

  // Fallback Safe Screen (Never blank)
  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-6 font-khmer bg-[#140228] text-center">
      <div className="glass-panel p-8 rounded-3xl border border-white/20 max-w-sm w-full space-y-4 animate-pop-in">
        <div className="w-16 h-16 mx-auto rounded-full bg-purple-500/20 border-2 border-purple-400 flex items-center justify-center text-3xl animate-pulse">
          {avatar || '🎮'}
        </div>
        <h2 className="text-lg font-bold text-white">កំពុងភ្ជាប់ទំនាក់ទំនង...</h2>
        <p className="text-xs text-purple-200/70">សូមរង់ចាំគ្រូចាប់ផ្តើមសំណួរលើផ្ទាំងធំ</p>
      </div>
    </div>
  );
}
