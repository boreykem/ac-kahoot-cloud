import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Edit3, Trash2, Sparkles, BookOpen, Clock, Award, Users, 
  Search, Plus, School, GraduationCap, ArrowUpDown, Check, ChevronDown, SlidersHorizontal 
} from 'lucide-react';
import { sound } from '../utils/audioEngine';
import { translations } from '../utils/i18n';

export default function HomeView({ 
  quizzes, 
  activeLevel, 
  setActiveLevel, 
  onHostQuiz, 
  onEditQuiz, 
  onDeleteQuiz, 
  onOpenAIGenerator,
  onCreateQuiz,
  onJoinDirect,
  lang = 'km',
  currentUser
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [libraryTab, setLibraryTab] = useState(currentUser ? 'my' : 'public');
  const [sortBy, setSortBy] = useState(() => localStorage.getItem('quiz_sort_order') || 'newest');
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const sortMenuRef = useRef(null);

  const t = translations[lang] || translations.km;

  // Close sort menu on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target)) {
        setIsSortMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const sortOptions = [
    { id: 'newest', labelKm: '🌟 ថ្មីបំផុត (Newest)', labelEn: '🌟 Newest First', descKm: 'វិញ្ញាសាទើបបង្កើត ឬ Generate ថ្មីៗ', descEn: 'Recently created or generated' },
    { id: 'oldest', labelKm: '⏳ ចាស់បំផុត (Oldest)', labelEn: '⏳ Oldest First', descKm: 'វិញ្ញាសាដំបូងៗ', descEn: 'Earliest created quizzes' },
    { id: 'title_asc', labelKm: '🔤 តាមឈ្មោះ (A ➔ Z)', labelEn: '🔤 Title (A ➔ Z)', descKm: 'តម្រៀបតាមលំដាប់អក្ខរក្រម', descEn: 'Alphabetical A to Z' },
    { id: 'title_desc', labelKm: '🔤 តាមឈ្មោះ (Z ➔ A)', labelEn: '🔤 Title (Z ➔ A)', descKm: 'តម្រៀបបញ្ច្រាសអក្ខរក្រម', descEn: 'Alphabetical Z to A' },
    { id: 'questions_desc', labelKm: '📝 សំណួរច្រើនបំផុត', labelEn: '📝 Most Questions', descKm: 'វិញ្ញាសាដែលមានចំនួនសំណួរច្រើន', descEn: 'Highest number of questions' },
    { id: 'questions_asc', labelKm: '📝 សំណួរតិចបំផុត', labelEn: '📝 Fewest Questions', descKm: 'វិញ្ញាសាដែលមានសំណួរតិច', descEn: 'Lowest number of questions' },
  ];

  const currentSortOption = sortOptions.find(o => o.id === sortBy) || sortOptions[0];

  const isSuperAdmin = currentUser?.role === 'superadmin';

  const levelInfo = {
    all: {
      title: lang === 'km' ? 'កម្រងសំណួរទាំងអស់' : 'All Quiz Collections',
      desc: lang === 'km' ? 'ស្វែងរក និងជ្រើសរើសវិញ្ញាសាដើម្បីចាប់ផ្តើមបង្រៀន ឬលេងអន្តរកម្ម' : 'Search and select quizzes to start hosting or playing interactively',
      badge: 'All Levels'
    },
    primary: {
      title: lang === 'km' ? '👦 កម្រិតបឋមសិក្សា (Primary School)' : '👦 Primary School',
      desc: lang === 'km' ? 'ល្បែងសិក្សាផ្អែកលើរូបភាព ពណ៌ និងសម្លេងកម្សាន្តសម្រាប់កុមារ' : 'Visual, colorful, and fun game-based learning for kids',
      badge: lang === 'km' ? 'កុមារ & រូបភាព' : 'Kids & Visual'
    },
    secondary: {
      title: lang === 'km' ? '🧑‍🎓 កម្រិតមធ្យមសិក្សា / អនុវិទ្យាល័យ' : '🧑‍🎓 Secondary / Middle School',
      desc: lang === 'km' ? 'ការប្រកួតល្បឿន និងពង្រឹងចំណេះដឹងទូទៅ វិទ្យាសាស្ត្រ និងភាសា' : 'Speed competitions and core concepts in science and language',
      badge: 'Speed & Streaks'
    },
    highschool: {
      title: lang === 'km' ? '🎓 កម្រិតវិទ្យាល័យ (High School)' : '🎓 High School',
      desc: lang === 'km' ? 'វិញ្ញាសាត្រៀមបាក់ឌុប គាំទ្ររូបមន្តគណិត-រូប-គីមី និងការគិតលេខ' : 'National exam preparation: Math, Physics, Chemistry, Biology',
      badge: lang === 'km' ? 'ត្រៀមបាក់ឌុប' : 'Exam Prep'
    },
    university: {
      title: lang === 'km' ? '🏛️ កម្រិតឧត្តមសិក្សា / សាកលវិទ្យាល័យ' : '🏛️ Higher Education / University',
      desc: lang === 'km' ? 'Thinking Mode, Case Studies, Bloom\'s Taxonomy និងការវិភាគស៊ីជម្រៅ' : 'Deep Thinking, Case Studies, Bloom\'s Taxonomy & Critical Thinking',
      badge: 'Deep Thinking'
    }
  };

  const filteredQuizzes = quizzes.filter(q => {
    const matchesLevel = activeLevel === 'all' || q.level === activeLevel;
    const matchesSearch = (q.title + ' ' + (q.description || '') + ' ' + (q.category || ''))
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    if (!matchesLevel || !matchesSearch) return false;

    // Library Isolation Filter
    if (currentUser) {
      if (isSuperAdmin) {
        if (libraryTab === 'my') {
          return q.authorEmail === currentUser.email || q.authorId === currentUser.id;
        } else if (libraryTab === 'public') {
          return q.isOfficial || !q.authorEmail || q.authorEmail === 'official';
        }
        return true; // 'all' tab shows all
      } else {
        // Normal client / teacher: ONLY see their own personal quizzes
        return q.authorEmail === currentUser.email || q.authorId === currentUser.id;
      }
    } else {
      return q.isOfficial || !q.authorEmail || q.authorEmail === 'official';
    }
  });

  const getQuizTimestamp = (q) => {
    if (q.createdAt) {
      const t = new Date(q.createdAt).getTime();
      if (!isNaN(t) && t > 0) return t;
    }
    if (q.updatedAt) {
      const t = new Date(q.updatedAt).getTime();
      if (!isNaN(t) && t > 0) return t;
    }
    const match = String(q.id || '').match(/(\d{10,14})/);
    if (match) {
      const parsed = parseInt(match[1], 10);
      if (!isNaN(parsed) && parsed > 1000000000) return parsed;
    }
    if (q._id && typeof q._id === 'string' && q._id.length === 24) {
      try {
        const ts = parseInt(q._id.substring(0, 8), 16) * 1000;
        if (!isNaN(ts) && ts > 0) return ts;
      } catch (_) {}
    }
    return 0;
  };

  const isRecentQuiz = (q) => {
    const ts = getQuizTimestamp(q);
    if (!ts) return false;
    return (Date.now() - ts) < 48 * 60 * 60 * 1000; // Created within last 48 hours
  };

  const sortedQuizzes = [...filteredQuizzes].sort((a, b) => {
    if (sortBy === 'newest') {
      const timeA = getQuizTimestamp(a);
      const timeB = getQuizTimestamp(b);
      if (timeA !== timeB && timeA > 0 && timeB > 0) return timeB - timeA;
      return quizzes.indexOf(b) - quizzes.indexOf(a);
    }
    if (sortBy === 'oldest') {
      const timeA = getQuizTimestamp(a);
      const timeB = getQuizTimestamp(b);
      if (timeA !== timeB && timeA > 0 && timeB > 0) return timeA - timeB;
      return quizzes.indexOf(a) - quizzes.indexOf(b);
    }
    if (sortBy === 'title_asc') {
      return (a.title || '').localeCompare(b.title || '', lang === 'km' ? 'km' : 'en');
    }
    if (sortBy === 'title_desc') {
      return (b.title || '').localeCompare(a.title || '', lang === 'km' ? 'km' : 'en');
    }
    if (sortBy === 'questions_desc') {
      return (b.questions?.length || 0) - (a.questions?.length || 0);
    }
    if (sortBy === 'questions_asc') {
      return (a.questions?.length || 0) - (b.questions?.length || 0);
    }
    return 0;
  });

  const myQuizzesCount = currentUser 
    ? quizzes.filter(q => q.authorEmail === currentUser.email || q.authorId === currentUser.id).length 
    : 0;
  const officialQuizzesCount = quizzes.filter(q => q.isOfficial || !q.authorEmail || q.authorEmail === 'official').length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-8 space-y-8 font-khmer">
      {/* Hero Header & Quick Actions */}
      <div className="relative rounded-3xl overflow-hidden glass-panel p-6 sm:p-10 border border-purple-500/20 bg-gradient-to-r from-purple-900/60 via-indigo-900/40 to-black/60 shadow-2xl">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-yellow-400 animate-spin" />
            <span>ប្រព័ន្ធសំណួរ-ចម្លើយឆ្លាតវៃជំនាន់ថ្មី ២០២៦</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white leading-tight font-khmer">
            {lang === 'km' ? (
              <>
                បង្រៀន និងវាយតម្លៃការសិក្សា <br />
                <span className="bg-gradient-to-r from-yellow-300 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                  តាមបែបល្បែងអន្តរកម្ម
                </span>
              </>
            ) : (
              <>
                Interactive Learning & <br />
                <span className="bg-gradient-to-r from-yellow-300 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                  Smart Classroom Quizzes
                </span>
              </>
            )}
          </h1>

          <p className="text-sm sm:text-base text-purple-200/80 max-w-2xl leading-relaxed">
            {t.heroSubtitle}
          </p>

          {/* Quick Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-3">
            <button
              onClick={onOpenAIGenerator}
              className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold px-5 py-3 rounded-2xl shadow-xl shadow-orange-950/50 hover:scale-105 active:scale-95 transition-all text-sm animate-pulse"
            >
              <Sparkles className="w-5 h-5 text-yellow-200" />
              <span>{t.aiQuiz}</span>
            </button>

            <button
              onClick={() => { sound.playClick(); onCreateQuiz && onCreateQuiz(); }}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold px-5 py-3 rounded-2xl border border-white/20 hover:border-emerald-400 hover:scale-105 active:scale-95 transition-all text-sm shadow-md"
            >
              <Plus className="w-5 h-5 text-emerald-400" />
              <span>{lang === 'km' ? 'បង្កើតវិញ្ញាសាថ្មី' : 'Create Quiz'}</span>
            </button>

            <button
              onClick={onJoinDirect}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-3 rounded-2xl shadow-xl shadow-emerald-950/50 hover:scale-105 active:scale-95 transition-all text-sm"
            >
              <Users className="w-5 h-5" />
              <span>{lang === 'km' ? 'សិស្សចូលលេង (Enter PIN)' : 'Join Game (Enter PIN)'}</span>
            </button>
          </div>
        </div>

        {/* Decorative Graphic Elements - High Performance 3D Shapes */}
        <div className="absolute right-8 sm:right-16 top-6 sm:top-8 pointer-events-none hidden md:block">
          <div className="grid grid-cols-2 gap-3.5 opacity-80 hover:opacity-100 transition-opacity">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br from-[#ff3b56] to-[#b30e28] flex items-center justify-center text-3xl sm:text-4xl text-white font-black shadow-lg shadow-red-950/40 border border-white/20">
              ▲
            </div>
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br from-[#2a84f3] to-[#0d4ea0] flex items-center justify-center text-3xl sm:text-4xl text-white font-black shadow-lg shadow-blue-950/40 border border-white/20">
              ◆
            </div>
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br from-[#ffb703] to-[#c48200] flex items-center justify-center text-3xl sm:text-4xl text-white font-black shadow-lg shadow-amber-950/40 border border-white/20">
              ●
            </div>
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br from-[#38b000] to-[#1b6b00] flex items-center justify-center text-3xl sm:text-4xl text-white font-black shadow-lg shadow-green-950/40 border border-white/20">
              ■
            </div>
          </div>
        </div>
      </div>

      {/* Library Filter Tabs (Personal vs Public vs All) */}
      {/* Library Filter Tabs */}
      {currentUser && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 bg-black/40 rounded-2xl border border-white/10">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => { sound.playClick(); setLibraryTab('my'); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                libraryTab === 'my'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-950/60'
                  : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>🔒 {lang === 'km' ? 'វិញ្ញាសាផ្ទាល់ខ្លួនរបស់ខ្ញុំ' : 'My Personal Quizzes'}</span>
              <span className="px-2 py-0.5 rounded-full bg-black/40 text-[10px] text-yellow-300">
                {myQuizzesCount}
              </span>
            </button>

            {/* Official Library & All Quizzes Tabs: Visible ONLY to Super Admin */}
            {isSuperAdmin && (
              <>
                <button
                  onClick={() => { sound.playClick(); setLibraryTab('public'); }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                    libraryTab === 'public'
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-950/60'
                      : 'text-gray-300 hover:text-white hover:bg-white/5'
                  }`}
                  title="បណ្ណាល័យវិញ្ញាសារួមផ្លូវការ (មើលឃើញតែ Super Admin)"
                >
                  <span>🌐 {lang === 'km' ? 'បណ្ណាល័យរួមផ្លូវការ' : 'Official Library'}</span>
                  <span className="px-2 py-0.5 rounded-full bg-black/40 text-[10px] text-purple-200">
                    {officialQuizzesCount}
                  </span>
                </button>

                <button
                  onClick={() => { sound.playClick(); setLibraryTab('all'); }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                    libraryTab === 'all'
                      ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-950/60'
                      : 'text-yellow-300 hover:bg-yellow-500/10'
                  }`}
                  title="វិញ្ញាសារបស់គ្រូទាំងអស់ក្នុងប្រព័ន្ធ"
                >
                  <span>👑 {lang === 'km' ? 'វិញ្ញាសាគ្រូទាំងអស់ (Admin View)' : 'All Teachers Quizzes'}</span>
                  <span className="px-2 py-0.5 rounded-full bg-black/60 text-[10px] text-yellow-300 font-mono">
                    {quizzes.length}
                  </span>
                </button>
              </>
            )}
          </div>

          <p className="text-[11px] text-purple-200/60 pr-2">
            {libraryTab === 'my' 
              ? (lang === 'km' ? '🛡️ រាល់វិញ្ញាសាត្រូវបានការពារសុវត្ថិភាពឯកជនភាព ១០០% មានតែលោកគ្រូម្នាក់គត់ដែលអាចឃើញ' : '🛡️ 100% private: only you can view and edit')
              : (lang === 'km' ? '✨ បណ្ណាល័យរួមគ្រប់គ្រងដោយ Super Admin ផ្ដាច់មុខ' : 'Managed exclusively by Super Admin')}
          </p>
        </div>
      )}

      {/* Education Level Selector & Search Filter */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-yellow-400" />
              <span>{levelInfo[activeLevel]?.title || (lang === 'km' ? 'បណ្ណាល័យវិញ្ញាសា' : 'Quiz Library')}</span>
            </h2>
            <p className="text-xs sm:text-sm text-purple-200/70 mt-1">
              {levelInfo[activeLevel]?.desc}
            </p>
          </div>

          {/* Controls: Search Box + Sort Dropdown */}
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            {/* Search Box */}
            <div className="relative min-w-[200px] sm:min-w-[260px] flex-1">
              <Search className="w-4 h-4 text-purple-300 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="w-full bg-black/40 border border-white/15 rounded-xl pl-10 pr-8 py-2 text-xs sm:text-sm text-white placeholder-purple-300/50 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Sort Selector Dropdown */}
            <div className="relative shrink-0" ref={sortMenuRef}>
              <button
                type="button"
                onClick={() => { sound.playClick(); setIsSortMenuOpen(!isSortMenuOpen); }}
                className="flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-xl bg-purple-900/60 hover:bg-purple-800/80 border border-purple-400/30 hover:border-purple-400/60 text-white text-xs sm:text-sm font-semibold transition-all shadow-md active:scale-95 whitespace-nowrap"
                title={lang === 'km' ? 'តម្រៀបវិញ្ញាសា' : 'Sort quizzes'}
              >
                <ArrowUpDown className="w-4 h-4 text-yellow-300" />
                <span>{lang === 'km' ? currentSortOption.labelKm : currentSortOption.labelEn}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-purple-300 transition-transform duration-200 ${isSortMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isSortMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-[#1b0634] border border-purple-400/40 rounded-2xl shadow-2xl p-2 z-50 backdrop-blur-xl animate-scale-in">
                  <div className="px-3 py-1.5 border-b border-white/10 mb-1 flex items-center justify-between text-[11px] font-bold text-purple-300">
                    <span className="flex items-center gap-1.5">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-yellow-400" />
                      <span>{lang === 'km' ? 'ជម្រើសតម្រៀប (Sort Options)' : 'Sort Options'}</span>
                    </span>
                    <span className="text-[10px] text-yellow-300 bg-yellow-400/10 px-2 py-0.5 rounded-full border border-yellow-400/20">
                      {sortedQuizzes.length} {lang === 'km' ? 'វិញ្ញាសា' : 'quizzes'}
                    </span>
                  </div>

                  <div className="space-y-1">
                    {sortOptions.map((opt) => {
                      const isSelected = sortBy === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            sound.playClick();
                            setSortBy(opt.id);
                            try { localStorage.setItem('quiz_sort_order', opt.id); } catch (_) {}
                            setIsSortMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-left transition-all ${
                            isSelected 
                              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md border border-purple-300/40' 
                              : 'text-gray-300 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          <div>
                            <p className="flex items-center gap-1">{lang === 'km' ? opt.labelKm : opt.labelEn}</p>
                            <p className="text-[10px] opacity-75 font-normal">{lang === 'km' ? opt.descKm : opt.descEn}</p>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-yellow-300 shrink-0 ml-2" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Level Quick Badges */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {[
            { id: 'all', label: lang === 'km' ? 'ទាំងអស់ (All)' : '🌐 All Levels' },
            { id: 'university', label: lang === 'km' ? '🏛️ សាកលវិទ្យាល័យ / ឧត្តមសិក្សា' : '🏛️ University / Higher Ed' },
            { id: 'highschool', label: lang === 'km' ? '🎓 វិទ្យាល័យ (បាក់ឌុប)' : '🎓 High School' },
            { id: 'secondary', label: lang === 'km' ? '🧑‍🎓 មធ្យមសិក្សា' : '🧑‍🎓 Secondary School' },
            { id: 'primary', label: lang === 'km' ? '👦 បឋមសិក្សា' : '👦 Primary School' },
          ].map(lvl => (
            <button
              key={lvl.id}
              onClick={() => { sound.playClick(); setActiveLevel(lvl.id); }}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeLevel === lvl.id
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-950/50'
                  : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10'
              }`}
            >
              {lvl.label}
            </button>
          ))}
        </div>
      </div>

      {/* Quizzes Grid */}
      {sortedQuizzes.length === 0 ? (
        <div className="text-center py-16 glass-card rounded-3xl border border-dashed border-white/20 p-8 space-y-4">
          <BookOpen className="w-12 h-12 text-purple-400 mx-auto opacity-50" />
          <h3 className="text-lg font-bold text-white">
            {lang === 'km' ? 'មិនទាន់មានវិញ្ញាសាក្នុងផ្នែកនេះនៅឡើយទេ' : 'No quizzes available here'}
          </h3>
          <p className="text-sm text-purple-200/60 max-w-md mx-auto">
            {lang === 'km' 
              ? 'លោកគ្រូអាចប្រើប្រាស់ Gemini AI ដើម្បីបង្កើតវិញ្ញាសាដោយស្វ័យប្រវត្ត ឬបង្កើតដោយខ្លួនឯង។' 
              : 'You can use Gemini AI to generate customized quizzes automatically or create one manually.'}
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={onOpenAIGenerator}
              className="bg-amber-500 hover:bg-amber-400 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>{lang === 'km' ? 'បង្កើតជាមួយ Gemini AI' : 'Generate via Gemini AI'}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedQuizzes.map((quiz) => {
            const isOwner = currentUser && (quiz.authorEmail === currentUser.email || quiz.authorId === currentUser.id);
            const canManage = isSuperAdmin || isOwner;

            return (
              <div
                key={quiz.id}
                className="glass-card rounded-3xl overflow-hidden border border-white/10 flex flex-col justify-between group hover:border-purple-400/50 transition-all duration-300"
              >
                {/* Card Header Media */}
                <div className="relative h-44 w-full overflow-hidden bg-purple-950/50">
                  <img
                    src={quiz.image || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80"}
                    alt={quiz.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#150428] via-transparent to-black/30" />
                  
                  {/* Questions Count Pill */}
                  <div className="absolute bottom-3 left-3 bg-black/85 px-3 py-1 rounded-full text-xs font-bold text-white flex items-center gap-1.5 border border-white/20 shadow-md">
                    <Award className="w-3.5 h-3.5 text-yellow-400" />
                    <span>{quiz.questions?.length || 0} {lang === 'km' ? 'សំណួរ' : 'Questions'}</span>
                  </div>

                  {/* Author / Official Tag & Recent Badge */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap max-w-[70%]">
                    <span className="bg-black/85 px-2.5 py-1 rounded-full text-[10px] font-bold text-purple-200 border border-white/20 shadow-md">
                      {quiz.isOfficial ? '👑 ផ្លូវការ (Official)' : `👤 ${quiz.authorName || 'Teacher'}`}
                    </span>
                    {isRecentQuiz(quiz) && (
                      <span className="bg-gradient-to-r from-emerald-500 to-teal-400 text-black px-2 py-0.5 rounded-full text-[10px] font-black shadow-md border border-emerald-300/40 animate-pulse">
                        ✨ {lang === 'km' ? 'ថ្មី' : 'NEW'}
                      </span>
                    )}
                  </div>

                  {/* Level Tag */}
                  <div className="absolute top-3 right-3 bg-purple-600 px-3 py-1 rounded-full text-[11px] font-bold text-white shadow-md uppercase">
                    {quiz.category || quiz.level || 'Quiz'}
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-purple-300 transition-colors line-clamp-2">
                      {quiz.title}
                    </h3>
                    <p className="text-xs text-purple-200/70 mt-1 line-clamp-2 leading-relaxed">
                      {quiz.description || (lang === 'km' ? "កម្រងសំណួរវាយតម្លៃការយល់ដឹង និងពង្រឹងចំណេះដឹង" : "Interactive assessment quiz")}
                    </p>
                  </div>

                  {/* Card Action Buttons */}
                  <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      {canManage ? (
                        <>
                          <button
                            onClick={() => { sound.playClick(); onEditQuiz(quiz); }}
                            title="កែប្រែសំណួរ"
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white transition-all"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => { sound.playClick(); onDeleteQuiz(quiz.id); }}
                            title="លុបវិញ្ញាសា"
                            className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-gray-300 hover:text-red-400 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <span className="text-[11px] text-purple-300/60 font-semibold px-1">
                          🔒 វិញ្ញាសាសាធារណៈ
                        </span>
                      )}
                    </div>

                    {/* Big Host Button */}
                    <button
                      onClick={() => { sound.playClick(); onHostQuiz(quiz); }}
                      className="flex-1 max-w-[140px] flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-purple-950/50 hover:scale-105 active:scale-95 transition-all text-xs"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>{t.hostGame}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
