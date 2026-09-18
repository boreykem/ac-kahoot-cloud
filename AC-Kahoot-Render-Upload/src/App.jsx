import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Header from './components/Header.jsx';
import HomeView from './components/HomeView.jsx';
import HostScreen from './components/HostScreen.jsx';
import PlayerScreen from './components/PlayerScreen.jsx';
import QuizEditor from './components/QuizEditor.jsx';
import AIGeneratorModal from './components/AIGeneratorModal.jsx';
import AuthModal from './components/AuthModal.jsx';
import MasterAdminModal from './components/MasterAdminModal.jsx';
import UserProfileModal from './components/UserProfileModal.jsx';
import LicenseTopBanner from './components/LicenseTopBanner.jsx';
import PricingModal from './components/PricingModal.jsx';
import { getSavedAccounts, saveAccount, removeSavedAccount } from './utils/accountManager.js';

// Connect to Socket.io backend
const socket = io();

export default function App() {
  const [currentView, setView] = useState('home'); // home, host, player-join, editor
  const [activeLevel, setActiveLevel] = useState('all');
  const [quizzes, setQuizzes] = useState([]);
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [initialPin, setInitialPin] = useState('');
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState('login');

  const handleOpenAuthModal = (tab = 'login') => {
    setAuthModalTab(tab);
    setIsAuthModalOpen(true);
  };
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [savedAccounts, setSavedAccounts] = useState(() => getSavedAccounts());
  const [systemLicense, setSystemLicense] = useState(null);
  const [lang, setLang] = useState(localStorage.getItem('app_lang') || 'km');

  const checkLicenseStatus = async () => {
    try {
      const res = await fetch('/api/license/machine-info');
      const data = await res.json();
      if (data && data.success && data.activeLicense) {
        setSystemLicense(data.activeLicense);
      }
    } catch (e) {
      console.warn("Could not fetch license info", e);
    }
  };

  const handleToggleLang = () => {
    const nextLang = lang === 'km' ? 'en' : 'km';
    setLang(nextLang);
    localStorage.setItem('app_lang', nextLang);
  };

  const handleLoginSuccess = (user) => {
    saveAccount(user);
    setCurrentUser(user);
    setSavedAccounts(getSavedAccounts());
  };

  const handleSwitchAccount = (account) => {
    if (!account) return;
    saveAccount(account);
    setCurrentUser(account);
    setSavedAccounts(getSavedAccounts());
  };

  const handleRemoveAccount = (email) => {
    const updated = removeSavedAccount(email);
    setSavedAccounts(updated);
    if (currentUser?.email?.toLowerCase().trim() === email.toLowerCase().trim()) {
      if (updated.length > 0) {
        setCurrentUser(updated[0]);
      } else {
        setCurrentUser(null);
      }
    }
  };

  const handleLogout = () => {
    if (currentUser?.email) {
      removeSavedAccount(currentUser.email);
    }
    const remaining = getSavedAccounts();
    setSavedAccounts(remaining);
    if (remaining.length > 0) {
      setCurrentUser(remaining[0]);
    } else {
      setCurrentUser(null);
      localStorage.removeItem('auth_user');
    }
  };

  // Check URL params on load and check license
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pinParam = params.get('pin');
    const joinParam = params.get('join');

    if (pinParam) {
      setInitialPin(pinParam);
      setView('player-join');
    } else if (joinParam) {
      setView('player-join');
    }

    // Fetch Quizzes & License
    fetchQuizzes();
    checkLicenseStatus();
  }, []);

  const fetchQuizzes = async () => {
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (currentUser?.id && currentUser?.email) {
        headers['x-user-id'] = currentUser.id;
        headers['x-user-email'] = currentUser.email;
      }
      const res = await fetch('/api/quizzes', { headers });
      const data = await res.json();
      setQuizzes(data);
    } catch (err) {
      console.warn("Could not fetch from server, using built-in cache", err);
    }
  };

  const handleHostQuiz = (quiz) => {
    setActiveQuiz(quiz);
    setView('host');
  };

  const handleEditQuiz = (quiz) => {
    setEditingQuiz(quiz);
    setView('editor');
  };

  const handleDeleteQuiz = async (quizId) => {
    if (!window.confirm(lang === 'km' ? 'តើអ្នកពិតជាចង់លុបវិញ្ញាសានេះមែនទេ?' : 'Are you sure you want to delete this quiz?')) return;
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (currentUser?.id && currentUser?.email) {
        headers['x-user-id'] = currentUser.id;
        headers['x-user-email'] = currentUser.email;
      }
      const res = await fetch(`/api/quizzes/${quizId}`, { method: 'DELETE', headers });
      const data = await res.json();
      if (data.success) {
        setQuizzes(quizzes.filter(q => q.id !== quizId));
      } else {
        alert(data.message || 'Error deleting quiz');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveQuiz = async (quizToSave) => {
    try {
      // Check Free Tier Quota: Max 10 Quizzes
      const isFree = !currentUser || currentUser.license === 'free';
      const existingIdx = quizzes.findIndex(q => q.id === quizToSave.id);
      if (isFree && existingIdx === -1) {
        const userQuizzes = quizzes.filter(q => q.authorEmail === currentUser?.email || q.authorId === currentUser?.id);
        if (userQuizzes.length >= 10) {
          alert(lang === 'km' 
            ? '🌟 គណនី Free Trial អាចបង្កើតវិញ្ញាសាផ្ទាល់ខ្លួនបានត្រឹម ១០ ប៉ុណ្ណោះ។ សូម Upgrade ទៅកាន់ Pro ដើម្បីបង្កើតវិញ្ញាសាមិនកំណត់!' 
            : 'Free accounts are limited to 10 custom quizzes. Please upgrade to Pro for unlimited quizzes!');
          setIsProfileModalOpen(true);
          return;
        }
      }

      const quizWithAuthor = {
        ...quizToSave,
        authorId: quizToSave.authorId || currentUser?.id || 'official',
        authorEmail: quizToSave.authorEmail || currentUser?.email || 'official',
        authorName: quizToSave.authorName || currentUser?.name || 'AC-Kahoot! Official',
        isOfficial: currentUser?.role === 'superadmin' ? (quizToSave.isOfficial ?? true) : false
      };

      const headers = { 'Content-Type': 'application/json' };
      if (currentUser?.id && currentUser?.email) {
        headers['x-user-id'] = currentUser.id;
        headers['x-user-email'] = currentUser.email;
      }

      const res = await fetch('/api/quizzes', {
        method: 'POST',
        headers,
        body: JSON.stringify(quizWithAuthor)
      });
      const data = await res.json();
      if (data.success) {
        await fetchQuizzes();
        setEditingQuiz(null);
        setView('home');
      } else {
        alert(data.message || 'មានបញ្ហាក្នុងការរក្សាទុកវិញ្ញាសា');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveGeneratedAIQuiz = async (aiQuiz) => {
    await handleSaveQuiz(aiQuiz);
  };

  const [showHeader, setShowHeader] = useState(true);

  // Smart Auto-Hide Header on Scroll Down (Reveal on Scroll Up)
  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentY = window.scrollY;
          if (currentY > 70 && currentY > lastY) {
            // Scrolling down -> hide header to maximize reading/quiz space
            setShowHeader(false);
          } else if (currentY < lastY || currentY <= 15) {
            // Scrolling up or near top -> reveal header smoothly
            setShowHeader(true);
          }
          lastY = currentY;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen flex flex-col font-khmer selection:bg-purple-500 selection:text-white">
      {/* Sticky Header & Banner with Smart Auto-Hide on Scroll Down */}
      {(currentView === 'home' || currentView === 'editor') && (
        <div className={`sticky top-0 z-40 transition-all duration-300 transform ${
          showHeader ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
        }`}>
          <LicenseTopBanner
            currentUser={currentUser}
            systemLicense={systemLicense}
            onOpenProfileModal={() => handleOpenAuthModal('license')}
            onOpenAuthModal={(tab) => handleOpenAuthModal(tab || 'login')}
            onOpenPricingModal={() => setIsPricingModalOpen(true)}
            lang={lang}
          />
          <Header
            currentView={currentView}
            setView={setView}
            activeLevel={activeLevel}
            setActiveLevel={setActiveLevel}
            onOpenAIGenerator={() => setIsAIModalOpen(true)}
            lang={lang}
            onToggleLang={handleToggleLang}
            currentUser={currentUser}
            systemLicense={systemLicense}
            savedAccounts={savedAccounts}
            onSwitchAccount={handleSwitchAccount}
            onRemoveAccount={handleRemoveAccount}
            onOpenAuthModal={(tab) => handleOpenAuthModal(tab || 'login')}
            onLogout={handleLogout}
            onOpenAdminPanel={() => setIsAdminModalOpen(true)}
            onOpenProfileModal={() => handleOpenAuthModal('license')}
            onOpenHWIDModal={() => handleOpenAuthModal('license')}
          />
        </div>
      )}

      {/* Main Routing Views */}
      <main className="flex-1">
        {currentView === 'home' && (
          <HomeView
            quizzes={quizzes}
            activeLevel={activeLevel}
            setActiveLevel={setActiveLevel}
            onHostQuiz={handleHostQuiz}
            onEditQuiz={handleEditQuiz}
            onDeleteQuiz={handleDeleteQuiz}
            onOpenAIGenerator={() => setIsAIModalOpen(true)}
            onCreateQuiz={() => setView('editor')}
            onJoinDirect={() => setView('player-join')}
            lang={lang}
            onToggleLang={handleToggleLang}
            currentUser={currentUser}
            systemLicense={systemLicense}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
          />
        )}

        {currentView === 'host' && activeQuiz && (
          <HostScreen
            socket={socket}
            quiz={activeQuiz}
            level={activeLevel === 'all' ? activeQuiz.level : activeLevel}
            onExit={() => setView('home')}
            lang={lang}
            currentUser={currentUser}
          />
        )}

        {currentView === 'player-join' && (
          <PlayerScreen
            socket={socket}
            initialPin={initialPin}
            onExit={() => setView('home')}
            lang={lang}
          />
        )}

        {currentView === 'editor' && (
          <QuizEditor
            initialQuiz={editingQuiz}
            onSave={handleSaveQuiz}
            onCancel={() => { setEditingQuiz(null); setView('home'); }}
            lang={lang}
          />
        )}
      </main>

      {/* Gemini AI Generator Modal */}
      <AIGeneratorModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        onSaveGeneratedQuiz={handleSaveGeneratedAIQuiz}
        currentUser={currentUser}
        lang={lang}
      />

      {/* Unified Teacher Auth & Hardware License Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        initialTab={authModalTab}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={(user) => {
          handleLoginSuccess(user);
          fetchQuizzes();
          checkLicenseStatus();
        }}
        onActivationSuccess={() => {
          fetchQuizzes();
          checkLicenseStatus();
        }}
        currentUser={currentUser}
        lang={lang}
      />

      {/* Teacher Profile & Password Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentUser={currentUser}
        onUpdateUser={(updatedUser) => {
          setCurrentUser(updatedUser);
          localStorage.setItem('auth_user', JSON.stringify(updatedUser));
        }}
        onOpenPricingModal={() => setIsPricingModalOpen(true)}
        lang={lang}
      />

      <PricingModal 
        isOpen={isPricingModalOpen} 
        onClose={() => setIsPricingModalOpen(false)} 
        currentUser={currentUser} 
      />

      {/* Master Admin Panel Modal */}
      <MasterAdminModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        currentUser={currentUser}
        lang={lang}
      />

      {/* Footer in Home View */}
      {currentView === 'home' && (
        <footer className="glass-panel border-t border-white/10 py-6 text-center text-xs text-purple-200/70 font-khmer mt-12 space-y-2">
          <p>© 2026 AC-Kahoot! - វេទិកាសំណួរ & សិក្សាល្បែងអន្តរកម្មកម្ពុជា</p>
          {!(currentUser?.license && currentUser.license !== 'free') && (
            <p className="flex items-center justify-center gap-2">
              <span>ទាក់ទង / គាំទ្រ៖</span>
              <a
                href="https://t.me/ac_mart_programer_developer_bot"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#229ED9]/20 hover:bg-[#229ED9]/40 text-[#54c4f8] hover:text-white border border-[#229ED9]/40 font-bold transition-all hover:scale-105"
              >
                <span>✈️ Telegram Bot: @ac_mart_programer_developer_bot</span>
              </a>
            </p>
          )}
        </footer>
      )}
    </div>
  );
}
