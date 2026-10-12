import React from 'react';
import { X, MonitorDown, Download, CheckCircle, ExternalLink, HelpCircle } from 'lucide-react';
import { sound } from '../utils/audioEngine';

export default function DesktopInstallModal({ isOpen, onClose, lang = 'km', onPromptPWA, hasPrompt = false }) {
  if (!isOpen) return null;

  const downloadDesktopShortcut = () => {
    sound.playCorrect();
    const currentOrigin = window.location.origin;
    const shortcutContent = `[InternetShortcut]\r\nURL=${currentOrigin}\r\nIconIndex=0\r\nIconFile=${currentOrigin}/favicon.ico\r\n`;
    const blob = new Blob([shortcutContent], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'AC-Kahoot.url';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-khmer">
      <div 
        className="relative w-full max-w-lg rounded-3xl bg-gradient-to-b from-[#1b0638] via-[#14032c] to-[#0c011b] border border-purple-500/30 p-6 sm:p-7 shadow-2xl text-white animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={() => { sound.playClick(); onClose(); }}
          className="absolute top-5 right-5 p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          title="បិទ (Close)"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg border border-purple-400/30 shrink-0">
            <MonitorDown className="w-6 h-6 text-yellow-300" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-white">
              {lang === 'km' ? 'ដំឡើងលើ Desktop កុំព្យូទ័រ' : 'Install App to Desktop'}
            </h2>
            <p className="text-xs text-purple-200/70">
              {lang === 'km' ? 'បើកលេង ឬបង្រៀនបានលឿន ១ ឃ្លីកពី Desktop' : '1-Click quick launch right from your desktop'}
            </p>
          </div>
        </div>

        {/* Content Options */}
        <div className="space-y-4">
          {/* Method 1: Direct PWA Install Button (If supported by browser) */}
          {hasPrompt ? (
            <div className="p-4 rounded-2xl bg-purple-900/40 border border-purple-400/40 space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-xs font-bold border border-emerald-400/30">1</span>
                <h3 className="text-sm font-bold text-white">
                  {lang === 'km' ? 'ដំឡើងជា App ផ្លូវការ (PWA Install)' : 'Install Official PWA App'}
                </h3>
              </div>
              <p className="text-xs text-purple-200/80 leading-relaxed">
                {lang === 'km' 
                  ? 'កម្មវិធីនឹងត្រូវដំឡើងទៅក្នុង Start Menu និងអេក្រង់ Desktop ដំណើរការដាច់ដោយឡែកដូចកម្មវិធី Desktop ពិតប្រាកដ។' 
                  : 'Installs as a standalone native-like desktop app without browser toolbars.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  onPromptPWA && onPromptPWA();
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <MonitorDown className="w-4 h-4" />
                <span>{lang === 'km' ? 'ចុចទីនេះដើម្បីដំឡើងភ្លាមៗ (Install Now)' : 'Install Now'}</span>
              </button>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-purple-900/40 border border-purple-400/40 space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center text-xs font-bold border border-cyan-400/30">1</span>
                <h3 className="text-sm font-bold text-white">
                  {lang === 'km' ? 'ដំឡើងតាមរយៈ Browser (Chrome / Edge)' : 'Install via Browser'}
                </h3>
              </div>
              <p className="text-xs text-purple-200/80 leading-relaxed">
                {lang === 'km'
                  ? 'នៅលើ Google Chrome ឬ Microsoft Edge សូមក្រឡេកមើលទៅ «ចុងរបារ URL (Address Bar)» ខាងលើផ្នែកស្តាំ រួចចុចលើសញ្ញា 🖥️ ឬ ⬇️ (Install App) ដើម្បីដំឡើង។'
                  : 'Look at the right end of your Chrome or Edge address bar, click the 🖥️ or ⬇️ Install icon, and select "Install".'}
              </p>
            </div>
          )}

          {/* Method 2: Instant Desktop Shortcut Download */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-yellow-500/20 text-yellow-300 flex items-center justify-center text-xs font-bold border border-yellow-400/30">2</span>
              <h3 className="text-sm font-bold text-white">
                {lang === 'km' ? 'ទាញយក Shortcut ដាក់លើ Desktop' : 'Create 1-Click Desktop Shortcut'}
              </h3>
            </div>
            <p className="text-xs text-purple-200/80 leading-relaxed">
              {lang === 'km'
                ? 'ទាញយក File Shortcut (.url) រួចអូសទាញដាក់លើផ្ទាំង Desktop របស់កុំព្យូទ័រ ដើម្បីចុចបើកកម្មវិធីបានភ្លាមៗគ្រប់ពេល។'
                : 'Download the shortcut file and place it on your Windows desktop for quick 1-click access.'}
            </p>
            <button
              type="button"
              onClick={downloadDesktopShortcut}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Download className="w-4 h-4 text-yellow-300" />
              <span>{lang === 'km' ? '📥 ទាញយក Desktop Shortcut (.url)' : '📥 Download Desktop Shortcut'}</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-white/10 flex justify-end">
          <button
            type="button"
            onClick={() => { sound.playClick(); onClose(); }}
            className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-all"
          >
            {lang === 'km' ? 'យល់ព្រម (Close)' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
}
