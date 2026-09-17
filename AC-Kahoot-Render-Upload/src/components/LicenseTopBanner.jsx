import React, { useState, useEffect } from 'react';
import { X, KeyRound, ExternalLink, Flame } from 'lucide-react';
import { sound } from '../utils/audioEngine';

export default function LicenseTopBanner({ 
  currentUser, 
  systemLicense,
  onOpenProfileModal, 
  onOpenAuthModal, 
  lang = 'km' 
}) {
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem('ack_promo_banner_dismissed') === 'true' || 
           sessionStorage.getItem('ack_promo_banner_dismissed') === 'true';
  });
  const [machineHwid, setMachineHwid] = useState('');
  const [machineLicense, setMachineLicense] = useState(systemLicense || null);
  const [announcement, setAnnouncement] = useState({
    enabled: true,
    showForFreeOnly: true,
    textKm: "⚡ បង្កើនប្រសិទ្ធភាពបង្រៀនពេញមួយឆ្នាំជាមួយ AC-Kahoot! Pro – បង្កើតវិញ្ញាសា & សិស្សចូលលេងមិនកំណត់។ តម្លៃត្រឹមតែ $ ១/ឆ្នាំ (ផុតកំណត់ថ្ងៃ ៣១ កញ្ញា) !!!",
    textEn: "⚡ Improve student outcomes this school year with AC-Kahoot! Pro. Unlimited quizzes & players. Special offer $1/year (Ends Sept 31) !!!",
    buttonTextKm: "ទិញឥឡូវនេះ (Buy now)",
    buttonTextEn: "Buy now",
    buttonLink: "https://t.me/ac_mart_programer_developer_bot"
  });

  useEffect(() => {
    fetch('/api/announcement')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.announcement) {
          setAnnouncement(data.announcement);
        }
      })
      .catch(err => console.warn('Could not fetch announcement', err));

    fetch('/api/license/machine-info')
      .then(res => res.json())
      .then(data => {
        if (data && data.success) {
          if (data.activeLicense) setMachineLicense(data.activeLicense);
          if (data.hwid) setMachineHwid(data.hwid);
        }
      })
    fetch('/api/bot/config')
      .then(res => res.json())
      .then(data => {
        if (data && data.success) setBotConfig(data);
      })
      .catch(() => {});
  }, []);

  const [botConfig, setBotConfig] = useState(null);

  const isSuperAdmin = currentUser?.role === 'superadmin';

  // If dismissed by normal user, hide
  if (dismissed && !isSuperAdmin) return null;

  // Determine if machine or user is already licensed
  const isLicensed = Boolean(
    (systemLicense && systemLicense.isLicensed) ||
    (machineLicense && machineLicense.isLicensed) ||
    (currentUser?.license && 
     currentUser.license.toLowerCase() !== 'free' && 
     currentUser.license.toLowerCase() !== 'free_tier' && 
     currentUser.license.toLowerCase() !== 'trial')
  );

  // If machine is activated or user has Pro/VIP/Paid license -> NEVER show promotional banner
  if (isLicensed && !isSuperAdmin) return null;

  // If announcement is explicitly disabled -> hide banner
  if (announcement && !announcement.enabled && !isSuperAdmin) return null;
  if (announcement?.showForFreeOnly && isLicensed && !isSuperAdmin) return null;

  const handleDismiss = () => {
    sound.playClick();
    setDismissed(true);
    localStorage.setItem('ack_promo_banner_dismissed', 'true');
    sessionStorage.setItem('ack_promo_banner_dismissed', 'true');
  };

  const handleBuyNow = () => {
    sound.playClick();
    const cleanHwid = (machineHwid || machineLicense?.hwid || '').replace(/[^a-zA-Z0-9_-]/g, '');
    const username = botConfig?.botUsername || 'ac_mart_programer_developer_bot';
    let link = announcement?.buttonLink || `https://t.me/${username}`;
    
    if (link.includes('ac_mart_programer_developer_bot') && botConfig?.botUsername) {
      link = link.replace('ac_mart_programer_developer_bot', botConfig.botUsername);
    }
    
    if (link.includes('t.me') && cleanHwid && !link.includes('start=')) {
      link += (link.includes('?') ? '&' : '?') + `start=HWID_${cleanHwid}`;
    }
    window.open(link, '_blank');
  };

  const handleEnterKey = () => {
    sound.playClick();
    if (currentUser) {
      onOpenProfileModal && onOpenProfileModal();
    } else {
      onOpenAuthModal && onOpenAuthModal();
    }
  };

  const bannerText = lang === 'km' 
    ? (announcement?.textKm || '⚡ បង្កើនប្រសិទ្ធភាពបង្រៀនពេញមួយឆ្នាំជាមួយ AC-Kahoot! Pro – បង្កើតវិញ្ញាសា & សិស្សចូលលេងមិនកំណត់។ ចុះតម្លៃ ២០% ត្រឹមតែ $3/ខែ (ផុតកំណត់ថ្ងៃ ៣១ សីហា)។')
    : (announcement?.textEn || '⚡ Improve student outcomes this school year with AC-Kahoot! Pro. Unlimited quizzes & players. Save 20% from $3/mo. Offer ends August 31.');

  const btnText = lang === 'km'
    ? (announcement?.buttonTextKm || 'ទិញឥឡូវនេះ (Buy now)')
    : (announcement?.buttonTextEn || 'Buy now');

  return (
    <div className="banner-flowing border-b border-white/20 text-white px-2.5 py-1.5 sm:py-2 transition-all text-xs sm:text-sm font-khmer shadow-lg relative z-50 overflow-hidden">
      {/* Background Glow */}
      <div className="absolute -left-10 top-0 w-32 h-32 bg-yellow-400/15 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute right-20 top-0 w-32 h-32 bg-pink-500/15 rounded-full blur-2xl pointer-events-none" />

      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 relative z-10">
        {/* Left Dismiss Button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-all shrink-0"
          title={lang === 'km' ? 'បិទផ្ទាំងជូនដំណឹង' : 'Dismiss notice'}
        >
          <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        {/* Center Flowing & Pulsing Banner Content */}
        <div className="flex-1 text-center font-medium flex items-center justify-center flex-wrap gap-x-1.5 gap-y-0.5 px-1">
          <span className="text-white drop-shadow-md leading-tight sm:leading-snug flex items-center gap-1 font-bold text-[11px] sm:text-xs md:text-sm">
            <span className="inline-block animate-pulse text-yellow-300">⚡</span>
            <span>{bannerText}</span>
          </span>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleEnterKey}
            className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black/40 hover:bg-black/60 text-yellow-300 border border-yellow-400/40 text-xs font-bold transition-all hover:scale-105 shadow-sm"
            title={lang === 'km' ? 'បញ្ចូលលេខកូដ License Key' : 'Enter License Key'}
          >
            <KeyRound className="w-3 h-3 text-yellow-400" />
            <span>{lang === 'km' ? 'បញ្ចូល Key' : 'Enter Key'}</span>
          </button>

          <button
            type="button"
            onClick={handleBuyNow}
            className="shimmer-effect px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl bg-white hover:bg-yellow-300 text-purple-950 font-black text-[11px] sm:text-xs shadow-md transition-all hover:scale-105 active:scale-95 flex items-center gap-1 shrink-0 whitespace-nowrap"
          >
            <span>{btnText}</span>
            <ExternalLink className="w-3 h-3 text-purple-900 hidden sm:inline" />
          </button>
        </div>
      </div>
    </div>
  );
}
