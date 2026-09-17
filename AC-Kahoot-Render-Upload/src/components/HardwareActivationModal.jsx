import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, ShieldAlert, Key, Copy, CheckCircle2, 
  ExternalLink, Sparkles, X, RefreshCw, Laptop, Send, Lock
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { sound } from '../utils/audioEngine';

export default function HardwareActivationModal({ isOpen, onClose, onActivationSuccess, currentUser }) {
  const [machineInfo, setMachineInfo] = useState(null);
  const [licenseKeyInput, setLicenseKeyInput] = useState('');
  const [clientNameInput, setClientNameInput] = useState(currentUser?.name || '');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [botConfig, setBotConfig] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchMachineInfo();
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

  const fetchMachineInfo = async () => {
    try {
      const res = await fetch('/api/license/machine-info');
      const data = await res.json();
      if (data.success) {
        setMachineInfo(data);
      }
    } catch (err) {
      console.error('Failed to fetch machine info:', err);
    }
  };

  const handleCopyHwid = () => {
    if (!machineInfo?.hwid) return;
    navigator.clipboard.writeText(machineInfo.hwid);
    setCopied(true);
    sound.click();
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSendTelegram = () => {
    const cleanEmail = (currentUser?.email || '').replace(/[^a-zA-Z0-9@._-]/g, '');
    const b64Email = cleanEmail ? btoa(cleanEmail).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : '';
    const username = botConfig?.botUsername || 'ac_mart_programer_developer_bot';
    const botUrl = `https://t.me/${username}?start=E_${b64Email}`;
    
    // Auto-copy as a handy backup as well
    const adminName = botConfig?.adminName || 'លោកគ្រូ បូរី';
    const rawMsg = `សួស្តី${adminName}! ខ្ញុំចង់ទិញ License AC-Kahoot Pro។\n\n📧 Email របស់ខ្ញុំ៖\n${currentUser?.email || ''}\n\nសូមជួយបង្កើត License Key ជូនខ្ញុំផង។ សូមអរគុណ!`;
    try { navigator.clipboard.writeText(rawMsg); } catch(e) {}
    
    setCopied(true);
    sound.click();
    setTimeout(() => setCopied(false), 3000);

    // Open Telegram Bot
    window.open(botUrl, '_blank');
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
      const res = await fetch('/api/license/activate-hwid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          licenseKey: licenseKeyInput.trim(),
          clientName: clientNameInput.trim() || currentUser?.name || 'អតិថិជនកិត្តិយស',
          email: currentUser?.email || ''
        })
      });

      const data = await res.json();
      if (data.success) {
        sound.win();
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 }
        });
        setSuccessMsg(data.message || '🎉 បានបញ្ជាក់សោរជោគជ័យ!');
        await fetchMachineInfo();
        if (onActivationSuccess) {
          onActivationSuccess(data);
        }
        // Auto close after 1.8s so user moves on to the app
        setTimeout(() => {
          if (onClose) onClose();
        }, 1800);
      } else {
        sound.error();
        setErrorMsg(data.message || '🔒 លេខកូដ License Key មិនត្រឹមត្រូវ ឬមិនត្រូវជាមួយម៉ាស៊ីននេះឡើយ!');
      }
    } catch (err) {
      sound.error();
      setErrorMsg('មានបញ្ហាក្នុងការតភ្ជាប់ទៅកាន់ Server!');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const isAlreadyLicensed = machineInfo?.activeLicense?.isLicensed;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl bg-slate-900 border border-purple-500/30 rounded-3xl shadow-2xl overflow-hidden text-white">
        
        {/* Top Gradient Banner */}
        <div className="relative p-6 bg-gradient-to-r from-purple-900/80 via-indigo-900/80 to-slate-900 border-b border-purple-500/20">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all text-slate-300 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-600/30 border border-purple-400/40 rounded-2xl">
              <ShieldCheck className="w-8 h-8 text-purple-300" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                សោរសុវត្ថិភាពម៉ាស៊ីន (Hardware License)
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-200">
                  Offline HWID Protection
                </span>
              </h2>
              <p className="text-xs text-purple-200/70 mt-0.5">
                ចាក់សោរការពារកម្មវិធីភ្ជាប់ជាមួយ Hardware នៃកុំព្យូទ័រនេះ
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">

          {/* Current License Status Card */}
          {isAlreadyLicensed ? (
            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-emerald-300 text-sm">
                  {machineInfo?.activeLicense?.planTitle}
                </div>
                <div className="text-xs text-emerald-200/70 mt-1">
                  ចុះឈ្មោះជូន៖ <strong>{machineInfo?.activeLicense?.licensedTo}</strong>
                  {machineInfo?.activeLicense?.expiresAt && machineInfo?.activeLicense?.expiresAt !== 'LIFETIME' && (
                    <span className="block mt-0.5 text-amber-300">
                      ផុតកំណត់នៅ៖ {new Date(machineInfo.activeLicense.expiresAt).toLocaleDateString('km-KH')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30 flex items-start gap-3">
              <Lock className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-200/80">
                <strong className="text-amber-300 block text-sm mb-0.5">Free Trial Edition (សាកល្បង)</strong>
                ដើម្បីទទួលបានសិទ្ធិបង្កើតវិញ្ញាសា និងសិស្សចូលលេងមិនកំណត់ សូមផ្ញើលេខ Machine ID ខាងក្រោមទៅកាន់អ្នកលក់ដើម្បីទទួលបាន License Key!
              </div>
            </div>
          )}

          {/* Machine ID Box */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Laptop className="w-4 h-4 text-purple-400" />
              លេខសម្គាល់កុំព្យូទ័ររបស់អ្នក (Hardware Machine ID):
            </label>
            <div className="flex items-center gap-2 p-3 bg-slate-950 border border-purple-500/40 rounded-2xl font-mono text-sm text-purple-200">
              <span className="flex-1 select-all font-bold tracking-wider">
                {machineInfo?.hwid || 'កំពុងទាញយក HWID...'}
              </span>
              <button
                onClick={handleCopyHwid}
                type="button"
                className="px-3 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-400/40 text-xs font-semibold transition-all flex items-center gap-1.5 text-purple-200"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>បាន Copy!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy HWID</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Telegram Send Button */}
            <button
              onClick={handleSendTelegram}
              type="button"
              className="w-full py-2.5 px-4 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/40 text-sky-200 text-xs font-semibold transition-all flex items-center justify-center gap-2"
            >
              <Send className="w-3.5 h-3.5" />
              ទាក់ទងទិញតាម Telegram អ្នកលក់ (Buy via Telegram)
            </button>
          </div>

          {/* Activation Form */}
          <form onSubmit={handleActivate} className="space-y-4 pt-2 border-t border-slate-800">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Key className="w-4 h-4 text-amber-400" />
                បញ្ចូលលេខកូដសោរ (Enter License Key):
              </label>
              <input
                type="text"
                value={licenseKeyInput}
                onChange={(e) => setLicenseKeyInput(e.target.value)}
                placeholder="ឧទាហរណ៍៖ ACK-PRO-LIFE-XXXX-YYYY"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 focus:border-purple-500 rounded-2xl text-white font-mono text-sm placeholder-slate-600 outline-none transition-all"
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
                className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white text-sm font-bold shadow-lg shadow-purple-900/30 transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>កំពុងផ្ទៀងផ្ទាត់...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Activate License</span>
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
