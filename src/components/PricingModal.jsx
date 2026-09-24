import React, { useState, useEffect } from 'react';
import { X, Sparkles, CheckCircle2, QrCode, CreditCard, Send, ShieldAlert, CloudLightning } from 'lucide-react';
import { sound } from '../utils/audioEngine';

export default function PricingModal({ currentUser, isOpen, onClose }) {
  const [botConfig, setBotConfig] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState('lifetime');
  const [showQR, setShowQR] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetch('/api/bot/config')
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setBotConfig(data);
          }
        })
        .catch(err => console.warn('Could not fetch bot config', err));
      
      // Reset state on open
      setShowQR(false);
      setSuccessMsg('');
      setErrorMsg('');
      setSelectedPlan('lifetime');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const plans = [
    { id: '1m', name: '1 ខែ (1 Month)', price: botConfig?.prices?.price1Month || '$0.5' },
    { id: '1y', name: '1 ឆ្នាំ (1 Year)', price: botConfig?.prices?.price1Year || '$2.5', popular: true },
    { id: 'lifetime', name: 'មួយជីវិត (Lifetime)', price: botConfig?.prices?.priceLifetime || '$15' }
  ];

  const handleSelectPlan = (planId) => {
    sound.playClick();
    setSelectedPlan(planId);
  };

  const handleProceedToPay = () => {
    sound.playClick();
    if (!currentUser?.email) {
      setErrorMsg('សូម Login ចូលគណនីរបស់អ្នកជាមុនសិន!');
      return;
    }
    setShowQR(true);
  };

  const handleConfirmPayment = async () => {
    sound.playClick();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    const plan = plans.find(p => p.id === selectedPlan);

    try {
      const res = await fetch('/api/payment/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: currentUser?.email,
          planKey: plan.id,
          planName: plan.name,
          planPrice: plan.price
        })
      });

      const data = await res.json();
      if (data.success) {
        sound.win();
        setSuccessMsg('✅ សំណើរបស់អ្នកត្រូវបានបញ្ជូនជោគជ័យ! Admin នឹងពិនិត្យនិងធ្វើការ Upgrade គណនីរបស់អ្នកឆាប់ៗនេះ។');
        setTimeout(() => {
          onClose();
        }, 4000);
      } else {
        sound.error();
        setErrorMsg(data.message || 'មានបញ្ហាក្នុងការផ្ញើសំណើ។');
      }
    } catch (err) {
      sound.error();
      setErrorMsg('មានបញ្ហាបច្ចេកទេស។ សូមព្យាយាមម្តងទៀត។');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/85" onClick={onClose} />
      
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 shadow-2xl rounded-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[95vh]">
        
        {/* Header */}
        <div className="relative bg-slate-800 border-b border-slate-700 p-5 sm:p-6 overflow-hidden shrink-0">
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
                Upgrade ទៅកាន់ Pro Edition
              </h2>
              <p className="text-xs text-indigo-200/70 mt-0.5">
                ដោះសោមុខងារទាំងអស់សម្រាប់គណនី {currentUser?.email}
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-6 overflow-y-auto">
          {!showQR ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-300 text-center mb-4">សូមជ្រើសរើសកញ្ចប់ដែលលោកគ្រូ/អ្នកគ្រូចង់ទិញ៖</p>
              
              <div className="grid gap-3">
                {plans.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => handleSelectPlan(plan.id)}
                    className={`relative p-4 rounded-2xl border-2 transition-all flex items-center justify-between text-left ${
                      selectedPlan === plan.id 
                        ? 'bg-indigo-900/40 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.2)]' 
                        : 'bg-slate-800 border-slate-700 hover:border-slate-500 hover:bg-slate-800/80'
                    }`}
                  >
                    <div>
                      <div className="text-white font-bold">{plan.name}</div>
                      {plan.popular && (
                        <div className="absolute -top-3 left-4 px-2 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold rounded-full shadow-lg">
                          MOST POPULAR
                        </div>
                      )}
                    </div>
                    <div className="text-xl font-black text-indigo-400">{plan.price}</div>
                  </button>
                ))}
              </div>

              {errorMsg && (
                <div className="p-3 mt-4 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                onClick={handleProceedToPay}
                className="w-full mt-6 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-bold shadow-lg shadow-indigo-900/30 transition-all flex items-center justify-center gap-2"
              >
                <CreditCard className="w-5 h-5" />
                បន្តទៅការបង់ប្រាក់
              </button>
            </div>
          ) : (
            <div className="space-y-5 animate-in slide-in-from-right-4 duration-300">
              
              <button 
                onClick={() => setShowQR(false)}
                className="text-indigo-400 hover:text-indigo-300 text-xs flex items-center gap-1 font-semibold"
              >
                ← ត្រឡប់ក្រោយ (Back)
              </button>

              <div className="text-center space-y-2">
                <h3 className="text-lg font-bold text-white">ទូទាត់ប្រាក់តាមរយៈ ABA KHQR</h3>
                <p className="text-sm text-slate-300">
                  កញ្ចប់ជ្រើសរើស៖ <span className="text-indigo-400 font-bold">{plans.find(p => p.id === selectedPlan)?.name}</span> 
                  (<span className="text-amber-400">{plans.find(p => p.id === selectedPlan)?.price}</span>)
                </p>
              </div>

              <div className="bg-white p-3 sm:p-4 rounded-3xl mx-auto w-48 h-48 sm:w-64 sm:h-64 flex items-center justify-center relative overflow-hidden shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                {botConfig?.khqrImage ? (
                  <img src={botConfig.khqrImage} alt="KHQR" className="w-full h-full object-contain" />
                ) : (
                  <div className="text-center text-slate-500">
                    <QrCode className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">មិនទាន់មាន QR ទេ</p>
                  </div>
                )}
              </div>

              <div className="text-center text-xs text-slate-400 bg-slate-950/50 p-3 rounded-xl border border-slate-800">
                <p>សូម Scan QR ខាងលើដើម្បីបង់ប្រាក់។</p>
                <p className="mt-1">ឈ្មោះគណនី៖ <strong className="text-slate-200">{botConfig?.bankAccountName || 'ABA Account'}</strong></p>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex flex-col items-center gap-2 text-center">
                  <CheckCircle2 className="w-6 h-6 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {!successMsg && (
                <button
                  onClick={handleConfirmPayment}
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-bold shadow-lg shadow-emerald-900/30 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      កំពុងផ្ញើ...
                    </span>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      ខ្ញុំបានបង់ប្រាក់រួចរាល់ (I have paid)
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
