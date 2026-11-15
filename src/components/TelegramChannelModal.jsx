import React, { useState, useEffect } from 'react';
import { X, ExternalLink, Copy, Check, Users, Sparkles, MessageSquare } from 'lucide-react';
import { sound } from '../utils/audioEngine';

export default function TelegramChannelModal({ isOpen, onClose, lang = 'km' }) {
  const [copied, setCopied] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState(39);

  useEffect(() => {
    if (!isOpen) return;
    // Fetch live member count if backend endpoint is accessible
    fetch('/api/channel/info')
      .then(res => res.json())
      .then(data => {
        if (data && data.success && data.memberCount) {
          setSubscriberCount(data.memberCount);
        }
      })
      .catch(() => {});
  }, [isOpen]);

  if (!isOpen) return null;

  const channelUrl = 'https://t.me/ac_mart';

  const handleCopyLink = () => {
    sound.playClick();
    navigator.clipboard.writeText(channelUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenChannel = () => {
    sound.playClick();
    window.open(channelUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-khmer">
      <div 
        className="relative w-full max-w-md rounded-3xl bg-gradient-to-b from-[#170535] via-[#100325] to-[#0a0118] border border-sky-500/40 p-6 sm:p-7 shadow-2xl text-white animate-scale-in text-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={() => { sound.playClick(); onClose(); }}
          className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          title="បិទ (Close)"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Channel Icon & Badge */}
        <div className="relative mx-auto w-20 h-20 mb-3">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-sky-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-950/60 border border-sky-400/40 overflow-hidden">
            <img 
              src="/ac-logo.jpg" 
              alt="AC Mart" 
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
              }} 
            />
          </div>
          <span className="absolute -bottom-1 -right-1 bg-sky-500 text-white p-1 rounded-full text-xs shadow-md">
            📢
          </span>
        </div>

        <h2 className="text-xl font-black text-white flex items-center justify-center gap-1.5 font-['Outfit']">
          AC Mart Programing
        </h2>
        <p className="text-xs text-sky-300 font-mono mt-0.5 font-semibold">@ac_mart</p>

        {/* Subscriber counter pill */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 mt-2.5 rounded-full bg-sky-950/70 border border-sky-400/30 text-[11px] text-sky-200">
          <Users className="w-3.5 h-3.5 text-sky-400" />
          <span>{subscriberCount}+ សមាជិកតាមដាន (Subscribers)</span>
        </div>

        {/* Description & Value Proposition */}
        <div className="mt-3.5 p-3 rounded-2xl bg-black/40 border border-white/10 text-xs text-purple-200/90 leading-relaxed text-left">
          <p className="font-semibold text-white mb-1 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
            <span>អត្ថប្រយោជន៍ពេលចូលរួម Channel ផ្លូវការ៖</span>
          </p>
          <ul className="space-y-1 text-[11px] text-purple-200/80 list-disc list-inside">
            <li>ចែករំលែកកម្មវិធី កុំព្យូទ័រ Android & iOS ឥតគិតថ្លៃ (មិត្តជួយមិត្ត)</li>
            <li>កញ្ចប់វិញ្ញាសា Quiz ថ្មីៗ & គន្លឹះបង្រៀនតាមបែប Interactive</li>
            <li>ការ Update មុខងារថ្មីៗ & សិទ្ធិប្រើប្រាស់ AC-GAME Pro</li>
            <li>គាំទ្របច្ចេកទេស និងដោះស្រាយបញ្ហាផ្ទាល់ពីអ្នកបង្កើតកម្មវិធី</li>
          </ul>
        </div>

        {/* QR Code Container */}
        <div className="mt-4 p-3 bg-white rounded-2xl shadow-inner inline-block">
          <img 
            src="/telegram-channel-qr.png" 
            alt="QR Code @AC_MART" 
            className="w-36 h-36 mx-auto rounded-xl object-contain"
          />
          <p className="text-[10px] text-gray-700 font-bold mt-1 font-mono">Scan លើទូរស័ព្ទដើម្បីចូល</p>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 space-y-2.5">
          <button
            type="button"
            onClick={handleOpenChannel}
            className="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-400 hover:to-blue-500 text-white shadow-xl shadow-sky-950/60 flex items-center justify-center gap-2 transform hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
          >
            <ExternalLink className="w-4 h-4" />
            <span>ចូលរួម Telegram Channel ឥឡូវនេះ (@ac_mart)</span>
          </button>

          <button
            type="button"
            onClick={handleCopyLink}
            className="w-full py-2 px-3 rounded-xl font-medium text-xs bg-white/10 hover:bg-white/15 text-purple-200 hover:text-white border border-white/10 flex items-center justify-center gap-1.5 transition-all"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300 font-bold">បានចម្លង Link រួចរាល់!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>ចម្លង Link (Copy t.me/ac_mart)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

