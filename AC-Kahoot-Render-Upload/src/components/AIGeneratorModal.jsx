import React, { useState, useEffect } from 'react';
import { Sparkles, X, Loader2, Check, Key, HelpCircle, BookOpen, Layers, ExternalLink, Clock, Cpu, Hourglass, RefreshCw, ArrowLeft, Pencil, Save, ChevronDown, ChevronUp, Upload, FileText, Trash2, Eye, EyeOff } from 'lucide-react';
import { sound } from '../utils/audioEngine';

export default function AIGeneratorModal({ isOpen, onClose, onSaveGeneratedQuiz, onAppendQuestions, initialLevel, currentUser, lang = 'km' }) {
  const isPro = currentUser?.license && currentUser.license !== 'free';
  const [aiUsageCount, setAiUsageCount] = useState(
    currentUser?.aiGenerationsCount ?? parseInt(localStorage.getItem('ai_generations_count') || '0', 10)
  );

  const [topic, setTopic] = useState('');
  const [level, setLevel] = useState(initialLevel || 'university');
  const [count, setCount] = useState(5);
  const [testType, setTestType] = useState('post-test');
  const [timeLimitPerQuestion, setTimeLimitPerQuestion] = useState(20);
  const [modelTier, setModelTier] = useState('flash');
  const [apiKey, setApiKey] = useState(localStorage.getItem('gemini_api_key') || '');
  const [showKeyVisible, setShowKeyVisible] = useState(false);
  const [isEditingKey, setIsEditingKey] = useState(!localStorage.getItem('gemini_api_key'));
  const [testingKey, setTestingKey] = useState(false);
  const [keyTestStatus, setKeyTestStatus] = useState(null); // { success: boolean, message: string }
  const [loading, setLoading] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [generatedQuestions, setGeneratedQuestions] = useState(null);
  const [quizTitle, setQuizTitle] = useState('');
  const [editingQIdx, setEditingQIdx] = useState(null);
  const [savedSuccess, setSavedSuccess] = useState(false); // flash success screen before reset

  const handleTestKey = async () => {
    if (!apiKey.trim()) {
      alert('សូមបញ្ចូល Gemini API Key ជាមុនសិន!');
      return;
    }
    setTestingKey(true);
    setKeyTestStatus(null);
    try {
      const res = await fetch('/api/validate-gemini-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey.trim() })
      });
      const data = await res.json();
      setKeyTestStatus({
        success: !!data.success,
        message: data.message || (data.success ? '✅ API Key ត្រឹមត្រូវ!' : '❌ API Key មិនដំណើរការ')
      });
      if (data.success) {
        sound.playCorrect();
      }
    } catch (e) {
      setKeyTestStatus({ success: false, message: '❌ បរាជ័យក្នុងការតភ្ជាប់ទៅ Server: ' + e.message });
    } finally {
      setTestingKey(false);
    }
  };

  useEffect(() => {
    if (currentUser?.aiGenerationsCount !== undefined) {
      setAiUsageCount(currentUser.aiGenerationsCount);
    }
  }, [currentUser]);
  
  // File Upload State
  const [lessonFile, setLessonFile] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null); // Track 0-100%
  const [lessonText, setLessonText] = useState('');

  // Sync initial level when opened
  useEffect(() => {
    if (initialLevel) {
      setLevel(initialLevel);
    }
  }, [initialLevel, isOpen]);

  // Loading Timer & Elapsed Counter
  useEffect(() => {
    let interval;
    if (loading) {
      setElapsedSeconds(0);
      interval = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  if (!isOpen) return null;

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      alert("ឯកសារធំពេក (អតិបរមា 20MB)។");
      return;
    }

    setUploadingFile(true);
    setUploadProgress(0);
    const formData = new FormData();
    formData.append('file', file);
    if (apiKey) formData.append('apiKey', apiKey.trim());

    try {
      const data = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/extract-lesson');
        
        // Track upload progress
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            setUploadProgress(percent);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch (err) {
              reject(new Error("Invalid JSON response"));
            }
          } else {
            try {
              const errData = JSON.parse(xhr.responseText);
              reject(new Error(errData.message || 'Server Error'));
            } catch {
              reject(new Error(`Server returned status ${xhr.status}`));
            }
          }
        };

        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send(formData);
      });
      
      if (data.success) {
        setLessonFile(file.name);
        setLessonText(data.text);
        if (!topic) setTopic(lang === 'km' ? `វិញ្ញាសាដកស្រង់ពី៖ ${file.name}` : `Quiz from: ${file.name}`);
      } else {
        alert(data.message || 'មានបញ្ហាក្នុងការទាញយកអត្ថបទពីឯកសារនេះ។ សូមសាកល្បងម្ដងទៀត!');
      }
    } catch (error) {
      console.error(error);
      alert(error.message || 'បរាជ័យក្នុងការភ្ជាប់ទៅកាន់ម៉ាស៊ីនមេ (Server)! ការទាញយកអត្ថបទត្រូវចំណាយពេលយូរពេក ឬដាច់អ៊ីនធឺណិត។');
    } finally {
      setUploadingFile(false);
      setUploadProgress(null);
      e.target.value = ''; // Reset input
    }
  };

  // Estimated Total Generation Seconds based on question count & model & if document is provided
  const estimatedTotalSeconds = Math.max(25, parseInt(count, 10) * (lessonText ? 12 : 5) + (modelTier === 'pro' ? 25 : 8));
  const progressPercent = Math.min(98, Math.round((elapsedSeconds / estimatedTotalSeconds) * 90) + 6);

  // Dynamic Stage Status Message
  const getStageMessage = () => {
    if (elapsedSeconds < 6) {
      return {
        stage: 1,
        title: "🔍 ដំណាក់កាលទី ១៖ កំពុងអាន និងវិភាគប្រធានបទមេរៀន...",
        desc: "Gemini AI កំពុងស្រង់យកចំណុចគន្លឹះ និងគំនិតចម្បងនៃខ្លឹមសារដែលលោកគ្រូបានបញ្ចូល..."
      };
    } else if (elapsedSeconds < 16) {
      return {
        stage: 2,
        title: "🧠 ដំណាក់កាលទី ២៖ កំពុងវិភាគស៊ីជម្រៅតាម Bloom's Taxonomy...",
        desc: "បែងចែកកម្រិតសំណួរ (ងាយ មធ្យម ស៊ីជម្រៅ) ស្របតាមកម្រិតសិក្សាដែលបានកំណត់..."
      };
    } else if (elapsedSeconds < 35) {
      return {
        stage: 3,
        title: "🎯 ដំណាក់កាលទី ៣៖ កំពុងបង្កើតជម្រើសទាំង ៤ និងផ្ទៀងផ្ទាត់ចម្លើយត្រូវ...",
        desc: "បង្កើតជម្រើសចម្លើយបញ្ឆោតសមហេតុផល (Plausible Distractors) និងផ្ទៀងផ្ទាត់ចម្លើយត្រឹមត្រូវ..."
      };
    } else if (elapsedSeconds < 60) {
      return {
        stage: 4,
        title: "✨ ដំណាក់កាលទី ៤៖ កំពុងតាក់តែងការពន្យល់បែបវិទ្យាសាស្ត្រ...",
        desc: "Gemini Pro កំពុងសរសេរការពន្យល់លម្អិត និងផ្ទៀងផ្ទាត់គរុកោសល្យចុងក្រោយ..."
      };
    } else {
      return {
        stage: 5,
        title: "☕ Gemini Pro Deep Reasoning / Network Stream...",
        desc: "ប្រព័ន្ធកំពុងផ្ដល់ពេលវេលាពេញលេញឱ្យ Gemini AI បញ្ចប់សំណួរដ៏ល្អឥតខ្ចោះ។ សូមរង់ចាំដោយរីករាយ កម្មវិធីកំពុងដំណើរការយ៉ាងសកម្ម! ⏳"
      };
    }
  };

  const currentStage = getStageMessage();

  const handleGenerate = async () => {
    if (!topic.trim()) {
      alert('សូមបញ្ចូលប្រធានបទ ឬអត្ថបទមេរៀនជាមុនសិន!');
      return;
    }

    // Check if free user exceeded 10 free generations and has no custom key
    if (!apiKey && !isPro && aiUsageCount >= 10) {
      alert('🎉 លោកគ្រូ/អ្នកគ្រូ បានសាកល្បងបង្កើតសំណួរ AI ឥតគិតថ្លៃគ្រប់ ១០ លើកហើយ! សូម Upgrade ទៅកាន់ Pro ឬបញ្ចូល Gemini API Key ផ្ទាល់ខ្លួនរបស់អ្នកដើម្បីបន្តប្រើប្រាស់។');
      return;
    }

    sound.playClick();
    setLoading(true);

    // Save API key to local storage if user provided one
    if (apiKey) {
      localStorage.setItem('gemini_api_key', apiKey.trim());
    }

    try {
      const res = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          lessonText, // Passed to backend context
          level,
          count: parseInt(count, 10),
          testType,
          apiKey: apiKey.trim(),
          modelTier,
          userEmail: currentUser?.email,
          userId: currentUser?.id
        })
      });

      const data = await res.json();
      if (data.success && data.questions) {
        const questionsWithTime = data.questions.map(q => ({
          ...q,
          timeLimit: q.timeLimit || timeLimitPerQuestion
        }));
        setGeneratedQuestions(questionsWithTime);
        setQuizTitle(lang === 'km' ? `វិញ្ញាសា AI៖ ${topic.slice(0, 35)}` : `AI Quiz: ${topic.slice(0, 35)}`);
        
        if (data.aiGenerationsCount !== undefined) {
          setAiUsageCount(data.aiGenerationsCount);
          localStorage.setItem('ai_generations_count', data.aiGenerationsCount.toString());
        } else if (!isPro && !apiKey) {
          setAiUsageCount(prev => {
            const next = prev + 1;
            localStorage.setItem('ai_generations_count', next.toString());
            return next;
          });
        }

        sound.playCorrect();
      } else {
        alert(data.message || 'មានបញ្ហាក្នុងការបង្កើតសំណួរ សូមសាកល្បងម្តងទៀត។');
      }
    } catch (err) {
      console.error(err);
      alert('ការភ្ជាប់ទៅកាន់ Server បរាជ័យ!');
    } finally {
      setLoading(false);
    }
  };

  const resetForNextBatch = () => {
    setTopic('');
    setLessonFile(null);
    setLessonText('');
    setGeneratedQuestions(null);
    setQuizTitle('');
    setEditingQIdx(null);
    setSavedSuccess(false);
  };

  const handleSaveToLibrary = () => {
    if (!generatedQuestions || generatedQuestions.length === 0) return;
    sound.playCorrect();

    if (onAppendQuestions) {
      onAppendQuestions(generatedQuestions);
      // Show success flash then reset
      setSavedSuccess(true);
      setTimeout(() => resetForNextBatch(), 2200);
      return;
    }

    const newQuiz = {
      id: `quiz-ai-${Date.now()}`,
      title: quizTitle || (lang === 'km' ? `វិញ្ញាសា AI៖ ${topic.slice(0, 30)}` : `AI Quiz: ${topic.slice(0, 30)}`),
      description: lang === 'km' ? `វិញ្ញាសាបង្កើតដោយ Gemini AI លើប្រធានបទ "${topic}"` : `Quiz generated by Gemini AI on topic "${topic}"`,
      level: level,
      category: level === 'university' ? 'ឧត្តមសិក្សា' : level === 'highschool' ? 'វិទ្យាល័យ' : level === 'primary' ? 'បឋមសិក្សា' : 'មធ្យមសិក្សា',
      image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80",
      questions: generatedQuestions
    };

    if (onSaveGeneratedQuiz) {
      onSaveGeneratedQuiz(newQuiz);
    }

    // Show success flash then reset to empty form (stay in modal for next batch)
    setSavedSuccess(true);
    setTimeout(() => resetForNextBatch(), 2200);
  };

  const choiceIcons = ['▲', '◆', '●', '■'];

  return (
    <>
      {/* ======================================================== */}
      {/* 🚀 REAL-TIME ESTIMATED TIME & GENERATION PROGRESS POPUP */}
      {/* ======================================================== */}
      {loading && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl font-khmer">
          <div className="glass-panel border border-yellow-400/40 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 bg-gradient-to-b from-[#2d0859] via-[#1a0438] to-black shadow-2xl text-center relative overflow-hidden">
            {/* Ambient Background Glowing Blobs */}
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-amber-500/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-purple-500/25 rounded-full blur-3xl pointer-events-none animate-pulse" />

            {/* Glowing Orb Header */}
            <div className="relative z-10 flex flex-col items-center gap-3">
              <div className="relative">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr from-amber-500 via-orange-500 to-purple-600 flex items-center justify-center text-white shadow-xl shadow-orange-950/80 animate-spin-slow">
                  <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 text-yellow-200 animate-pulse" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-black flex items-center justify-center text-black text-[10px] font-black animate-bounce-short">
                  ⚡
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-extrabold text-yellow-300 flex items-center justify-center gap-1.5 leading-snug">
                  <span>សូមលោកគ្រូ អ្នកគ្រូមេត្តារង់ចាំ យើងខ្ញុំកំពុងបង្កើតសំណួរជូន...</span>
                </h3>
                <p className="text-xs text-purple-200/80">
                  កំពុងបង្កើត {count} សំណួរ • {level === 'university' ? 'ឧត្តមសិក្សា' : level === 'highschool' ? 'វិទ្យាល័យ' : level === 'primary' ? 'បឋមសិក្សា' : 'មធ្យមសិក្សា'}
                </p>
              </div>
            </div>

            {/* Live Real-Time Remaining Time Highlight Box */}
            <div className="relative z-10 p-4 rounded-2xl bg-gradient-to-r from-emerald-950/70 via-purple-950/80 to-amber-950/70 border border-yellow-400/40 shadow-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-yellow-300 flex items-center gap-1.5">
                  <Hourglass className="w-4 h-4 text-yellow-400 animate-spin" />
                  <span>រយៈពេលនៅសល់នៃដំណើរការជាក់ស្ដែង៖</span>
                </span>
                <span className="px-3 py-1 rounded-xl bg-yellow-400 text-black text-sm font-black font-['Outfit'] shadow-md">
                  ~{Math.max(1, estimatedTotalSeconds - elapsedSeconds)} វិនាទី
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center pt-1 border-t border-white/10 text-[11px]">
                <div className="text-purple-300 font-bold">
                  <span>⏱️ ប៉ាន់ស្មានសរុប៖ </span>
                  <span className="text-white font-['Outfit'] font-extrabold">~{estimatedTotalSeconds} វិ.</span>
                </div>
                <div className="text-cyan-300 font-bold">
                  <span>⏳ កន្លងផុត៖ </span>
                  <span className="text-white font-['Outfit'] font-extrabold">{elapsedSeconds} វិ.</span>
                </div>
              </div>
            </div>

            {/* Dynamic Animated Progress Bar */}
            <div className="relative z-10 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-purple-200">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" />
                  <span>ដំណើរការ (Progress):</span>
                </span>
                <span className="text-yellow-300 font-['Outfit'] font-black text-sm">
                  {progressPercent}%
                </span>
              </div>

              <div className="w-full h-3.5 rounded-full bg-black/60 p-0.5 border border-white/15 overflow-hidden">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-400 transition-all duration-500 shadow-md relative"
                  style={{ width: `${progressPercent}%` }}
                >
                  <div className="absolute right-0 top-0 bottom-0 w-3 bg-white/80 rounded-full blur-xs animate-pulse" />
                </div>
              </div>
            </div>

            {/* Current Stage Explanation */}
            <div className="relative z-10 p-3.5 rounded-2xl bg-purple-900/30 border border-purple-400/30 text-left space-y-1">
              <p className="text-xs font-bold text-yellow-300 flex items-center gap-1.5">
                <span>{currentStage.title}</span>
              </p>
              <p className="text-[11px] text-purple-200/80 leading-relaxed font-normal">
                {currentStage.desc}
              </p>
            </div>

            {/* Friendly Network & API Notice */}
            <p className="relative z-10 text-[10px] text-purple-300/60 leading-tight">
              ⚡ រយៈពេលអាចប្រែប្រួលបន្តិចបន្តួចទៅតាមល្បឿន Internet និងការឆ្លើយតបរបស់ Gemini AI API។ សូមអរគុណសម្រាប់ការរង់ចាំ!
            </p>
          </div>
        </div>
      )}

      {/* Main Generator Dialog (backdrop + centering) */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-khmer">
        <div className="glass-panel border border-purple-400/30 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col justify-between overflow-hidden shadow-2xl bg-[#1d0638]">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-white/10 flex items-start sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg shrink-0">
              <Sparkles className="w-5 h-5 text-yellow-200 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-white flex flex-wrap items-center gap-2">
                <span className="truncate">{generatedQuestions ? (lang === 'km' ? 'លទ្ធផលសំណួរដែលបង្កើតដោយ AI' : 'AI Generated Quiz Results') : 'Gemini AI Quiz Generator'}</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-400/30 whitespace-nowrap">Google Gemini</span>
              </h2>
              <p className="text-xs text-purple-200/70 truncate">
                {generatedQuestions 
                  ? (lang === 'km' ? `បានបង្កើត ${generatedQuestions.length} សំណួររួចរាល់ • សូមពិនិត្យ ឬចុចរក្សាទុក` : `Generated ${generatedQuestions.length} questions • Please review or save`)
                  : (lang === 'km' ? 'បង្កើតសំណួរ ជម្រើស ៤ និងការពន្យល់ស្វ័យប្រវត្តជាភាសាខ្មែរ' : 'Generate 4-choice questions and explanations automatically')}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="shrink-0 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">

          {/* ================================================================ */}
          {/* SUCCESS FLASH: Shown briefly after saving, then resets to form    */}
          {/* ================================================================ */}
          {savedSuccess ? (
            <div className="flex flex-col items-center justify-center py-16 gap-6 animate-scale-in">
              {/* Glow ring */}
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-emerald-400/30 blur-2xl scale-150 animate-pulse" />
                <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center shadow-2xl shadow-emerald-900/60">
                  <Check className="w-12 h-12 text-white" strokeWidth={3} />
                </div>
              </div>
              {/* Message */}
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-black text-white">🎉 រក្សាទុករួចរាល់!</h3>
                <p className="text-sm text-emerald-300 font-bold">សំណួរត្រូវបានបញ្ចូលក្នុងបណ្ណាល័យដោយជោគជ័យ</p>
                <p className="text-xs text-purple-300/70">⏳ ត្រៀមខ្លួនបង្កើតសំណួរថ្មីក្នុងពេលបន្តិចទៀត...</p>
              </div>
              {/* Progress bar */}
              <div className="w-48 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-green-500 rounded-full"
                  style={{ animation: 'progress-fill 2.1s linear forwards' }}
                />
              </div>
              {/* Skip button */}
              <button
                onClick={resetForNextBatch}
                className="text-xs text-purple-300 hover:text-white underline underline-offset-2 transition-colors mt-2"
              >
                ចុចនេះដើម្បីចាប់ផ្ដើមបង្កើតភ្លាម →
              </button>
            </div>
          ) : (
          <>
          {/* ================================================================ */}
          {/* 1. CONFIGURATION FORM: SHOWN ONLY BEFORE GENERATING QUESTIONS    */}
          {/* ================================================================ */}
          {!generatedQuestions ? (
            <>
              {/* Topic / Content Input */}
              <div>
                <label className="block text-xs font-bold text-purple-200 mb-1.5 flex items-center justify-between">
                  <span>{lang === 'km' ? 'ប្រធានបទ ឬអត្ថបទសង្ខេបមេរៀន (Topic / Lesson Outline)' : 'Topic / Lesson Outline'}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-purple-300/60 font-normal">{lang === 'km' ? 'ភាសាខ្មែរ ឬ អង់គ្លេស' : 'Khmer or English'}</span>
                    <label className={`cursor-pointer px-2 py-1 rounded border border-white/20 text-[10px] font-bold flex items-center gap-1.5 transition-all relative overflow-hidden ${uploadingFile ? 'bg-purple-900/80 text-purple-200 cursor-wait' : 'bg-white/10 hover:bg-purple-500/30 text-white'}`}>
                      {/* Upload Progress Bar Background */}
                      {uploadingFile && uploadProgress !== null && (
                        <div 
                          className="absolute inset-0 bg-emerald-500/30 transition-all duration-300 ease-out" 
                          style={{ width: `${uploadProgress}%` }}
                        />
                      )}
                      <div className="relative z-10 flex items-center gap-1.5">
                        {uploadingFile ? <Loader2 className="w-3 h-3 animate-spin text-emerald-400" /> : <Upload className="w-3 h-3" />}
                        <span>
                          {uploadingFile 
                            ? (uploadProgress !== null && uploadProgress < 100 
                                ? `កំពុងបញ្ជូន... ${uploadProgress}%` 
                                : `កំពុងអានអត្ថបទ... ⏳`)
                            : 'Upload File (PDF/DOCX)'}
                        </span>
                      </div>
                      <input type="file" className="hidden" accept=".pdf,.docx,.txt,image/*" onChange={handleFileUpload} disabled={uploadingFile} />
                    </label>
                  </div>
                </label>
                <textarea
                  rows={3}
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="ឧ. វិធីសាស្ត្របង្រៀនតាមបែបសហការ និង Peer Instruction ក្នុងកម្រិតឧត្តមសិក្សា..."
                  className="w-full bg-black/40 border border-white/15 rounded-2xl p-3.5 text-sm text-white placeholder-purple-300/40 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all font-khmer"
                />
                
                {/* Selected File Indicator */}
                {lessonFile && (
                  <div className="flex items-center justify-between mt-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <div className="flex items-center gap-2 text-xs text-emerald-300 font-bold">
                      <FileText className="w-4 h-4" />
                      <span className="truncate max-w-[200px] sm:max-w-xs">{lessonFile}</span>
                      <span className="text-emerald-400/60 font-mono text-[10px]">({lessonText.length} ជួអក្សរ)</span>
                    </div>
                    <button type="button" onClick={() => { setLessonFile(null); setLessonText(''); if (topic.startsWith('វិញ្ញាសាដកស្រង់ពី៖')) setTopic(''); }} className="text-red-400 hover:text-red-300 p-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Quick Topic Suggestions */}
                <div className="flex flex-wrap items-center gap-1.5 pt-2">
                  <span className="text-[10px] text-purple-300 font-bold">💡 ប្រធានបទគំរូសាកល្បង៖</span>
                  {[
                    'វិធីសាស្ត្របង្រៀនគរុកោសល្យ',
                    'បច្ចេកវិទ្យា ICT និង AI',
                    'ប្រវត្តិសាស្ត្រកម្ពុជា',
                    'វិញ្ញាសាគណិតវិទ្យា',
                    'English Vocabulary Quiz'
                  ].map((sample) => (
                    <button
                      key={sample}
                      type="button"
                      onClick={() => setTopic(sample)}
                      className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-amber-400/20 text-purple-200 hover:text-yellow-300 text-[10px] border border-white/10 transition-all"
                    >
                      + {sample}
                    </button>
                  ))}
                </div>
              </div>

              {/* Level, Question Count, and AI Model */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-purple-200 mb-1.5">{lang === 'km' ? 'កម្រិតសិក្សា (Level)' : 'Education Level'}</label>
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-amber-400 font-khmer"
                  >
                    <option value="university">🏛️ {lang === 'km' ? 'ឧត្តមសិក្សា' : 'University'}</option>
                    <option value="highschool">🎓 {lang === 'km' ? 'វិទ្យាល័យ' : 'High School'}</option>
                    <option value="secondary">🧑‍🎓 {lang === 'km' ? 'មធ្យមសិក្សា' : 'Secondary School'}</option>
                    <option value="primary">👦 {lang === 'km' ? 'បឋមសិក្សា' : 'Primary School'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-purple-200 mb-1.5">{lang === 'km' ? 'ចំនួនសំណួរ (Count)' : 'Questions Count'}</label>
                  <select
                    value={count}
                    onChange={(e) => setCount(e.target.value)}
                    className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-amber-400 font-khmer"
                  >
                    <option value="3">{lang === 'km' ? '៣ សំណួរ (រហ័ស - Quick Test)' : '3 Questions (Quick Test)'}</option>
                    <option value="5">{lang === 'km' ? '៥ សំណួរ (ស្តង់ដារ)' : '5 Questions (Standard)'}</option>
                    <option value="10">{lang === 'km' ? '១០ សំណួរ (មធ្យម)' : '10 Questions (Medium)'}</option>
                    <option value="15">{lang === 'km' ? '១៥ សំណួរ' : '15 Questions'}</option>
                    <option value="20">{lang === 'km' ? '២០ សំណួរ (ប្រឡងឆមាស)' : '20 Questions (Exam)'}</option>
                    <option value="25">{lang === 'km' ? '២៥ សំណួរ' : '25 Questions'}</option>
                    <option value="30">{lang === 'km' ? '៣០ សំណួរ (វិញ្ញាសាធំ)' : '30 Questions (Large)'}</option>
                    <option value="40">{lang === 'km' ? '៤០ សំណួរ' : '40 Questions'}</option>
                    <option value="50">{lang === 'km' ? '៥០ សំណួរ (ប្រឡងថ្នាក់ជាតិ/បាក់ឌុប)' : '50 Questions (National Exam)'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-amber-300 mb-1.5 flex items-center gap-1">
                    <span>ម៉ូឌែល AI (Model)</span>
                    <span className="text-[10px] bg-amber-400/20 text-yellow-300 px-1.5 py-0.2 rounded font-bold">PRO</span>
                  </label>
                  <select
                    value={modelTier}
                    onChange={(e) => setModelTier(e.target.value)}
                    className="w-full bg-black/40 border border-amber-400/40 rounded-xl px-3 py-2 text-xs font-bold text-amber-300 focus:outline-none focus:border-amber-400 font-khmer"
                  >
                    <option value="flash">⚡ Gemini 3.5 Flash (Ultra Fast - លឿនបំផុត)</option>
                    <option value="pro">👑 Gemini Pro (Deep Pedagogical Reasoning)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-cyan-300 mb-1.5 flex items-center gap-1">
                    <Layers className="w-4 h-4" />
                    <span>ប្រភេទតេស្ត (Test Type)</span>
                  </label>
                  <select
                    value={testType}
                    onChange={(e) => { sound.playClick(); setTestType(e.target.value); }}
                    className="w-full bg-black/40 border border-cyan-400/40 rounded-xl px-3 py-2 text-xs font-bold text-cyan-200 focus:outline-none focus:border-cyan-400 font-khmer"
                  >
                    <option value="post-test">🟢 Post-Test (វាស់ស្ទង់សមត្ថភាពក្រោយរៀន)</option>
                    <option value="pre-test">🔵 Pre-Test (វាស់ស្ទង់ចំណេះដឹងមុនរៀន)</option>
                  </select>
                </div>
              </div>


              {/* Bloom's Taxonomy Cognitive Scale Badge */}
              <div className="bg-purple-950/50 border border-purple-400/30 p-3 rounded-2xl flex items-start gap-2.5 text-xs text-purple-200">
                <Layers className="w-4 h-4 text-cyan-300 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-cyan-300 block mb-0.5">
                    🧠 ស្ដង់ដារគរុកោសល្យ Bloom's Taxonomy (Scale {testType === 'pre-test' ? '6-3-1' : '2-6-2'})
                  </span>
                  <p className="text-[11px] text-purple-200/80 leading-relaxed">
                    {testType === 'pre-test'
                      ? 'សំណួរត្រូវបានបែងចែក៖ ៦០% ងាយ (Remember/Understand), ៣០% មធ្យម (Apply/Analyze), ១០% ស៊ីជម្រៅ (Evaluate/Create)។ សមស្របសម្រាប់ស្វែងយល់ចំណេះដឹងមូលដ្ឋានរបស់សិស្សមុនពេលបង្រៀន។'
                      : 'សំណួរត្រូវបានបែងចែក៖ ២០% ងាយ (Remember/Understand), ៦០% មធ្យម (Apply/Analyze), ២០% ស៊ីជម្រៅ (Evaluate/Create)។ សមស្របសម្រាប់វាស់ស្ទង់ការដោះស្រាយបញ្ហា និងការគិតស៊ីជម្រៅក្រោយពេលបង្រៀន។'}
                  </p>
                </div>
              </div>

              {/* Gemini API Key Section (Always Visible & Interactive) */}
              <div className="p-4 rounded-2xl bg-black/40 border border-purple-500/30 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-yellow-400" />
                    <span className="text-xs font-bold text-white">Gemini API Key ផ្ទាល់ខ្លួនរបស់អ្នក</span>
                    {apiKey ? (
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/40 font-bold flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        <span>បានភ្ជាប់ Key ផ្ទាល់ខ្លួន</span>
                      </span>
                    ) : isPro ? (
                      <span className="text-[10px] bg-amber-500/20 text-yellow-300 px-2 py-0.5 rounded-full border border-yellow-500/40 font-bold flex items-center gap-1">
                        <span>👑 គណនី Pro (Unlimited AI)</span>
                      </span>
                    ) : (
                      <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2.5 py-0.5 rounded-full border border-purple-500/30 font-bold flex items-center gap-1">
                        <span>✨ សាកល្បងឥតគិតថ្លៃ៖</span>
                        <span className={`font-black ${aiUsageCount >= 10 ? 'text-red-400' : 'text-yellow-300'}`}>
                          {Math.max(0, 10 - aiUsageCount)}/10 លើក
                        </span>
                      </span>
                    )}
                  </div>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-yellow-300 hover:text-yellow-200 bg-yellow-400/10 hover:bg-yellow-400/20 border border-yellow-400/30 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all"
                  >
                    <span>🔑 ចុចទីនេះដើម្បីយក API Key ឥតគិតថ្លៃ (Free)</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {/* Conditionally visible input box & Test Button */}
                {!isEditingKey && apiKey ? (
                  <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3">
                    <span className="text-emerald-300 text-xs font-bold flex items-center gap-2">
                      <Check className="w-4 h-4"/> {lang === 'km' ? 'បានភ្ជាប់ API Key រួចរាល់' : 'API Key Connected'}
                    </span>
                    <button 
                      type="button"
                      onClick={() => setIsEditingKey(true)} 
                      className="text-[11px] text-gray-400 hover:text-white transition-colors flex items-center gap-1"
                    >
                      <Pencil className="w-3.5 h-3.5" /> {lang === 'km' ? 'កែប្រែ' : 'Edit'}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <div className="relative flex-1 flex items-center">
                        <input
                          type={showKeyVisible ? "text" : "password"}
                          value={apiKey}
                          onChange={(e) => {
                            const val = e.target.value;
                            setApiKey(val);
                            setKeyTestStatus(null);
                            if (val.trim()) {
                              localStorage.setItem('gemini_api_key', val.trim());
                            } else {
                              localStorage.removeItem('gemini_api_key');
                            }
                          }}
                          placeholder="បិទភ្ជាប់ Google AI Studio API Key នៅទីនេះ (ឧ. AIzaSy...)"
                          className="w-full bg-black/60 border border-white/20 rounded-xl pl-3.5 pr-20 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 font-mono transition-all"
                        />
                        <div className="absolute right-2 flex items-center gap-1.5">
                          {apiKey && (
                            <button
                              type="button"
                              onClick={() => {
                                setApiKey('');
                                setKeyTestStatus(null);
                                localStorage.removeItem('gemini_api_key');
                              }}
                              className="p-1 rounded-md text-gray-400 hover:text-red-400 transition-colors text-[11px]"
                              title="លុប API Key"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setShowKeyVisible(!showKeyVisible)}
                            className="p-1 rounded-md text-gray-400 hover:text-yellow-300 transition-colors"
                            title={showKeyVisible ? "លាក់ API Key" : "បង្ហាញ API Key"}
                          >
                            {showKeyVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      {apiKey && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingKey(false);
                            handleTestKey();
                          }}
                          className="px-3.5 py-2.5 rounded-xl bg-purple-600/60 hover:bg-purple-600 border border-purple-400/40 text-xs font-bold text-white flex items-center justify-center gap-1.5 shrink-0 transition-all disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5 text-yellow-300" />
                          <span>{lang === 'km' ? 'រក្សាទុក & តេស្ត' : 'Save & Test'}</span>
                        </button>
                      )}
                    </div>

                    {keyTestStatus && (
                      <div className={`p-2.5 rounded-xl text-xs font-bold border flex items-center gap-2 ${
                        keyTestStatus.success ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200' : 'bg-red-500/20 border-red-500/40 text-red-200'
                      }`}>
                        <span>{keyTestStatus.success ? '✅' : '❌'}</span>
                        <span>{keyTestStatus.message}</span>
                      </div>
                    )}
                  </>
                )}

                <p className="text-[11px] text-purple-200/70">
                  {apiKey ? (
                    <span className="text-emerald-300 font-bold">
                      ✨ API Key ផ្ទាល់ខ្លួនត្រូវបានចងចាំក្នុង Browser របស់អ្នក សម្រាប់បង្កើតសំណួររហ័សគ្មានដែនកំណត់។
                    </span>
                  ) : isPro ? (
                    <span className="text-yellow-300 font-bold">
                      👑 គណនី Pro របស់អ្នកទទួលបានសិទ្ធិបង្កើតសំណួរ AI មិនកំណត់ តាមរយៈ Server!
                    </span>
                  ) : (
                    <span>
                      💡 <strong>មិនទាន់មាន API Key មែនទេ?</strong> ទុកប្រអប់ខាងលើឱ្យនៅទទេ ដើម្បីសាកល្បងដោយឥតគិតថ្លៃ (កូតា ១០ លើក)។
                    </span>
                  )}
                </p>

                {!apiKey && !isPro && aiUsageCount >= 10 && (
                  <div className="p-3 rounded-xl bg-red-500/20 border border-red-400/40 text-red-200 text-xs font-bold flex items-start gap-2">
                    <span>⚠️</span>
                    <span>លោកគ្រូ/អ្នកគ្រូ បានសាកល្បងបង្កើត AI ឥតគិតថ្លៃគ្រប់ ១០ លើកហើយ! សូមបញ្ចូល Gemini API Key ផ្ទាល់ខ្លួនខាងលើ ឬ Upgrade ទៅកាន់ Pro ដើម្បីបន្តបង្កើតសំណួរដោយ AI។</span>
                  </div>
                )}
              </div>

              {/* Pre-Generation Estimated Time Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-purple-900/40 to-black/60 border border-amber-400/40 flex items-center justify-between gap-3 shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-yellow-300 shrink-0">
                    <Clock className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">
                      រយៈពេលរង់ចាំប៉ាន់ស្មាន (Est. Generating Time):
                    </span>
                    <span className="text-[11px] text-yellow-200/90 block font-medium">
                      សូមលោកគ្រូ អ្នកគ្រូមេត្តារង់ចាំ យើងខ្ញុំកំពុងបង្កើត {count} សំណួរជូន...
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="px-3 py-1.5 rounded-xl bg-amber-400/20 text-yellow-300 text-xs sm:text-sm font-black border border-amber-400/30 inline-block font-['Outfit'] shadow-sm">
                    ⏱️ ~{estimatedTotalSeconds} វិនាទី
                  </span>
                </div>
              </div>

              {/* Action Submit Button */}
              <button
                type="button"
                onClick={handleGenerate}
                disabled={loading}
                className={`w-full py-4 rounded-2xl font-bold text-xs sm:text-sm shadow-xl flex items-center justify-center gap-2 transition-all ${
                  loading
                    ? 'bg-purple-800 text-purple-200 cursor-not-allowed opacity-80'
                    : 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-white shadow-orange-950/60 hover:scale-[1.02] active:scale-[0.98]'
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-yellow-300" />
                    <span>សូមលោកគ្រូ អ្នកគ្រូមេត្តារង់ចាំ... (សល់ ~{Math.max(1, estimatedTotalSeconds - elapsedSeconds)} វិ.)</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 text-yellow-200 animate-pulse" />
                    <span>បង្កើត {count} សំណួរឥឡូវនេះ (រយៈពេលប៉ាន់ស្មាន ~{estimatedTotalSeconds} វិនាទី)</span>
                  </>
                )}
              </button>
            </>
          ) : (
            /* ================================================================ */
            /* 2. GENERATED QUESTIONS CLEAN VIEW (FORM INPUTS HIDDEN)          */
            /* ================================================================ */
            <div className="space-y-4 animate-pop-in">
              {/* Success Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-purple-900/30 to-black/50 border border-emerald-400/40 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 flex items-center justify-center shrink-0">
                    <Check className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                      <span>🎉 បានបង្កើត {generatedQuestions.length} សំណួរដោយជោគជ័យ!</span>
                    </h3>
                    <p className="text-xs text-purple-200/70">
                      ប្រធានបទ៖ <strong className="text-white">"{topic}"</strong> • កម្រិត៖ {level === 'university' ? 'ឧត្តមសិក្សា' : level === 'highschool' ? 'វិទ្យាល័យ' : level === 'primary' ? 'បឋមសិក្សា' : 'មធ្យមសិក្សា'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setGeneratedQuestions(null)}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-yellow-300 text-xs font-bold flex items-center gap-1.5 transition-all border border-white/15 hover:scale-105"
                  title="ត្រឡប់ទៅកែប្រែប្រធានបទ ឬបង្កើតជាថ្មី"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>បង្កើតជាថ្មី (Edit Topic)</span>
                </button>
              </div>

              {/* Editable Quiz Title */}
              <div>
                <label className="block text-xs font-bold text-purple-200 mb-1">
                  ចំណងជើងវិញ្ញាសា (Quiz Title):
                </label>
                <input
                  type="text"
                  value={quizTitle}
                  onChange={(e) => setQuizTitle(e.target.value)}
                  placeholder="វាយបញ្ចូលចំណងជើងវិញ្ញាសា..."
                  className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold text-white focus:outline-none focus:border-amber-400 font-khmer shadow-inner"
                />
              </div>

              {/* Questions List Card */}
              <div className="space-y-3 max-h-[48vh] overflow-y-auto pr-1">
                {generatedQuestions.map((q, qIdx) => {
                  const isEditing = editingQIdx === qIdx;

                  const updateField = (field, value) => {
                    const updated = [...generatedQuestions];
                    updated[qIdx] = { ...updated[qIdx], [field]: value };
                    setGeneratedQuestions(updated);
                  };

                  const updateOption = (oIdx, value) => {
                    const updated = [...generatedQuestions];
                    const opts = [...updated[qIdx].options];
                    opts[oIdx] = value;
                    updated[qIdx] = { ...updated[qIdx], options: opts };
                    setGeneratedQuestions(updated);
                  };

                  return (
                    <div
                      key={q.id || qIdx}
                      className={`rounded-2xl space-y-3 text-xs shadow-sm transition-all border ${
                        isEditing
                          ? 'bg-indigo-950/60 border-amber-400/50 shadow-amber-950/40 shadow-lg p-4'
                          : 'bg-white/5 border-white/10 hover:border-purple-400/40 p-4'
                      }`}
                    >
                      {/* Question Header Row */}
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-white text-xs sm:text-sm leading-snug flex items-start gap-2 flex-1 min-w-0">
                          <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-yellow-300 border border-amber-400/30 flex items-center justify-center text-[11px] font-['Outfit'] font-black shrink-0 mt-0.5">
                            {qIdx + 1}
                          </span>
                          {isEditing ? (
                            <textarea
                              rows={2}
                              value={q.question}
                              onChange={(e) => updateField('question', e.target.value)}
                              className="w-full bg-black/50 border border-amber-400/50 rounded-xl px-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-amber-300 font-khmer resize-none"
                            />
                          ) : (
                            <span className="break-words">{q.question}</span>
                          )}
                        </span>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="px-2 py-0.5 rounded-full bg-black/40 text-[10px] text-purple-300 font-['Outfit'] font-bold">
                            ⏱️ {q.timeLimit || timeLimitPerQuestion}s
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              sound.playClick();
                              setEditingQIdx(isEditing ? null : qIdx);
                            }}
                            className={`p-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 ${
                              isEditing
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 hover:bg-emerald-500/30'
                                : 'bg-amber-500/15 text-yellow-300 border border-amber-400/30 hover:bg-amber-500/25'
                            }`}
                            title={isEditing ? 'បញ្ចប់ការកែ (Done Editing)' : 'កែសម្រួលសំណួរ (Edit Question)'}
                          >
                            {isEditing ? <Check className="w-3.5 h-3.5" /> : <Pencil className="w-3 h-3" />}
                            <span>{isEditing ? 'រួចរាល់' : 'កែ'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Answer Options */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {q.options.map((opt, oIdx) => (
                          <div
                            key={oIdx}
                            className={`rounded-xl flex items-center gap-2 transition-all ${
                              oIdx === q.correctIndex
                                ? 'bg-emerald-600/30 border border-emerald-400/60 shadow-sm'
                                : 'bg-black/30 border border-white/5'
                            } ${isEditing ? 'p-2' : 'p-2.5'}`}
                          >
                            {isEditing ? (
                              /* Editing mode: radio to pick correct answer + editable option text */
                              <>
                                <button
                                  type="button"
                                  onClick={() => { sound.playClick(); updateField('correctIndex', oIdx); }}
                                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                                    oIdx === q.correctIndex
                                      ? 'border-emerald-400 bg-emerald-500'
                                      : 'border-white/30 hover:border-amber-400'
                                  }`}
                                  title="ចុចដើម្បីកំណត់ជាចម្លើយត្រូវ"
                                >
                                  {oIdx === q.correctIndex && <div className="w-2 h-2 rounded-full bg-white" />}
                                </button>
                                <span className="w-5 h-5 rounded-md bg-white/10 flex items-center justify-center text-[10px] font-black shrink-0 text-gray-300">
                                  {choiceIcons[oIdx]}
                                </span>
                                <input
                                  type="text"
                                  value={opt}
                                  onChange={(e) => updateOption(oIdx, e.target.value)}
                                  className={`flex-1 bg-black/40 border rounded-lg px-2 py-1 text-xs text-white focus:outline-none font-khmer min-w-0 ${
                                    oIdx === q.correctIndex
                                      ? 'border-emerald-400/60 text-emerald-200 font-bold'
                                      : 'border-white/15 text-gray-200'
                                  }`}
                                />
                                {oIdx === q.correctIndex && (
                                  <span className="text-emerald-400 text-[10px] font-bold shrink-0">✓</span>
                                )}
                              </>
                            ) : (
                              /* View mode */
                              <>
                                <span className="w-5 h-5 rounded-md bg-white/10 flex items-center justify-center text-[10px] font-black shrink-0">
                                  {choiceIcons[oIdx]}
                                </span>
                                <span className={`truncate flex-1 ${
                                  oIdx === q.correctIndex ? 'text-emerald-200 font-bold' : 'text-gray-300'
                                }`}>{opt}</span>
                                {oIdx === q.correctIndex && (
                                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                )}
                              </>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Edit Mode Helper Text */}
                      {isEditing && (
                        <p className="text-[10px] text-amber-300/70 italic bg-amber-400/5 border border-amber-400/20 rounded-lg px-2.5 py-1.5">
                          💡 ចុចប៊ូតុងរង្វង់ (●) ខាងឆ្វេងដើម្បីផ្លាស់ប្ដូរចម្លើយត្រឹមត្រូវ ហើយចុច <strong>[រួចរាល់]</strong> ដើម្បីបញ្ចប់ការកែ
                        </p>
                      )}

                      {/* Explanation */}
                      {(q.explanation || isEditing) && (
                        <div className="pt-1 border-t border-white/5">
                          {isEditing ? (
                            <div className="flex items-start gap-1.5">
                              <span className="font-bold text-yellow-300 text-[11px] shrink-0 pt-1">💡</span>
                              <textarea
                                rows={2}
                                value={q.explanation || ''}
                                onChange={(e) => updateField('explanation', e.target.value)}
                                placeholder="ការពន្យល់ (Explanation)..."
                                className="w-full bg-black/40 border border-purple-400/30 rounded-lg px-2 py-1 text-[11px] text-purple-200 focus:outline-none font-khmer italic resize-none"
                              />
                            </div>
                          ) : (
                            <p className="text-[11px] text-purple-200/90 italic flex items-start gap-1.5 leading-relaxed">
                              <span className="font-bold text-yellow-300 not-italic shrink-0">💡 ការពន្យល់៖</span>
                              <span>{q.explanation}</span>
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          </>
          )}
        </div>

        {/* Modal Footer */}
        {generatedQuestions && !savedSuccess && (
          <div className="p-4 bg-black/40 border-t border-white/10 flex items-center justify-between gap-3">
            <button
              onClick={() => setGeneratedQuestions(null)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:text-white flex items-center gap-1.5 bg-white/5 hover:bg-white/10 transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>កែប្រែប្រធានបទ</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:text-white"
              >
                បោះបង់
              </button>
              <button
                onClick={handleSaveToLibrary}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-bold text-xs shadow-lg flex items-center gap-1.5 hover:scale-105 active:scale-95 transition-all"
              >
                <Check className="w-4 h-4" />
                <span>រក្សាទុកក្នុងបណ្ណាល័យ (Save to Library)</span>
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
    </>
  );
}
