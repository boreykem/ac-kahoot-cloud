import React, { useState } from 'react';
import { Plus, Trash2, Save, ArrowLeft, Clock, Award, CheckCircle, Image as ImageIcon, HelpCircle, Sparkles, Shuffle, Printer, Edit3, Link as LinkIcon } from 'lucide-react';
import { sound } from '../utils/audioEngine';
import AIGeneratorModal from './AIGeneratorModal.jsx';

export default function QuizEditor({ initialQuiz, onSave, onCancel, currentUser, lang = 'km' }) {
  const [title, setTitle] = useState(initialQuiz?.title || '');
  const [description, setDescription] = useState(initialQuiz?.description || '');
  const [level, setLevel] = useState(initialQuiz?.level || 'university');
  const [category, setCategory] = useState(initialQuiz?.category || 'គរុកោសល្យ');
  const [image, setImage] = useState(initialQuiz?.image || 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&auto=format&fit=crop&q=80');
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [questions, setQuestions] = useState(
    initialQuiz?.questions || [
      {
        id: 'q1',
        question: '',
        timeLimit: 20,
        points: 10,
        options: ['', '', '', ''],
        correctIndex: 0,
        explanation: ''
      }
    ]
  );
  const [activeQIndex, setActiveQIndex] = useState(0);

  const handleAppendAIQuestions = (aiQuestions) => {
    sound.playCorrect();
    // Filter out initial empty question if user hasn't typed anything in it
    const existing = questions.filter(q => 
      (q.question && q.question.trim().length > 0) || 
      (q.options && q.options.some(o => (o || '').trim().length > 0)) ||
      (q.acceptedAnswers && q.acceptedAnswers.length > 0) ||
      (q.pairs && q.pairs.length > 0)
    );
    const combined = [...existing, ...aiQuestions];
    setQuestions(combined);
    setActiveQIndex(Math.max(0, combined.length - aiQuestions.length));
  };

  const handleShuffleChoices = (idx = activeQIndex) => {
    sound.playClick();
    const updated = [...questions];
    const q = updated[idx];
    if (!q || !q.options || q.options.length <= 1) return;
    const correctText = q.options[q.correctIndex || 0];

    const shuffled = [...q.options];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const newCorrectIndex = shuffled.indexOf(correctText);
    updated[idx] = {
      ...q,
      options: shuffled,
      correctIndex: newCorrectIndex >= 0 ? newCorrectIndex : 0
    };
    setQuestions(updated);
  };

  const handleShuffleAllQuestions = () => {
    if (questions.length <= 1) return;
    sound.playClick();
    const shuffled = [...questions];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setQuestions(shuffled);
    setActiveQIndex(0);
  };

  const handleAddQuestion = (type = 'multiple_choice') => {
    sound.playClick();
    let newQ = {
      id: `q_${Date.now()}`,
      type,
      question: '',
      timeLimit: 20,
      points: 10,
      explanation: ''
    };

    if (type === 'true_false') {
      newQ.options = ['ត្រូវ (True)', 'ខុស (False)'];
      newQ.correctIndex = 0;
    } else if (type === 'fill_blank') {
      newQ.timeLimit = 30;
      newQ.acceptedAnswers = [''];
    } else if (type === 'matching') {
      newQ.timeLimit = 45;
      newQ.pairs = [
        { left: '', right: '' },
        { left: '', right: '' },
        { left: '', right: '' }
      ];
    } else {
      newQ.type = 'multiple_choice';
      newQ.options = ['', '', '', ''];
      newQ.correctIndex = 0;
    }

    setQuestions([...questions, newQ]);
    setActiveQIndex(questions.length);
  };

  const handleChangeQuestionType = (newType) => {
    sound.playClick();
    const currentQ = questions[activeQIndex] || {};
    const updated = [...questions];

    if (newType === 'true_false') {
      updated[activeQIndex] = {
        ...currentQ,
        type: 'true_false',
        options: ['ត្រូវ (True)', 'ខុស (False)'],
        correctIndex: (currentQ.correctIndex && currentQ.correctIndex > 1) ? 0 : (currentQ.correctIndex || 0)
      };
    } else if (newType === 'fill_blank') {
      const existingAnswers = currentQ.acceptedAnswers && currentQ.acceptedAnswers.length > 0
        ? currentQ.acceptedAnswers
        : (currentQ.options && currentQ.options[currentQ.correctIndex || 0] ? [currentQ.options[currentQ.correctIndex || 0]] : ['']);
      updated[activeQIndex] = {
        ...currentQ,
        type: 'fill_blank',
        acceptedAnswers: existingAnswers,
        timeLimit: Math.max(20, currentQ.timeLimit || 30)
      };
    } else if (newType === 'matching') {
      const existingPairs = currentQ.pairs && currentQ.pairs.length >= 2
        ? currentQ.pairs
        : [
            { left: '', right: '' },
            { left: '', right: '' },
            { left: '', right: '' }
          ];
      updated[activeQIndex] = {
        ...currentQ,
        type: 'matching',
        pairs: existingPairs,
        timeLimit: Math.max(30, currentQ.timeLimit || 45)
      };
    } else {
      const existingOpts = currentQ.options || [];
      updated[activeQIndex] = {
        ...currentQ,
        type: 'multiple_choice',
        options: [
          existingOpts[0] || '',
          existingOpts[1] || '',
          existingOpts[2] || '',
          existingOpts[3] || ''
        ],
        correctIndex: currentQ.correctIndex || 0
      };
    }
    setQuestions(updated);
  };

  // Handlers for Fill-in-the-blank accepted answers
  const handleAddAcceptedAnswer = () => {
    sound.playClick();
    const currentQ = questions[activeQIndex] || {};
    const answers = [...(currentQ.acceptedAnswers || ['']), ''];
    handleUpdateCurrentQ('acceptedAnswers', answers);
  };

  const handleUpdateAcceptedAnswer = (ansIdx, val) => {
    const currentQ = questions[activeQIndex] || {};
    const answers = [...(currentQ.acceptedAnswers || [''])];
    answers[ansIdx] = val;
    handleUpdateCurrentQ('acceptedAnswers', answers);
  };

  const handleRemoveAcceptedAnswer = (ansIdx) => {
    sound.playClick();
    const currentQ = questions[activeQIndex] || {};
    const answers = (currentQ.acceptedAnswers || ['']).filter((_, i) => i !== ansIdx);
    handleUpdateCurrentQ('acceptedAnswers', answers.length > 0 ? answers : ['']);
  };

  // Handlers for Matching Pairs
  const handleAddPair = () => {
    sound.playClick();
    const currentQ = questions[activeQIndex] || {};
    const pairs = [...(currentQ.pairs || []), { left: '', right: '' }];
    handleUpdateCurrentQ('pairs', pairs);
  };

  const handleUpdatePair = (pairIdx, side, val) => {
    const currentQ = questions[activeQIndex] || {};
    const pairs = [...(currentQ.pairs || [])];
    if (!pairs[pairIdx]) pairs[pairIdx] = { left: '', right: '' };
    pairs[pairIdx] = { ...pairs[pairIdx], [side]: val };
    handleUpdateCurrentQ('pairs', pairs);
  };

  const handleRemovePair = (pairIdx) => {
    sound.playClick();
    const currentQ = questions[activeQIndex] || {};
    const pairs = (currentQ.pairs || []).filter((_, i) => i !== pairIdx);
    handleUpdateCurrentQ('pairs', pairs.length >= 2 ? pairs : [{ left: '', right: '' }, { left: '', right: '' }]);
  };

  const handleShufflePairs = () => {
    sound.playClick();
    const currentQ = questions[activeQIndex] || {};
    const pairs = [...(currentQ.pairs || [])];
    if (pairs.length <= 1) return;
    const shuffled = [...pairs];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    // If order didn't change, rotate by 1
    if (shuffled.every((p, idx) => p.left === pairs[idx].left)) {
      const first = shuffled.shift();
      shuffled.push(first);
    }
    handleUpdateCurrentQ('pairs', shuffled);
  };

  const handleDeleteQuestion = (idx) => {
    if (questions.length <= 1) {
      alert('វិញ្ញាសាត្រូវមានសំណួរយ៉ាងហោចណាស់ ១!');
      return;
    }
    sound.playClick();
    const updated = questions.filter((_, i) => i !== idx);
    setQuestions(updated);
    setActiveQIndex(Math.max(0, activeQIndex - 1));
  };

  const handleUpdateCurrentQ = (field, value) => {
    const updated = [...questions];
    updated[activeQIndex] = {
      ...updated[activeQIndex],
      [field]: value
    };
    setQuestions(updated);
  };

  const handleApplyTimeToAllQuestions = (timeLimit) => {
    sound.playClick();
    const validTime = Math.max(3, parseInt(timeLimit, 10) || 20);
    const updated = questions.map(q => ({ ...q, timeLimit: validTime }));
    setQuestions(updated);
  };

  const handleUpdateOption = (optIdx, val) => {
    const updated = [...questions];
    const opts = [...(updated[activeQIndex].options || [])];
    opts[optIdx] = val;
    updated[activeQIndex].options = opts;
    setQuestions(updated);
  };

  const handleQuestionImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("ទំហំរូបភាពធំពេក! (អតិបរមា 5MB)");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        
        if (width > height && width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        } else if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        handleUpdateCurrentQ('image', compressedBase64);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSave = () => {
    if (!title.trim()) {
      alert('សូមបញ្ចូលចំណងជើងវិញ្ញាសា!');
      return;
    }
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question?.trim()) {
        alert(`សូមបញ្ចូលខ្លឹមសារសំណួរទី ${i + 1}!`);
        setActiveQIndex(i);
        return;
      }

      if (q.type === 'fill_blank') {
        const answers = (q.acceptedAnswers || []).filter(a => a && a.trim().length > 0);
        if (answers.length === 0) {
          alert(`សូមបញ្ចូលចម្លើយត្រឹមត្រូវយ៉ាងហោចណាស់ ១ សម្រាប់សំណួរទី ${i + 1}!`);
          setActiveQIndex(i);
          return;
        }
      } else if (q.type === 'matching') {
        const validPairs = (q.pairs || []).filter(p => p.left && p.left.trim() && p.right && p.right.trim());
        if (validPairs.length < 2) {
          alert(`សូមបញ្ចូលគូផ្គូផ្គងយ៉ាងហោចណាស់ ២ គូ សម្រាប់សំណួរទី ${i + 1}!`);
          setActiveQIndex(i);
          return;
        }
      } else {
        const isTrueFalse = q.type === 'true_false' || (q.options && q.options.length === 2);
        const requiredChoices = isTrueFalse ? 2 : 4;
        for (let j = 0; j < requiredChoices; j++) {
          if (!q.options?.[j]?.trim()) {
            alert(`សូមបំពេញជម្រើសទី ${j + 1} នៃសំណួរទី ${i + 1}!`);
            setActiveQIndex(i);
            return;
          }
        }
      }
    }

    sound.playCorrect();
    const cleanQuestions = questions.map(q => {
      if (q.type === 'fill_blank') {
        return {
          ...q,
          type: 'fill_blank',
          acceptedAnswers: (q.acceptedAnswers || []).map(a => (a || '').trim()).filter(Boolean),
          timeLimit: Math.max(3, parseInt(q.timeLimit, 10) || 30),
          points: parseInt(q.points, 10) || 10
        };
      }

      if (q.type === 'matching') {
        return {
          ...q,
          type: 'matching',
          pairs: (q.pairs || []).map(p => ({ left: (p.left || '').trim(), right: (p.right || '').trim() })).filter(p => p.left && p.right),
          timeLimit: Math.max(3, parseInt(q.timeLimit, 10) || 45),
          points: parseInt(q.points, 10) || 10
        };
      }

      const isTrueFalse = q.type === 'true_false' || (q.options && q.options.length === 2);
      return {
        ...q,
        type: isTrueFalse ? 'true_false' : 'multiple_choice',
        options: isTrueFalse ? (q.options || []).slice(0, 2) : (q.options || []).slice(0, 4),
        timeLimit: Math.max(3, parseInt(q.timeLimit, 10) || 20),
        points: parseInt(q.points, 10) || 10,
        correctIndex: parseInt(q.correctIndex, 10) || 0
      };
    });

    const finalQuiz = {
      id: initialQuiz?.id || `quiz_${Date.now()}`,
      title,
      description,
      level,
      category,
      image,
      questions: cleanQuestions
    };
    onSave(finalQuiz);
  };

  const printQuizToPDF = () => {
    const printWindow = window.open('', '', 'height=800,width=800');
    if (!printWindow) {
      alert("សូមអនុញ្ញាត (Allow Popups) ដើម្បីអាចព្រីនវិញ្ញាសាបាន!");
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="km">
      <head>
        <meta charset="UTF-8">
        <title>${title || 'វិញ្ញាសា'}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Battambang:wght@400;700&display=swap');
          body {
            font-family: 'Battambang', Arial, sans-serif;
            margin: 40px;
            color: #000;
            line-height: 1.6;
          }
          h1 { text-align: center; font-size: 24px; margin-bottom: 10px; }
          .desc { text-align: center; font-size: 14px; color: #555; margin-bottom: 30px; }
          .meta { text-align: center; font-size: 14px; margin-bottom: 30px; font-weight: bold; }
          .q-container { margin-bottom: 25px; page-break-inside: avoid; }
          .q-title { font-size: 16px; font-weight: bold; margin-bottom: 10px; }
          .q-image { max-width: 100%; height: auto; max-height: 200px; display: block; margin: 10px 0; border-radius: 8px; }
          .options { list-style-type: lower-alpha; margin-left: 20px; }
          .option { margin-bottom: 5px; font-size: 15px; }
          .correct { font-weight: bold; text-decoration: underline; }
          .explanation { font-size: 13px; font-style: italic; color: #444; margin-top: 5px; background: #f9f9f9; padding: 5px 10px; border-left: 3px solid #ccc; }
          @media print {
            body { margin: 0; padding: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <h1>${title || 'វិញ្ញាសាមិនទាន់មានចំណងជើង'}</h1>
        ${description ? `<div class="desc">${description}</div>` : ''}
        <div class="meta">កម្រិត៖ ${level === 'university' ? 'សាកលវិទ្យាល័យ' : level === 'highschool' ? 'វិទ្យាល័យ' : 'បឋមសិក្សា'} | មុខវិជ្ជា៖ ${category}</div>
        <hr style="margin-bottom: 30px;">
        
        ${questions.map((q, idx) => `
          <div class="q-container">
            <div class="q-title">${idx + 1}. ${q.question}</div>
            ${q.image ? `<img src="${q.image}" class="q-image" />` : ''}
            ${q.type === 'fill_blank' ? `
              <div style="margin: 10px 0 10px 20px; font-size: 15px;">
                <b>ចម្លើយត្រឹមត្រូវ (Accepted Answers)៖</b> ${(q.acceptedAnswers || []).join(' / ')}
              </div>
            ` : q.type === 'matching' ? `
              <div style="margin: 10px 0 10px 20px; font-size: 15px;">
                <b>គូផ្គូផ្គង (Matching Pairs)៖</b>
                <ul style="margin: 5px 0;">
                  ${(q.pairs || []).map(p => `<li>${p.left} ↔ ${p.right}</li>`).join('')}
                </ul>
              </div>
            ` : `
              <ol class="options">
                ${(q.options || []).map((opt, optIdx) => `
                  <li class="option ${optIdx === (q.correctIndex || 0) ? 'correct' : ''}">${opt} ${optIdx === (q.correctIndex || 0) ? '✓' : ''}</li>
                `).join('')}
              </ol>
            `}
            ${q.explanation ? `<div class="explanation">ការពន្យល់: ${q.explanation}</div>` : ''}
          </div>
        `).join('')}
        
        <div class="no-print" style="text-align: center; margin-top: 50px;">
          <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; cursor: pointer;">ព្រីនឯកសារ (Print PDF)</button>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 1000);
  };

  const choiceIcons = ['▲', '◆', '●', '■'];
  const choiceColors = ['bg-[#e21b3c]', 'bg-[#1368ce]', 'bg-[#d89e00]', 'bg-[#26890c]'];
  const currentQ = questions[activeQIndex] || questions[0];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-8 font-khmer space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 glass-panel p-4 rounded-2xl">
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">ត្រឡប់ក្រោយ</span>
          </button>
          <button
            onClick={printQuizToPDF}
            className="px-4 py-2 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 text-sm font-bold rounded-xl transition-all flex items-center gap-2 border border-indigo-500/30"
            title="ទាញយក ឬព្រីនជា PDF (មានចម្លើយ និងការពន្យល់)"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden md:inline">Print / PDF</span>
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl shadow-lg transition-all flex items-center gap-2 hover:scale-105"
          >
            <Save className="w-4 h-4" />
            <span className="hidden sm:inline">រក្សាទុក</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <h2 className="text-base sm:text-lg font-bold text-white">
            {initialQuiz ? 'កែសម្រួលវិញ្ញាសា' : 'បង្កើតវិញ្ញាសាថ្មី'}
          </h2>
          <div className="px-3 py-1 rounded-xl bg-purple-900/60 border border-yellow-400/30 text-yellow-300 text-xs font-bold flex items-center gap-1.5 shadow-sm">
            <Clock className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />
            <span>ម៉ោងលេងសរុប៖ ~{Math.ceil(questions.reduce((acc, q) => acc + (q.timeLimit || 20), 0) / 60)} នាទី ({questions.length} សំណួរ)</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => { sound.playClick(); setIsAIModalOpen(true); }}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white text-xs font-bold shadow-lg shadow-orange-950/40 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all"
          >
            <Sparkles className="w-4 h-4 text-yellow-200 animate-pulse" />
            <span>បង្កើតសំណួរដោយ AI (Generate via AI)</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>រក្សាទុក (Save Quiz)</span>
          </button>
        </div>
      </div>

      {/* Quiz Meta Info */}
      <div className="glass-panel p-6 rounded-3xl border border-white/15 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-bold text-purple-200 mb-1">ចំណងជើងវិញ្ញាសា</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="ឧ. Pre-Test គរុកោសល្យ និងវិធីសាស្ត្របង្រៀន"
            className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-purple-400"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-purple-200 mb-1">កម្រិតសិក្សា (Education Level)</label>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-purple-400 font-khmer"
          >
            <option value="university">🏛️ សាកលវិទ្យាល័យ / ឧត្តមសិក្សា</option>
            <option value="highschool">🎓 វិទ្យាល័យ (ត្រៀមបាក់ឌុប)</option>
            <option value="secondary">🧑‍🎓 មធ្យមសិក្សា / អនុវិទ្យាល័យ</option>
            <option value="primary">👦 បឋមសិក្សា (កុមារ)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-purple-200 mb-1">ប្រភេទមុខវិជ្ជា</label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="ឧ. គរុកោសល្យ, ចិត្តវិទ្យា, វិទ្យាសាស្ត្រ..."
            className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-purple-400"
          />
        </div>
      </div>

      {/* Questions Sidebar & Question Builder Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left: Questions List Carousel / Navigator */}
        <div className="lg:col-span-1 glass-panel p-4 rounded-3xl border border-white/15 space-y-3 max-h-[600px] flex flex-col justify-between">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-purple-200">បញ្ជីសំណួរ ({questions.length})</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleShuffleAllQuestions}
                title="ច្របល់លំដាប់សំណួរទាំងអស់ក្នុងវិញ្ញាសានេះ"
                className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-purple-200 text-[11px] font-bold flex items-center gap-1 border border-white/20 transition-all hover:scale-105"
              >
                <Shuffle className="w-3 h-3 text-cyan-300" />
                <span className="hidden sm:inline">ច្របល់លំដាប់</span>
              </button>

              <button
                type="button"
                onClick={() => { sound.playClick(); setIsAIModalOpen(true); }}
                title="បង្កើតសំណួរស្វ័យប្រវត្តដោយ Gemini AI"
                className="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 text-[11px] font-bold flex items-center gap-1 border border-amber-400/40 transition-all hover:scale-105"
              >
                <Sparkles className="w-3 h-3 text-yellow-300 animate-pulse" />
                <span>AI</span>
              </button>
              <button
                type="button"
                onClick={() => handleAddQuestion('multiple_choice')}
                className="p-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1 shadow-md transition-all hover:scale-105"
                title="ថែមសំណួរ ជម្រើស ៤"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>ថែមសំណួរ</span>
              </button>
            </div>
          </div>

          <div className="space-y-2 overflow-y-auto flex-1 pr-1">
            {questions.map((q, idx) => {
              const isTrueFalse = q.type === 'true_false' || (q.options && q.options.length === 2);
              return (
                <div
                  key={q.id || idx}
                  onClick={() => { sound.playClick(); setActiveQIndex(idx); }}
                  className={`p-2.5 rounded-2xl border text-xs cursor-pointer flex items-center justify-between transition-all ${
                    activeQIndex === idx
                      ? 'bg-purple-600/40 border-purple-400 text-white font-bold shadow-md'
                      : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-5 h-5 rounded-full bg-black/40 flex items-center justify-center text-[10px] font-['Outfit'] font-bold">
                      {idx + 1}
                    </span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold font-['Outfit'] ${
                      q.type === 'fill_blank'
                        ? 'bg-amber-500/30 text-amber-300 border border-amber-400/40'
                        : q.type === 'matching'
                        ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-400/40'
                        : (q.type === 'true_false' || (q.options && q.options.length === 2))
                        ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-400/40'
                        : 'bg-purple-500/30 text-purple-200 border border-purple-400/40'
                    }`}>
                      {q.type === 'fill_blank' ? 'BLANK' : q.type === 'matching' ? 'MATCH' : (q.type === 'true_false' || (q.options && q.options.length === 2)) ? 'T/F' : '4-MC'}
                    </span>
                    <span className="truncate">{q.question || 'សំណួរទទេ...'}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-yellow-300/80 font-['Outfit']">{q.timeLimit || 20}s</span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleDeleteQuestion(idx); }}
                      className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                      title="លុបសំណួរនេះ"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Quick Add Buttons for All 4 Types */}
          <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={() => handleAddQuestion('multiple_choice')}
              className="py-1.5 px-1 rounded-xl bg-purple-600/60 hover:bg-purple-600 text-white text-[10px] font-bold font-khmer flex items-center justify-center gap-1 border border-purple-400/30 transition-all hover:scale-105"
            >
              <Plus className="w-3 h-3" />
              <span>+ ជម្រើស ៤</span>
            </button>
            <button
              type="button"
              onClick={() => handleAddQuestion('true_false')}
              className="py-1.5 px-1 rounded-xl bg-emerald-600/60 hover:bg-emerald-600 text-white text-[10px] font-bold font-khmer flex items-center justify-center gap-1 border border-emerald-400/30 transition-all hover:scale-105"
            >
              <Plus className="w-3 h-3" />
              <span>+ ត្រូវ/ខុស</span>
            </button>
            <button
              type="button"
              onClick={() => handleAddQuestion('fill_blank')}
              className="py-1.5 px-1 rounded-xl bg-amber-600/60 hover:bg-amber-600 text-white text-[10px] font-bold font-khmer flex items-center justify-center gap-1 border border-amber-400/30 transition-all hover:scale-105"
            >
              <Plus className="w-3 h-3" />
              <span>+ បំពេញចន្លោះ</span>
            </button>
            <button
              type="button"
              onClick={() => handleAddQuestion('matching')}
              className="py-1.5 px-1 rounded-xl bg-cyan-600/60 hover:bg-cyan-600 text-white text-[10px] font-bold font-khmer flex items-center justify-center gap-1 border border-cyan-400/30 transition-all hover:scale-105"
            >
              <Plus className="w-3 h-3" />
              <span>+ ផ្គូផ្គង</span>
            </button>
          </div>
        </div>

        {/* Right: Active Question Editor */}
        <div className="lg:col-span-3 glass-panel p-6 rounded-3xl border border-white/15 space-y-6">
          {/* Question Header: Type Selector & Index */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-xl bg-purple-600/80 text-white font-black text-xs font-['Outfit'] shadow-sm">
                Q{activeQIndex + 1}
              </span>
              <span className="text-xs font-bold text-white font-khmer">
                ប្រភេទសំណួរ៖
              </span>
            </div>

            {/* Question Type Toggle Pills */}
            <div className="flex flex-wrap items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/15">
              <button
                type="button"
                onClick={() => handleChangeQuestionType('multiple_choice')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold font-khmer transition-all flex items-center gap-1 ${
                  (currentQ.type !== 'true_false' && currentQ.type !== 'fill_blank' && currentQ.type !== 'matching' && (currentQ.options?.length || 4) > 2)
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>🔘 ជម្រើស ៤ (Multiple Choice)</span>
              </button>

              <button
                type="button"
                onClick={() => handleChangeQuestionType('true_false')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold font-khmer transition-all flex items-center gap-1 ${
                  (currentQ.type === 'true_false' || (currentQ.type !== 'fill_blank' && currentQ.type !== 'matching' && currentQ.options?.length === 2))
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>⚖️ ត្រូវ ឬ ខុស (True / False)</span>
              </button>

              <button
                type="button"
                onClick={() => handleChangeQuestionType('fill_blank')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold font-khmer transition-all flex items-center gap-1 ${
                  currentQ.type === 'fill_blank'
                    ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md'
                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>✍️ បំពេញចន្លោះ (Fill in Blank)</span>
              </button>

              <button
                type="button"
                onClick={() => handleChangeQuestionType('matching')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold font-khmer transition-all flex items-center gap-1 ${
                  currentQ.type === 'matching'
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>🧩 ផ្គូផ្គង (Matching)</span>
              </button>
            </div>
          </div>

          {/* Question Textarea & Image */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-purple-200 mb-2">
                ខ្លឹមសារសំណួរទី {activeQIndex + 1}
              </label>
              <textarea
                rows={3}
                value={currentQ.question}
                onChange={(e) => handleUpdateCurrentQ('question', e.target.value)}
                placeholder="វាយបញ្ចូលសំណួររបស់អ្នកជាភាសាខ្មែរនៅទីនេះ..."
                className="w-full bg-black/40 border border-white/20 rounded-2xl p-4 text-sm sm:text-base font-bold text-white placeholder-purple-300/40 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 font-khmer transition-all"
              />
            </div>
            
            {/* Question Image Upload / Preview */}
            <div className="flex flex-col sm:flex-row gap-4 items-start bg-black/20 p-3 rounded-xl border border-white/5">
              {currentQ.image && (
                <div className="relative group">
                  <img src={currentQ.image} alt="Question Graphic" className="h-24 w-auto object-contain rounded-lg border border-white/20 bg-black/40" />
                  <button 
                    onClick={() => handleUpdateCurrentQ('image', null)}
                    className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                    title="លុបរូបភាព"
                  >
                    <Trash2 className="w-3 h-3 text-white" />
                  </button>
                </div>
              )}
              <label className="flex-1 cursor-pointer w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-purple-400/30 hover:border-purple-400/60 rounded-xl bg-purple-900/20 hover:bg-purple-900/40 transition-colors text-purple-200">
                <ImageIcon className="w-5 h-5 opacity-70" />
                <span className="text-sm font-semibold">{currentQ.image ? 'ប្ដូររូបភាព...' : 'ភ្ជាប់រូបភាពប្រធានលំហាត់ (Optional)'}</span>
                <input type="file" accept="image/*" onChange={handleQuestionImageUpload} className="hidden" />
              </label>
            </div>
          </div>

          {/* Question Settings (Time & Points) */}
          <div className="space-y-3">
            <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-purple-200 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-yellow-400" />
                  <span>កំណត់ម៉ោងសំណួរនេះ (Time Limit):</span>
                </span>
                
                {/* Custom Number Input + Apply to all */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-black/60 px-2.5 py-1 rounded-xl border border-yellow-400/40">
                    <input
                      type="number"
                      min="3"
                      max="600"
                      step="1"
                      value={currentQ.timeLimit ?? 20}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        handleUpdateCurrentQ('timeLimit', isNaN(val) ? 20 : Math.max(3, Math.min(600, val)));
                      }}
                      className="w-16 bg-transparent text-yellow-300 font-black text-sm text-center focus:outline-none font-['Outfit']"
                    />
                    <span className="text-xs text-yellow-200 font-bold">វិនាទី (s)</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleApplyTimeToAllQuestions(currentQ.timeLimit || 20)}
                    className="text-[11px] font-bold text-yellow-300 hover:text-yellow-200 bg-yellow-400/10 hover:bg-yellow-400/20 border border-yellow-400/30 px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1"
                    title="កំណត់ម៉ោងនេះចំពោះគ្រប់សំណួរទាំងអស់ក្នុងវិញ្ញាសា"
                  >
                    <span>⚡ ដាក់ {currentQ.timeLimit || 20}វិ. ឱ្យគ្រប់សំណួរទាំងអស់ (Apply to all)</span>
                  </button>
                </div>
              </div>

              {/* Interactive Quick Time Buttons */}
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                {[
                  { val: 5, label: '5 វិ.' },
                  { val: 10, label: '10 វិ.' },
                  { val: 15, label: '15 វិ.' },
                  { val: 20, label: '20 វិ. (ស្តង់ដារ)' },
                  { val: 30, label: '30 វិ.' },
                  { val: 60, label: '1 នាទី' },
                  { val: 90, label: '1.5 នាទី' },
                  { val: 120, label: '2 នាទី' },
                ].map((preset) => {
                  const isSelected = (currentQ.timeLimit || 20) === preset.val;
                  return (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => { sound.playClick(); handleUpdateCurrentQ('timeLimit', preset.val); }}
                      className={`py-2 px-1 rounded-xl text-xs font-bold font-khmer transition-all flex flex-col items-center justify-center gap-0.5 border ${
                        isSelected
                          ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-black border-yellow-300 shadow-md scale-105 font-black'
                          : 'bg-black/40 hover:bg-white/10 text-gray-200 border-white/15'
                      }`}
                    >
                      <span className="text-[11px] leading-tight text-center">{preset.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-white/5 p-3 rounded-2xl border border-white/10 flex items-center justify-between">
              <span className="text-xs font-bold text-purple-200 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-yellow-400" />
                <span>ពិន្ទុមូលដ្ឋាន (Base Points):</span>
              </span>
              <select
                value={currentQ.points ?? 10}
                onChange={(e) => handleUpdateCurrentQ('points', parseInt(e.target.value, 10))}
                className="bg-black/50 border border-white/20 rounded-xl px-3 py-1.5 text-xs font-bold text-white focus:outline-none font-['Outfit']"
              >
                <option value="1">1 ពិន្ទុ</option>
                <option value="5">5 ពិន្ទុ</option>
                <option value="10">10 ពិន្ទុ (ស្តង់ដារ)</option>
                <option value="100">100 ពិន្ទុ</option>
                <option value="1000">1000 ពិន្ទុ (ល្បឿន / Kahoot!)</option>
              </select>
            </div>
          </div>

          {/* Conditional Question Type Content Form */}
          {currentQ.type === 'fill_blank' ? (
            /* Fill-in-the-Blank Editor */
            <div className="space-y-4 bg-amber-500/10 border border-amber-500/30 p-4 sm:p-5 rounded-2xl">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <label className="block text-xs font-bold text-amber-200 flex items-center gap-1.5">
                    <Edit3 className="w-4 h-4 text-amber-400" />
                    <span>បញ្ជីចម្លើយត្រឹមត្រូវដែលអាចទទួលយកបាន (Accepted Answers)៖</span>
                  </label>
                  <p className="text-[11px] text-amber-300/70 font-khmer mt-0.5">
                    💡 លោកគ្រូអាចដាក់ចម្លើយបានច្រើនបែប (ឧ. ជាភាសាខ្មែរ អក្សរកាត់ ឬអក្សរឡាតាំង)។ សិស្សវាយត្រូវពាក្យណាមួយនឹងទទួលបានពិន្ទុភ្លាមៗ!
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddAcceptedAnswer}
                  className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all shadow-md hover:scale-105"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ បន្ថែមជម្រើសចម្លើយ</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {(currentQ.acceptedAnswers && currentQ.acceptedAnswers.length > 0 ? currentQ.acceptedAnswers : ['']).map((ans, ansIdx) => (
                  <div key={ansIdx} className="flex items-center gap-2 bg-black/40 p-2 rounded-xl border border-white/10">
                    <span className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-400/30 flex items-center justify-center text-xs font-bold font-['Outfit']">
                      #{ansIdx + 1}
                    </span>
                    <input
                      type="text"
                      value={ans}
                      onChange={(e) => handleUpdateAcceptedAnswer(ansIdx, e.target.value)}
                      placeholder={ansIdx === 0 ? "ឧ. ភ្នំពេញ (ចម្លើយគោល)" : `ចម្លើយបន្ថែមទី ${ansIdx + 1} (ឧ. Phnom Penh, រាជធានីភ្នំពេញ...)`}
                      className="flex-1 bg-transparent text-sm font-bold text-white placeholder-white/40 focus:outline-none font-khmer px-2"
                    />
                    {(currentQ.acceptedAnswers || []).length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveAcceptedAnswer(ansIdx)}
                        className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"
                        title="លុបចម្លើយនេះ"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : currentQ.type === 'matching' ? (
            /* Matching Pairs Editor */
            <div className="space-y-4 bg-cyan-500/10 border border-cyan-500/30 p-4 sm:p-5 rounded-2xl">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <label className="block text-xs font-bold text-cyan-200 flex items-center gap-1.5">
                    <LinkIcon className="w-4 h-4 text-cyan-400" />
                    <span>គូផ្គូផ្គងត្រឹមត្រូវ (Matching Pairs)៖</span>
                  </label>
                  <p className="text-[11px] text-cyan-300/70 font-khmer mt-0.5">
                    💡 បញ្ចូលពាក្យខាងឆ្វេង និងពាក្យខាងស្តាំដែលត្រូវគ្នា។ ពេលប្រកួត សិស្សនឹងឃើញពាក្យទាំងសងខាងច្របល់គ្នារួចចុចផ្គូផ្គង (Tap-to-Match)។
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleShufflePairs}
                    className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all shadow-md hover:scale-105"
                    title="ច្របល់ទីតាំងគូផ្គូផ្គង (Shuffle Pairs)"
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                    <span>🔀 ច្របល់ទីតាំង (Shuffle)</span>
                  </button>

                  {(currentQ.pairs || []).length < 5 && (
                    <button
                      type="button"
                      onClick={handleAddPair}
                      className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all shadow-md hover:scale-105"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ បន្ថែមគូថ្មី</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {(currentQ.pairs && currentQ.pairs.length >= 2 ? currentQ.pairs : [
                  { left: '', right: '' },
                  { left: '', right: '' },
                  { left: '', right: '' }
                ]).map((pair, pairIdx) => (
                  <div key={pairIdx} className="flex flex-col sm:flex-row items-center gap-2.5 bg-black/40 p-3 rounded-2xl border border-white/10">
                    <span className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 flex items-center justify-center text-xs font-bold font-['Outfit'] shrink-0">
                      {pairIdx + 1}
                    </span>

                    {/* Left Item */}
                    <div className="flex-1 w-full flex items-center gap-2 bg-black/30 border border-cyan-400/30 rounded-xl px-3 py-2">
                      <span className="text-[10px] text-cyan-300/70 font-bold shrink-0">ឆ្វេង៖</span>
                      <input
                        type="text"
                        value={pair.left || ''}
                        onChange={(e) => handleUpdatePair(pairIdx, 'left', e.target.value)}
                        placeholder={`ពាក្យ/សំណួរទី ${pairIdx + 1} (ឧ. កម្ពុជា)`}
                        className="flex-1 bg-transparent text-xs font-bold text-white placeholder-white/40 focus:outline-none font-khmer"
                      />
                    </div>

                    <span className="text-cyan-400 font-bold text-sm hidden sm:inline">↔</span>

                    {/* Right Item */}
                    <div className="flex-1 w-full flex items-center gap-2 bg-black/30 border border-teal-400/30 rounded-xl px-3 py-2">
                      <span className="text-[10px] text-teal-300/70 font-bold shrink-0">ស្តាំ៖</span>
                      <input
                        type="text"
                        value={pair.right || ''}
                        onChange={(e) => handleUpdatePair(pairIdx, 'right', e.target.value)}
                        placeholder={`ចម្លើយផ្គូផ្គងទី ${pairIdx + 1} (ឧ. ភ្នំពេញ)`}
                        className="flex-1 bg-transparent text-xs font-bold text-white placeholder-white/40 focus:outline-none font-khmer"
                      />
                    </div>

                    {(currentQ.pairs || []).length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemovePair(pairIdx)}
                        className="p-1.5 text-gray-400 hover:text-red-400 transition-colors shrink-0"
                        title="លុបគូនេះ"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Choices Form (2 Choices for True/False OR 4 Choices for Multiple Choice) */
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="block text-xs font-bold text-purple-200">
                  {currentQ.type === 'true_false' || currentQ.options?.length === 2
                    ? 'ជម្រើស ត្រូវ ឬ ខុស (ចុចរង្វង់ដើម្បីកំណត់ចម្លើយត្រឹមត្រូវ)៖'
                    : 'ជម្រើសចម្លើយទាំង ៤ (ចុចរង្វង់ខាងស្តាំដើម្បីកំណត់ចម្លើយដែលត្រឹមត្រូវ)៖'}
                </label>
                {(currentQ.type !== 'true_false' && (currentQ.options?.length || 4) > 2) && (
                  <button
                    type="button"
                    onClick={() => handleShuffleChoices(activeQIndex)}
                    className="bg-purple-600/50 hover:bg-purple-600 border border-purple-400/40 text-yellow-300 hover:text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all shadow-md hover:scale-105 active:scale-95"
                    title="ច្របល់ទីតាំងចម្លើយនៃសំណួរនេះដោយចៃដន្យ"
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                    <span>🔀 ច្របល់ចម្លើយសំណួរនេះ (Shuffle Choices)</span>
                  </button>
                )}
              </div>

              <div className={`grid ${currentQ.type === 'true_false' || currentQ.options?.length === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'} gap-4`}>
                {(currentQ.options || (currentQ.type === 'true_false' ? ['ត្រូវ (True)', 'ខុស (False)'] : ['', '', '', ''])).map((opt, optIdx) => {
                  const isCorrect = currentQ.correctIndex === optIdx;
                  return (
                    <div
                      key={optIdx}
                      className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-all ${
                        choiceColors[optIdx]
                      } ${isCorrect ? 'ring-4 ring-yellow-400 shadow-xl' : 'opacity-90'}`}
                    >
                      <span className="w-8 h-8 rounded-xl bg-black/30 flex items-center justify-center text-base font-bold text-white font-['Outfit']">
                        {choiceIcons[optIdx]}
                      </span>

                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => handleUpdateOption(optIdx, e.target.value)}
                        placeholder={currentQ.type === 'true_false' ? (optIdx === 0 ? 'ត្រូវ (True)' : 'ខុស (False)') : `ជម្រើសទី ${optIdx + 1}...`}
                        className="flex-1 bg-black/20 border border-white/20 rounded-xl px-3 py-2 text-xs font-bold text-white placeholder-white/50 focus:outline-none font-khmer"
                      />

                      {/* Radio Button for Correct Answer */}
                      <button
                        type="button"
                        onClick={() => handleUpdateCurrentQ('correctIndex', optIdx)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                          isCorrect
                            ? 'bg-yellow-400 text-black shadow-lg scale-110'
                            : 'bg-black/30 text-white hover:bg-black/50'
                        }`}
                        title={isCorrect ? "ចម្លើយត្រឹមត្រូវ" : "ចុចដើម្បីជ្រើសជាចម្លើយត្រឹមត្រូវ"}
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Explanation Field */}
          <div>
            <label className="block text-xs font-bold text-purple-200 mb-1 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-emerald-400" />
              <span>ការពន្យល់អំពីចម្លើយត្រឹមត្រូវ (បង្ហាញក្រោយពេលសិស្សឆ្លើយចប់):</span>
            </label>
            <textarea
              rows={2}
              value={currentQ.explanation || ''}
              onChange={(e) => handleUpdateCurrentQ('explanation', e.target.value)}
              placeholder="ពន្យល់មូលហេតុដែលចម្លើយនេះត្រឹមត្រូវ ដើម្បីឱ្យសិស្សបានយល់កាន់តែច្បាស់..."
              className="w-full bg-black/30 border border-white/15 rounded-xl p-3 text-xs text-white placeholder-purple-300/40 focus:outline-none focus:border-emerald-400 font-khmer"
            />
          </div>
        </div>
      </div>

      {/* Gemini AI Generator Modal inside QuizEditor */}
      <AIGeneratorModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        initialLevel={level}
        onAppendQuestions={handleAppendAIQuestions}
        currentUser={currentUser}
        lang={lang}
      />
    </div>
  );
}

