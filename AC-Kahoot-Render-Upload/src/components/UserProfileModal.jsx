import React, { useState, useEffect } from 'react';
import { X, User, School, Lock, Save, Sparkles, Check, KeyRound, Send, Eye, EyeOff } from 'lucide-react';
import { sound } from '../utils/audioEngine';

export default function UserProfileModal({ isOpen, onClose, currentUser, onUpdateUser, onOpenPricingModal, lang = 'km' }) {
  if (!isOpen || !currentUser) return null;

  const [name, setName] = useState(currentUser.name || '');
  const [school, setSchool] = useState(currentUser.school || '');
  const [avatar, setAvatar] = useState(currentUser.avatar || '👨‍🏫');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [activationKey, setActivationKey] = useState('');
  const [activating, setActivating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [botConfig, setBotConfig] = useState(null);
  const [hwid, setHwid] = useState('');

  useEffect(() => {
    fetch('/api/bot/config')
      .then(r => r.json())
      .then(d => { if (d.success) setBotConfig(d); })
      .catch(() => {});

    fetch('/api/license/machine-info')
      .then(r => r.json())
      .then(d => { if (d.success && d.hwid) setHwid(d.hwid); })
      .catch(() => {});
  }, [isOpen]);

  const avatars = ['👨‍🏫', '👩‍🏫', '🧑‍🏫', '🎓', '🏛️', '🌟', '👓', '📚', '💼', '🏆'];

  const handleActivateLicense = async () => {
    if (!activationKey.trim()) return;
    sound.playClick();
    setActivating(true);
    setMessage({ text: '', type: '' });

    try {
      const res = await fetch('/api/license/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: currentUser.email,
          licenseKey: activationKey.trim()
        })
      });
      const data = await res.json();
      if (data.success && data.user) {
        sound.playCorrect();
        onUpdateUser(data.user);
        setMessage({
          text: data.message || (lang === 'km' ? 'បានបើកប្រើប្រាស់ License ដោយជោគជ័យ!' : 'License activated successfully!'),
          type: 'success'
        });
        setActivationKey('');
      } else {
        setMessage({ text: data.message || (lang === 'km' ? 'ការបើកប្រើ License មិនជោគជ័យ' : 'Activation failed'), type: 'error' });
      }
    } catch (err) {
      setMessage({ text: lang === 'km' ? 'មិនអាចភ្ជាប់ទៅកាន់ Server បានទេ' : 'Cannot connect to server', type: 'error' });
    } finally {
      setActivating(false);
    }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setMessage({ text: '', type: '' });

    if (newPassword && newPassword !== confirmPassword) {
      setMessage({
        text: lang === 'km' ? 'លេខសម្ងាត់ផ្ទៀងផ្ទាត់មិនត្រូវគ្នាឡើយ!' : 'Passwords do not match!',
        type: 'error'
      });
      return;
    }

    sound.playClick();
    setLoading(true);

    try {
      const res = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          name,
          school,
          avatar,
          currentPassword,
          newPassword: newPassword || undefined
        })
      });
      const data = await res.json();
      if (data.success && data.user) {
        sound.playCorrect();
        onUpdateUser(data.user);
        setMessage({
          text: data.message || (lang === 'km' ? 'បានរក្សាទុកព័ត៌មានដោយជោគជ័យ!' : 'Profile updated successfully!'),
          type: 'success'
        });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setMessage({ text: data.message || 'Error occurred', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'Cannot connect to server', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-khmer animate-scale-in">
      <div className="glass-panel border border-purple-400/40 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl bg-[#1d0638]">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-purple-950/60 to-black/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-600/30 border border-purple-400/30 flex items-center justify-center text-2xl shadow-lg">
              {avatar}
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>{lang === 'km' ? 'ព័ត៌មានគណនី & License' : 'Account & License Settings'}</span>
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-purple-200/70">{currentUser.email}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-400/20 text-yellow-300 border border-yellow-400/30">
                  {currentUser.license === 'founder_unlimited' ? '👑 Founder' : currentUser.license === 'pro_lifetime' ? '👑 Pro Lifetime' : currentUser.license === 'vip_unlimited' ? '🏛️ VIP School' : 'Pro Annual'}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {message.text && (
            <div className={`p-3 rounded-xl border text-xs font-bold text-center ${
              message.type === 'success'
                ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
                : 'bg-red-500/20 border-red-400/40 text-red-300'
            }`}>
              {message.text}
            </div>
          )}

          {/* License Status Card / Activation Box */}
          {currentUser.license && currentUser.license !== 'free' ? (
            <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>អាជ្ញាប័ណ្ណសកម្ម (Active License)</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  {currentUser.license === 'VIP_SCHOOL' || currentUser.license === 'vip_unlimited' ? '🏫 VIP School Lifetime' : 
                   currentUser.license === 'pro_annual' ? '📅 Pro Annual (ប្រចាំឆ្នាំ)' :
                   currentUser.license === 'pro_monthly' ? '⏳ Pro Monthly (ប្រចាំខែ)' :
                   currentUser.license === 'PRO_LIFETIME' ? '👑 Pro Lifetime (មួយជីវិត)' : '👑 Pro Edition'}
                </span>
              </div>
              <div className="flex flex-col gap-1 mt-1">
                <p className="text-[11px] text-emerald-200/80">
                  ✅ គណនីរបស់អ្នកត្រូវបានដំឡើងកម្រិតទៅជា Pro រួចរាល់!
                </p>
                {currentUser.licenseExpiryDate && (
                  <p className="text-[11px] text-amber-300 font-bold bg-amber-900/30 px-2 py-1 rounded-lg border border-amber-500/30 w-max">
                    ⏳ ថ្ងៃផុតកំណត់៖ {new Date(currentUser.licenseExpiryDate).toLocaleDateString('en-GB')}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-yellow-500/10 via-purple-900/30 to-black/40 border border-yellow-400/30 space-y-2">
              <h3 className="text-xs font-bold text-yellow-300 flex items-center justify-between gap-1.5">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                  <span>{lang === 'km' ? 'Upgrade ទៅកាន់ Pro / VIP' : 'Upgrade to Pro / VIP'}</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onOpenPricingModal) onOpenPricingModal();
                  }}
                  className="bg-yellow-500 hover:bg-yellow-400 text-black px-3 py-1 rounded-full text-[10px] font-black transition-all hover:scale-105 shadow-[0_0_10px_rgba(234,179,8,0.4)]"
                >
                  ទិញកញ្ចប់ឥឡូវនេះ (Buy Now)
                </button>
              </h3>
              
              <div className="text-[10px] text-yellow-200/60 mt-1 mb-2">ប្រសិនបើមាន License Key សូមបញ្ចូលខាងក្រោម៖</div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={activationKey}
                  onChange={(e) => setActivationKey(e.target.value)}
                  placeholder="ACK-PRO-XXXX-YYYY-ZZZZ"
                  className="flex-1 bg-black/60 border border-yellow-400/40 rounded-xl px-3 py-1.5 text-xs text-yellow-300 font-mono focus:outline-none focus:border-yellow-300 uppercase tracking-wider"
                />
                <button
                  type="button"
                  onClick={handleActivateLicense}
                  disabled={activating || !activationKey.trim()}
                  className="px-3 py-1.5 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-bold shadow-md transition-all hover:scale-105 disabled:opacity-50"
                >
                  {activating ? '...' : (lang === 'km' ? 'បើកប្រើ (Activate)' : 'Activate')}
                </button>
              </div>

              {/* Push to Telegram Bot directly */}
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  const username = botConfig?.botUsername || 'ac_mart_programer_developer_bot';
                  const cleanHwid = (hwid || '').replace(/[^a-zA-Z0-9_-]/g, '');
                  const url = cleanHwid 
                    ? `https://t.me/${username}?start=HWID_${cleanHwid}`
                    : `https://t.me/${username}`;
                  window.open(url, '_blank');
                }}
                className="w-full py-2 px-3 rounded-xl bg-[#229ED9]/20 hover:bg-[#229ED9]/30 border border-[#229ED9]/40 text-[#54c4f8] text-xs font-bold transition-all flex items-center justify-center gap-2 hover:scale-[1.02]"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{lang === 'km' ? '✈️ ទិញ License Key តាម Telegram Bot' : '✈️ Buy License via Telegram Bot'}</span>
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Avatar Selector */}
            <div>
              <label className="block text-xs font-bold text-purple-200 mb-2">
                {lang === 'km' ? 'រូបតំណាង (Avatar)' : 'Choose Avatar'}
              </label>
              <div className="flex flex-wrap gap-2">
                {avatars.map((av) => (
                  <button
                    key={av}
                    type="button"
                    onClick={() => setAvatar(av)}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-all ${
                      avatar === av
                        ? 'bg-purple-600 border-2 border-yellow-400 scale-110 shadow-lg'
                        : 'bg-white/5 hover:bg-white/15 border border-white/10'
                    }`}
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-xs font-bold text-purple-200 mb-1">
                {lang === 'km' ? 'ឈ្មោះគ្រូបង្រៀន (Full Name)' : 'Full Name'}
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-purple-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-black/50 border border-white/20 rounded-xl pl-10 pr-3.5 py-2 text-xs text-white focus:outline-none focus:border-purple-400 font-medium"
                />
              </div>
            </div>

            {/* School / Department */}
            <div>
              <label className="block text-xs font-bold text-purple-200 mb-1">
                {lang === 'km' ? 'សាលារៀន / ស្ថាប័ន / អង្គភាព' : 'School / Department'}
              </label>
              <div className="relative">
                <School className="w-4 h-4 text-purple-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  placeholder="ឧ. មន្ទីរផែនការខេត្ត..."
                  className="w-full bg-black/50 border border-white/20 rounded-xl pl-10 pr-3.5 py-2 text-xs text-white focus:outline-none focus:border-purple-400 font-medium"
                />
              </div>
            </div>

            {/* Password Change Box */}
            <div className="pt-3 border-t border-white/10 space-y-3">
              <h3 className="text-xs font-bold text-yellow-300 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5" />
                <span>{lang === 'km' ? 'ប្តូរលេខសម្ងាត់ថ្មី (Password Change)' : 'Change Password'}</span>
              </h3>

              <div>
                <label className="block text-[11px] font-medium text-purple-200/80 mb-1">
                  {lang === 'km' ? 'លេខសម្ងាត់បច្ចុប្បន្ន (Current Password)' : 'Current Password'}
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-black/50 border border-white/20 rounded-xl pl-3.5 pr-10 py-2 text-xs text-white focus:outline-none focus:border-purple-400 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 text-gray-400 hover:text-white transition-colors"
                    title={showCurrentPassword ? "លាក់លេខសម្ងាត់" : "បង្ហាញលេខសម្ងាត់"}
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-purple-200/80 mb-1">
                  {lang === 'km' ? 'លេខសម្ងាត់ថ្មី (New Password)' : 'New Password'}
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={lang === 'km' ? 'ទុកទំនេរប្រសិនបើមិនចង់ប្តូរ' : 'Leave blank if not changing'}
                    className="w-full bg-black/50 border border-white/20 rounded-xl pl-3.5 pr-10 py-2 text-xs text-white focus:outline-none focus:border-purple-400 font-mono"
                  />
                  {newPassword && (
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 text-gray-400 hover:text-white transition-colors"
                      title={showNewPassword ? "លាក់លេខសម្ងាត់" : "បង្ហាញលេខសម្ងាត់"}
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>

              {newPassword && (
                <div>
                  <label className="block text-[11px] font-medium text-purple-200/80 mb-1">
                    {lang === 'km' ? 'បញ្ជាក់លេខសម្ងាត់ថ្មី (Confirm New Password)' : 'Confirm New Password'}
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-black/50 border border-white/20 rounded-xl pl-3.5 pr-10 py-2 text-xs text-white focus:outline-none focus:border-purple-400 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 text-gray-400 hover:text-white transition-colors"
                      title={showConfirmPassword ? "លាក់លេខសម្ងាត់" : "បង្ហាញលេខសម្ងាត់"}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl font-bold text-xs bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-950/60 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <Save className="w-4 h-4" />
                <span>{loading ? (lang === 'km' ? 'កំពុងរក្សាទុក...' : 'Saving...') : (lang === 'km' ? 'រក្សាទុកការផ្លាស់ប្តូរ (Save Changes)' : 'Save Changes')}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
