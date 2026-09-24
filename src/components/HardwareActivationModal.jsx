import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, ShieldAlert, Key, CheckCircle2, 
  Sparkles, X, RefreshCw, Send, CloudLightning
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { sound } from '../utils/audioEngine';

export default function HardwareActivationModal({ isOpen, onClose, onActivationSuccess, currentUser }) {
  const [licenseKeyInput, setLicenseKeyInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [botConfig, setBotConfig] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchBotConfig();
    }
  }, [isOpen]);

  const fetchBotConfig = async () => {
    try {
      const res = await fetch('/api/bot/config');
      const data = await res.json();
      if (data.success) {
        setBotConfig(data);
      }
    } catch (err) {
      console.warn('Could not load bot config', err);
    }
  };

  const handleActivate = async (e) => {
    e.preventDefault();
    if (!licenseKeyInput.trim()) {
      setErrorMsg('សូមបញ្ចូលលេខកូដ License Key!');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/license/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          licenseKey: licenseKeyInput.trim(),
          email: currentUser?.email || ''
        })
      });

      const data = await res.json();
      if (data.success) {
        sound.win();
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 }
        });
        setSuccessMsg(data.message);
        setLicenseKeyInput('');
        
        setTimeout(() => {
          if (onActivationSuccess) onActivationSuccess();
          onClose();
        }, 2000);
      } else {
        sound.error();
        setErrorMsg(data.message || 'កូដមិនត្រឹមត្រូវ!');
      }
    } catch (err) {
      sound.error();
      setErrorMsg('មានបញ្ហាក្នុងការភ្ជាប់ទៅកាន់ Server!');
    } finally {
      setLoading(false);
    }
  };

  const handleSendTelegram = () => {
    const telegramUsername = botConfig?.botUsername || 'ackahoot_bot';
    const message = `សួស្តី! ខ្ញុំចង់ទិញកញ្ចប់ Pro សម្រាប់គណនី`;
    const url = `https://t.me/${telegramUsername}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/85" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 shadow-2xl rounded-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        <div className="relative bg-slate-800 border-b border-slate-700 p-6 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-indigo-500/10" />
          
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all text-slate-300 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-600/30 border border-indigo-400/40 rounded-2xl">
              <CloudLightning className="w-8 h-8 text-indigo-300" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                ដំឡើងគណនីទៅជា Pro
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200">
                  Cloud Edition
                </span>
              </h2>
              <p className="text-xs text-indigo-200/70 mt-0.5">
                ដោះសោមុខងារទាំងអស់សម្រាប់គណនីរបស់អ្នក
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">

          <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30 flex items-start gap-3">
            <ShieldAlert className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-200/80">
              <strong className="text-amber-300 block text-sm mb-0.5">Free Edition (សាកល្បង)</strong>
              ដើម្បីទទួលបានសិទ្ធិបង្កើតវិញ្ញាសាមិនកំណត់ និងសិស្សចូលលេងច្រើននាក់ សូមទាក់ទងទិញកញ្ចប់ Pro តាមរយៈ Telegram ខាងក្រោម!
            </div>
          </div>

          <div className="space-y-2">
            <button
              onClick={handleSendTelegram}
              type="button"
              className="w-full py-3 px-4 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/40 text-sky-200 text-sm font-semibold transition-all flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              ទាក់ទងទិញកញ្ចប់ Pro តាម Telegram
            </button>
          </div>

          <form onSubmit={handleActivate} className="space-y-4 pt-4 border-t border-slate-800">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Key className="w-4 h-4 text-amber-400" />
                បញ្ចូលលេខកូដសោរ (Enter License Key):
              </label>
              <input
                type="text"
                value={licenseKeyInput}
                onChange={(e) => setLicenseKeyInput(e.target.value)}
                placeholder="ឧទាហរណ៍៖ ACK-PRO-LIFE-XXXX"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-2xl text-white font-mono text-sm placeholder-slate-600 outline-none transition-all"
              />
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-all"
              >
                បិទ (Close)
              </button>
              <button
                type="submit"
                disabled={loading || !licenseKeyInput.trim()}
                className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white text-sm font-bold shadow-lg shadow-indigo-900/30 transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>កំពុងផ្ទៀងផ្ទាត់...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Upgrade ឥឡូវនេះ</span>
                  </>
                )}
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
}
