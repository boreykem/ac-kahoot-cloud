import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Sparkles, PlusCircle, Gamepad2, GraduationCap, ChevronDown, Check } from 'lucide-react';
import { sound } from '../utils/audioEngine';
import { translations } from '../utils/i18n';
import AccountSwitcherDropdown from './AccountSwitcherDropdown.jsx';

export default function Header({ 
  currentView, 
  setView, 
  activeLevel, 
  setActiveLevel, 
  onOpenAIGenerator, 
  lang = 'km', 
  onToggleLang,
  currentUser,
  systemLicense,
  savedAccounts = [],
  onSwitchAccount,
  onRemoveAccount,
  onOpenAuthModal,
  onLogout,
  onOpenAdminPanel,
  onOpenProfileModal
}) {
  const [muted, setMuted] = useState(false);
  const [isLevelMenuOpen, setIsLevelMenuOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const levelMenuRef = useRef(null);

  const t = translations[lang] || translations.km;

  const toggleSound = () => {
    const isNowMuted = sound.toggleMute();
    setMuted(isNowMuted);
  };

  const levels = [
    { id: 'all', label: t.all, icon: '🌐' },
    { id: 'primary', label: t.primary, icon: '👦' },
    { id: 'secondary', label: t.secondary, icon: '🧑‍🎓' },
    { id: 'highschool', label: t.highschool, icon: '🎓' },
    { id: 'university', label: t.university, icon: '🏛️' },
  ];

  const currentLevelObj = levels.find(l => l.id === activeLevel) || levels[0];

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (levelMenuRef.current && !levelMenuRef.current.contains(e.target)) {
        setIsLevelMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isSuperAdmin = currentUser?.role === 'superadmin';
  const isMachineLicensed = systemLicense?.isLicensed === true;

  return (
    <header className="glass-panel border-b border-white/10 px-3 py-2 sm:px-6 shadow-md relative z-40">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-3 flex-wrap lg:flex-nowrap">
        {/* Left Side: Brand Logo + Language + Login/Profile + Sound Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 flex-wrap">
          {/* Brand / Logo */}
          <div 
            onClick={() => { sound.playClick(); setView('home'); }} 
            className="flex items-center gap-2 cursor-pointer group"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-[#e21b3c] via-[#1368ce] to-[#26890c] flex items-center justify-center text-white font-extrabold text-lg sm:text-xl shadow-md group-hover:scale-105 transition-transform">
              AC
            </div>
            <div>
              <div className="flex items-center gap-0.5">
                <span className="font-extrabold text-xl sm:text-2xl tracking-tight text-white font-['Outfit']">Kahoot<span className="text-yellow-400">!</span></span>
              </div>
              <p className="text-[10px] text-purple-200/70 font-khmer hidden 2xl:block leading-none">{t.tagline}</p>
            </div>
          </div>

          {/* Clickable Language Switcher Badge */}
          <button
            type="button"
            onClick={() => { sound.playClick(); onToggleLang && onToggleLang(); }}
            className="px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-xl text-[10px] sm:text-[11px] font-bold tracking-wider bg-purple-600/80 hover:bg-purple-500 text-white border border-purple-400/40 flex items-center gap-1 shadow-sm hover:scale-105 active:scale-95 transition-all"
            title={lang === 'km' ? 'Switch to English' : 'ប្តូរទៅភាសាខ្មែរ'}
          >
            <span>{lang === 'km' ? '🇰🇭 KHMER' : '🇬🇧 ENGLISH'}</span>
          </button>

          {/* Teacher Login / Profile & License Pill */}
          {currentUser ? (
            <div className="relative">
              <div className="flex items-center gap-1.5 bg-purple-950/80 hover:bg-purple-900/80 border border-purple-400/40 pl-2.5 pr-1.5 py-1 rounded-xl shadow-sm transition-all">
                <button
                  type="button"
                  onClick={() => { sound.playClick(); setIsAccountMenuOpen(!isAccountMenuOpen); }}
                  className="flex items-center gap-1.5 text-left group"
                  title={lang === 'km' ? "ចុចដើម្បីប្តូរគណនី ឬពិនិត្យ License" : "Click to switch account or view license"}
                >
                  <span className="text-sm sm:text-base group-hover:scale-110 transition-transform">{currentUser.avatar || '👨‍🏫'}</span>
                  <div className="text-left">
                    <p className="text-xs font-bold text-yellow-300 group-hover:text-yellow-200 leading-tight truncate max-w-[90px] sm:max-w-[120px]">
                      {currentUser.name}
                    </p>
                    <p className="text-[9px] text-purple-200/80 leading-none truncate max-w-[90px] sm:max-w-[120px]">
                      {currentUser.license === 'VIP_SCHOOL' || systemLicense?.plan === 'VIP_SCHOOL' ? '🏫 VIP School' : (currentUser.license && currentUser.license !== 'free') || isMachineLicensed ? '👑 Pro Edition' : 'Free Trial'}
                    </p>
                  </div>
                </button>

                <div className="flex items-center gap-0.5 ml-1 border-l border-white/20 pl-1">
                  <button
                    type="button"
                    onClick={() => { sound.playClick(); setIsAccountMenuOpen(!isAccountMenuOpen); }}
                    title={lang === 'km' ? "ប្តូរគណនីគ្រូផ្សេងទៀត (Switch Account)" : "Switch Account"}
                    className={`p-1 rounded-lg transition-all text-xs flex items-center justify-center ${
                      isAccountMenuOpen ? 'bg-purple-500 text-white' : 'text-purple-300 hover:text-yellow-300 hover:bg-white/15'
                    }`}
                  >
                    🔄
                  </button>
                  <button
                    type="button"
                    onClick={onLogout}
                    title={lang === 'km' ? "ចាកចេញពីគណនី (Logout)" : "Logout"}
                    className="text-gray-300 hover:text-red-400 hover:bg-white/15 p-1 rounded-lg transition-all text-xs flex items-center justify-center font-bold"
                  >
                    🚪
                  </button>
                </div>
              </div>

              {/* Account Switcher Dropdown */}
              <AccountSwitcherDropdown
                isOpen={isAccountMenuOpen}
                onClose={() => setIsAccountMenuOpen(false)}
                currentUser={currentUser}
                savedAccounts={savedAccounts}
                onSwitchAccount={onSwitchAccount}
                onRemoveAccount={onRemoveAccount}
                onOpenLogin={() => {
                  setIsAccountMenuOpen(false);
                  onOpenAuthModal && onOpenAuthModal('login');
                }}
                onOpenLicense={() => {
                  setIsAccountMenuOpen(false);
                  onOpenAuthModal && onOpenAuthModal('license');
                }}
                onLogout={() => {
                  setIsAccountMenuOpen(false);
                  onLogout && onLogout();
                }}
                lang={lang}
              />
            </div>
          ) : isMachineLicensed ? (
            <button
              onClick={() => { sound.playClick(); onOpenAuthModal && onOpenAuthModal('license'); }}
              className="flex items-center gap-1.5 bg-emerald-950/80 hover:bg-emerald-900/80 text-emerald-300 text-xs font-bold font-khmer px-3 py-1.5 rounded-xl border border-emerald-400/40 transition-all hover:scale-105 shadow-md"
              title="ម៉ាស៊ីននេះបានបញ្ជាក់សោរ Pro រួចរាល់"
            >
              <span>🛡️ 👑 {systemLicense?.planTitle || 'Pro Lifetime Edition'}</span>
            </button>
          ) : (
            <button
              onClick={() => { sound.playClick(); onOpenAuthModal && onOpenAuthModal('login'); }}
              className="flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold font-khmer px-3 py-1.5 rounded-xl border border-purple-400/40 transition-all hover:scale-105 shadow-md"
            >
              <span>🔑 {lang === 'km' ? 'ចូលគណនី / សោរម៉ាស៊ីន' : 'Account & License'}</span>
            </button>
          )}

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            title={muted ? t.soundOn : t.soundOff}
            className="p-1.5 sm:p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-200 transition-all shadow-sm"
          >
            {muted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>

        {/* Center: Combined "កម្រិតថ្នាក់សិក្សា" Combo Button */}
        <div className="relative shrink-0" ref={levelMenuRef}>
          <button
            type="button"
            onClick={() => { sound.playClick(); setIsLevelMenuOpen(!isLevelMenuOpen); }}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl bg-purple-900/60 hover:bg-purple-800/80 text-white border border-purple-400/30 text-xs sm:text-sm font-semibold font-khmer shadow-md transition-all hover:scale-105 active:scale-95"
            title="ជ្រើសរើសកម្រិតថ្នាក់សិក្សា"
          >
            <GraduationCap className="w-4 h-4 text-yellow-300" />
            <span>{lang === 'km' ? 'កម្រិតថ្នាក់សិក្សា' : 'Education Levels'}</span>
            <span className="px-1.5 py-0.5 rounded-md bg-purple-950/80 text-[11px] text-yellow-300 border border-purple-400/30 flex items-center gap-1">
              <span>{currentLevelObj.icon}</span>
              <span className="hidden sm:inline">{currentLevelObj.label}</span>
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-purple-200 transition-transform ${isLevelMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {isLevelMenuOpen && (
            <div className="absolute top-full left-0 mt-1.5 w-48 sm:w-56 glass-panel bg-[#24084c]/95 border border-purple-400/40 rounded-2xl shadow-2xl p-1.5 z-50 animate-scale-in">
              <div className="text-[10px] uppercase font-bold text-purple-300/70 px-2.5 py-1 tracking-wider border-b border-white/10 mb-1">
                {lang === 'km' ? 'ជ្រើសរើសកម្រិតសិក្សា' : 'Filter by Level'}
              </div>
              {levels.map((lvl) => {
                const isSelected = activeLevel === lvl.id;
                return (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      setActiveLevel(lvl.id);
                      setIsLevelMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-khmer transition-all ${
                      isSelected
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold shadow-md'
                        : 'text-gray-200 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-sm">{lvl.icon}</span>
                      <span>{lvl.label}</span>
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-yellow-300" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Action Controls: Admin & Join Game */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {isSuperAdmin && (
            <button
              onClick={() => { sound.playClick(); onOpenAdminPanel && onOpenAdminPanel(); }}
              className="flex items-center gap-1 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-black text-xs sm:text-sm font-extrabold px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl shadow-md transition-all hover:scale-105 active:scale-95 animate-pulse"
              title="បើកផ្ទាំងបញ្ជា Master Admin"
            >
              <span>👑 Master Admin</span>
            </button>
          )}

          <button
            onClick={() => { sound.playClick(); setView('player-join'); }}
            className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold font-khmer px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl shadow-md transition-all hover:scale-105"
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            <span>{t.joinGame}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
