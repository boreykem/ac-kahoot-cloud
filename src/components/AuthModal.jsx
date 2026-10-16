import React, { useState, useEffect } from 'react';
import { 
  X, Lock, Mail, User, School, LogIn, UserPlus, 
  KeyRound, ArrowLeft, Send, CheckCircle2, 
  ShieldAlert, Eye, EyeOff, Phone
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { sound } from '../utils/audioEngine';

export default function AuthModal({ 
  isOpen, 
  onClose, 
  onLoginSuccess, 
  currentUser,
  initialTab = 'login',
  lang = 'km' 
}) {
  const [tab, setTab] = useState(initialTab === 'license' ? 'login' : (initialTab || 'login')); // 'login' | 'register' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [school, setSchool] = useState('');
  const [avatar, setAvatar] = useState('👨‍🏫');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Forgot password flow states
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [telegramBotUrl, setTelegramBotUrl] = useState('');
  const [adminTelegram, setAdminTelegram] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTab(initialTab === 'license' ? 'login' : (initialTab || 'login'));
      setError('');
      setSuccessMsg('');
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const avatars = ['👨‍🏫', '👩‍🏫', '🧑‍🏫', '🎓', '🏛️', '🌟', '👓', '📚'];

  const handleLogin = async (e) => {
    e?.preventDefault();
    if (!email || !password) {
      setError(lang === 'km' ? 'សូមបញ្ចូលអ៊ីមែល និងលេខសម្ងាត់!' : 'Please enter email and password!');
      return;
    }
    sound.playClick();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (data.success && data.user) {
        sound.playCorrect();
        const userWithToken = { ...data.user, token: data.token || data.user.token };
        if (data.token) {
          try { localStorage.setItem('auth_token', data.token); } catch (_) {}
        }
        if (onLoginSuccess) onLoginSuccess(userWithToken);
        onClose();
      } else {
        setError(data.message || (lang === 'km' ? 'ការចូលគណនីបរាជ័យ' : 'Login failed'));
      }
    } catch (err) {
      setError(lang === 'km' ? 'មិនអាចភ្ជាប់ទៅកាន់ Server បានទេ' : 'Cannot connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e?.preventDefault();
    if (!name || !email || !password) {
      setError(lang === 'km' ? 'សូមបំពេញព័ត៌មានឱ្យបានគ្រប់គ្រាន់!' : 'Please fill all required fields!');
      return;
    }
    sound.playClick();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name, 
          email, 
          password, 
          school, 
          avatar,
          phone
        })
      });
      const data = await res.json();
      if (data.success && data.user) {
        sound.playCorrect();
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        const userWithToken = { ...data.user, token: data.token || data.user.token };
        if (data.token) {
          try { localStorage.setItem('auth_token', data.token); } catch (_) {}
        }
        if (onLoginSuccess) onLoginSuccess(userWithToken);
        onClose();
      } else {
        setError(data.message || (lang === 'km' ? 'ការចុះឈ្មោះបរាជ័យ' : 'Registration failed'));
      }
    } catch (err) {
      setError(lang === 'km' ? 'មិនអាចភ្ជាប់ទៅកាន់ Server បានទេ' : 'Cannot connect to server');
    } finally {
      setLoading(false);
    }
  };

  // Forgot password flow
  const handleRequestOtp = async (e) => {
    e?.preventDefault();
    if (!forgotEmail) {
      setError('សូមបញ្ចូលអ៊ីមែលរបស់អ្នក!');
      return;
    }
    sound.playClick();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      });
      const data = await res.json();
      if (data.success) {
        sound.playCorrect();
        setSuccessMsg(data.message);
        if (data.telegramBotUrl) setTelegramBotUrl(data.telegramBotUrl);
        if (data.adminTelegram) setAdminTelegram(data.adminTelegram);
        setForgotStep(2);
      } else {
        setError(data.message || 'មិនអាចផ្ញើលេខកូដបានទេ');
      }
    } catch (err) {
      setError('មិនអាចភ្ជាប់ទៅកាន់ Server បានទេ');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtpAndReset = async (e) => {
    e?.preventDefault();
    if (!otpCode || !resetNewPassword) {
      setError('សូមបញ្ចូលលេខកូដ OTP និងលេខសម្ងាត់ថ្មី!');
      return;
    }
    if (resetNewPassword !== resetConfirmPassword) {
      setError('លេខសម្ងាត់ផ្ទៀងផ្ទាត់មិនត្រូវគ្នាឡើយ!');
      return;
    }

    sound.playClick();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/verify-reset-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: forgotEmail,
          otp: otpCode,
          newPassword: resetNewPassword
        })
      });
      const data = await res.json();
      if (data.success) {
        sound.playCorrect();
        setSuccessMsg(data.message);
        setTimeout(() => {
          setEmail(forgotEmail);
          setTab('login');
          setForgotStep(1);
          setOtpCode('');
          setResetNewPassword('');
          setResetConfirmPassword('');
          setSuccessMsg('🎉 បានប្តូរលេខសម្ងាត់ថ្មីជោគជ័យ! សូម Login ឥឡូវនេះ។');
        }, 1500);
      } else {
        setError(data.message || 'ការផ្ទៀងផ្ទាត់មិនត្រឹមត្រូវ');
      }
    } catch (err) {
      setError('មិនអាចភ្ជាប់ទៅកាន់ Server បានទេ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 font-khmer animate-scale-in">
      <div className="glass-panel border border-purple-500/30 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl bg-[#1a0833] text-white">
        
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-purple-950/90 via-indigo-950/80 to-[#1a0833]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-emerald-500 flex items-center justify-center text-white shadow-lg shadow-purple-950/50">
              {tab === 'forgot' ? <KeyRound className="w-5 h-5" /> : tab === 'register' ? <UserPlus className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                {tab === 'forgot'
                  ? '🔑 ភ្លេចលេខសម្ងាត់ (Reset Password)'
                  : tab === 'register'
                  ? '✨ ចុះឈ្មោះគណនីគ្រូបង្រៀន'
                  : '🎯 គណនីគ្រូបង្រៀន (Teacher Account)'}
              </h2>
              <p className="text-[11px] text-purple-200/70">
                {tab === 'forgot'
                  ? 'កំណត់លេខសម្ងាត់ថ្មីតាមរយៈ Gmail'
                  : 'គ្រប់គ្រងវិញ្ញាសា និងបង្រៀនសិស្ស'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2 Main Tabs: Login | Register */}
        {tab !== 'forgot' && (
          <div className="grid grid-cols-2 p-1.5 bg-black/40 border-b border-white/10 text-xs font-bold gap-1">
            <button
              type="button"
              onClick={() => { setTab('login'); setError(''); setSuccessMsg(''); }}
              className={`py-2 px-1 rounded-xl transition-all flex items-center justify-center gap-1 ${
                tab === 'login'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>🔑 ចូលគណនី</span>
            </button>
            <button
              type="button"
              onClick={() => { setTab('register'); setError(''); setSuccessMsg(''); }}
              className={`py-2 px-1 rounded-xl transition-all flex items-center justify-center gap-1 ${
                tab === 'register'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>✨ ចុះឈ្មោះ</span>
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/20 border border-red-400/40 text-red-300 text-xs font-bold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: LOGIN */}
          {tab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-purple-200 mb-1">អ៊ីមែល (Email)</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-purple-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="yourname@gmail.com"
                    className="w-full bg-black/50 border border-white/20 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-400"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-purple-200">លេខសម្ងាត់ (Password)</label>
                  <button
                    type="button"
                    onClick={() => { setTab('forgot'); setForgotEmail(email); setError(''); setSuccessMsg(''); }}
                    className="text-[11px] text-purple-300 hover:text-yellow-300 transition-colors"
                  >
                    ❓ ភ្លេចលេខសម្ងាត់?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-purple-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-black/50 border border-white/20 rounded-xl pl-10 pr-11 py-2.5 text-xs text-white focus:outline-none focus:border-purple-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-purple-300 hover:text-yellow-300 hover:bg-white/10 rounded-lg transition-all z-10"
                    title={showPassword ? "លាក់លេខសម្ងាត់" : "បង្ហាញលេខសម្ងាត់"}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl font-bold text-xs bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-950/60 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <LogIn className="w-4 h-4" />
                <span>{loading ? 'កំពុងចូល...' : 'ចូលគណនី (Sign In)'}</span>
              </button>
            </form>
          )}

          {/* TAB 2: REGISTER */}
          {tab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-purple-200 mb-1">ជ្រើសរើសរូបតំណាង (Avatar)</label>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {avatars.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setAvatar(a)}
                      className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center border transition-all ${
                        avatar === a
                          ? 'bg-purple-600 border-yellow-400 scale-110 shadow-md'
                          : 'bg-black/40 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-purple-200 mb-1">ឈ្មោះគ្រូបង្រៀន (Teacher Name)</label>
                <div className="relative">
                  <User className="w-4 h-4 text-purple-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="ឧ. លោកគ្រូ សុខា"
                    className="w-full bg-black/50 border border-white/20 rounded-xl pl-10 pr-3.5 py-2 text-xs text-white focus:outline-none focus:border-purple-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-purple-200 mb-1">សាលារៀន / ស្ថាប័ន (School / University)</label>
                <div className="relative">
                  <School className="w-4 h-4 text-purple-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={school}
                    onChange={(e) => setSchool(e.target.value)}
                    placeholder="ឧ. វិទ្យាល័យ ហ៊ុន សែន"
                    className="w-full bg-black/50 border border-white/20 rounded-xl pl-10 pr-3.5 py-2 text-xs text-white focus:outline-none focus:border-purple-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-purple-200 mb-1">អ៊ីមែល (Email)</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-purple-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="yourname@gmail.com"
                    className="w-full bg-black/50 border border-white/20 rounded-xl pl-10 pr-3.5 py-2 text-xs text-white focus:outline-none focus:border-purple-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-purple-200 mb-1">
                  លេខទូរស័ព្ទ (Phone Number) <span className="text-gray-400 font-normal">(ស្រេចចិត្ត / Optional)</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-purple-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="012 345 678"
                    className="w-full bg-black/50 border border-white/20 rounded-xl pl-10 pr-3.5 py-2 text-xs text-white focus:outline-none focus:border-purple-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-purple-200 mb-1">លេខសម្ងាត់ (Password)</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-purple-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="យ៉ាងហោចណាស់ ៦ តួអក្សរ"
                    className="w-full bg-black/50 border border-white/20 rounded-xl pl-10 pr-11 py-2 text-xs text-white focus:outline-none focus:border-purple-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-purple-300 hover:text-yellow-300 hover:bg-white/10 rounded-lg transition-all z-10"
                    title={showPassword ? "លាក់លេខសម្ងាត់" : "បង្ហាញលេខសម្ងាត់"}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl font-bold text-xs bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white shadow-lg shadow-emerald-950/60 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <UserPlus className="w-4 h-4" />
                <span>{loading ? 'កំពុងបង្កើតគណនី...' : 'បង្កើតគណនី (Sign Up)'}</span>
              </button>
            </form>
          )}

          {/* TAB: FORGOT PASSWORD */}
          {tab === 'forgot' && (
            <div className="space-y-3.5">
              {forgotStep === 1 ? (
                <form onSubmit={handleRequestOtp} className="space-y-3.5">
                  <p className="text-xs text-purple-200/80 leading-relaxed">
                    សូមបញ្ចូល Gmail គណនីរបស់អ្នក។ ប្រព័ន្ធនឹងផ្ញើលេខកូដសម្ងាត់ ៦ ខ្ទង់ទៅកាន់ Gmail របស់អ្នក។
                  </p>
                  <div>
                    <label className="block text-xs font-bold text-purple-200 mb-1">អ៊ីមែល Gmail របស់អ្នក</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-purple-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="yourname@gmail.com"
                        className="w-full bg-black/50 border border-white/20 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-yellow-400"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl font-bold text-xs bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-black shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <Send className="w-4 h-4" />
                    <span>{loading ? 'កំពុងដំណើរការ...' : 'ស្នើសុំលេខកូដសម្ងាត់ OTP (Get OTP Code)'}</span>
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtpAndReset} className="space-y-3.5">
                  {telegramBotUrl ? (
                    <div className="space-y-2 bg-gradient-to-br from-sky-950/60 to-purple-950/60 border border-sky-500/30 rounded-2xl p-3.5 shadow-xl text-center">
                      <p className="text-xs text-sky-200 font-semibold leading-relaxed">
                        👉 ចុចប៊ូតុងខាងក្រោមដើម្បីបើក <strong>Telegram Bot</strong> ផ្លូវការ រួចចុច <strong>START</strong> នោះ Bot នឹងផ្ញើលេខកូដសម្ងាត់ ៦ ខ្ទង់ឱ្យលោកគ្រូភ្លាមៗ៖
                      </p>
                      <a
                        href={telegramBotUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white shadow-lg shadow-sky-900/50 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                      >
                        <Send className="w-4 h-4 text-white" />
                        <span>បើក Telegram ទទួលលេខកូដ OTP</span>
                      </a>
                    </div>
                  ) : (
                    <p className="text-[11px] text-purple-300/80 text-center leading-relaxed">
                      💡 សូមពិនិត្យមើលសារលេខកូដ OTP ៦ ខ្ទង់ដែលបានផ្ញើទៅកាន់ Telegram ឬអ៊ីមែលរបស់អ្នក។
                    </p>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-yellow-300 mb-1">លេខកូដ OTP ៦ ខ្ទង់</label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="123456"
                      className="w-full bg-black/60 border border-yellow-400/50 rounded-xl text-center py-2 text-lg font-mono font-bold tracking-[6px] text-yellow-300 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-purple-200 mb-1">លេខសម្ងាត់ថ្មី (New Password)</label>
                    <div className="relative flex items-center">
                      <input
                        type={showResetPassword ? "text" : "password"}
                        required
                        value={resetNewPassword}
                        onChange={(e) => setResetNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-black/50 border border-white/20 rounded-xl pl-3.5 pr-10 py-2 text-xs text-white focus:outline-none focus:border-purple-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowResetPassword(!showResetPassword)}
                        className="absolute right-3 text-gray-400 hover:text-white transition-colors"
                        title={showResetPassword ? "លាក់លេខសម្ងាត់" : "បង្ហាញលេខសម្ងាត់"}
                      >
                        {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-purple-200 mb-1">បញ្ជាក់លេខសម្ងាត់ថ្មី (Confirm)</label>
                    <div className="relative flex items-center">
                      <input
                        type={showResetConfirmPassword ? "text" : "password"}
                        required
                        value={resetConfirmPassword}
                        onChange={(e) => setResetConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-black/50 border border-white/20 rounded-xl pl-3.5 pr-10 py-2 text-xs text-white focus:outline-none focus:border-purple-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowResetConfirmPassword(!showResetConfirmPassword)}
                        className="absolute right-3 text-gray-400 hover:text-white transition-colors"
                        title={showResetConfirmPassword ? "លាក់លេខសម្ងាត់" : "បង្ហាញលេខសម្ងាត់"}
                      >
                        {showResetConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl font-bold text-xs bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{loading ? 'កំពុងផ្ទៀងផ្ទាត់...' : 'កំណត់លេខសម្ងាត់ថ្មី (Set Password)'}</span>
                  </button>

                  <div className="pt-1 text-center">
                    <a
                      href={`https://t.me/${adminTelegram || 'KEMBOREY'}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-purple-300/90 hover:text-yellow-300 transition-colors inline-flex items-center gap-1 cursor-pointer"
                    >
                      💬 ជួបបញ្ហា? ឆាតទាក់ទងលោកគ្រូ បូរី ផ្ទាល់ (@{adminTelegram || 'KEMBOREY'})
                    </a>
                  </div>
                </form>
              )}

              <div className="pt-2 border-t border-white/10 text-center">
                <button
                  type="button"
                  onClick={() => { setTab('login'); setForgotStep(1); setError(''); setSuccessMsg(''); }}
                  className="text-xs text-gray-400 hover:text-white flex items-center justify-center gap-1 mx-auto transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>ត្រឡប់ទៅផ្ទាំង Login</span>
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
