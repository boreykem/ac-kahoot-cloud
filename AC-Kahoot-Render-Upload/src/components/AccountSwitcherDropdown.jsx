import React, { useEffect, useRef } from 'react';
import { Users, UserPlus, CheckCircle2, Trash2, LogOut, ShieldCheck, ArrowRightLeft, X, Sparkles } from 'lucide-react';
import { sound } from '../utils/audioEngine';

export default function AccountSwitcherDropdown({
  isOpen,
  onClose,
  currentUser,
  savedAccounts = [],
  onSwitchAccount,
  onRemoveAccount,
  onOpenLogin,
  onOpenLicense,
  onLogout,
  lang = 'km'
}) {
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      ref={dropdownRef}
      className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl bg-[#190432]/95 backdrop-blur-xl border border-purple-400/40 shadow-2xl shadow-black/80 z-50 overflow-hidden font-khmer animate-scale-in text-white"
    >
      {/* Header */}
      <div className="p-3.5 sm:p-4 bg-gradient-to-r from-purple-900/60 to-indigo-900/60 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-purple-500/30 flex items-center justify-center text-purple-300">
            <ArrowRightLeft className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-white">
              {lang === 'km' ? 'ប្តូរគណនីប្រើប្រាស់' : 'Switch Account'}
            </h3>
            <p className="text-[10px] text-purple-200/70">
              {lang === 'km' ? 'ចុច ១ ឃ្លីកដើម្បីប្តូរគណនីភ្លាមៗ' : '1-Click instant profile switching'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Account List */}
      <div className="p-2 space-y-1.5 max-h-72 overflow-y-auto">
        {savedAccounts.length === 0 && currentUser && (
          <div className="p-3 text-center text-xs text-gray-400">
            {lang === 'km' ? 'មានតែ ១ គណនីបច្ចុប្បន្ន' : 'Only 1 current account'}
          </div>
        )}

        {savedAccounts.map((account) => {
          const isActive = currentUser && currentUser.email?.toLowerCase().trim() === account.email?.toLowerCase().trim();
          
          return (
            <div
              key={account.email}
              onClick={() => {
                if (!isActive) {
                  sound.playCorrect();
                  onSwitchAccount(account);
                  onClose();
                }
              }}
              className={`p-2.5 rounded-xl transition-all flex items-center justify-between gap-2.5 cursor-pointer border ${
                isActive 
                  ? 'bg-purple-600/30 border-purple-400/60 shadow-inner' 
                  : 'bg-white/5 hover:bg-white/10 border-white/10 hover:border-purple-400/30'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 border ${
                  isActive ? 'bg-purple-500/40 border-purple-300/60 ring-2 ring-purple-400/40' : 'bg-black/30 border-white/10'
                }`}>
                  {account.avatar || '👨‍🏫'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-white truncate">
                      {account.name}
                    </p>
                    {isActive && (
                      <span className="text-[9px] bg-emerald-500/30 text-emerald-300 px-1.5 py-0.2 rounded-md font-bold border border-emerald-400/40 shrink-0 flex items-center gap-0.5">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        <span>{lang === 'km' ? 'កំពុងប្រើ' : 'Active'}</span>
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-300 truncate font-mono">
                    {account.email}
                  </p>
                  <p className="text-[9px] text-purple-300/80 truncate">
                    {account.license === 'VIP_SCHOOL' ? '🏫 VIP School Edition' : (account.license && account.license !== 'free' ? '👑 Pro Edition' : '✨ Free Account')}
                    {account.school ? ` • ${account.school}` : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                {!isActive && (
                  <button
                    type="button"
                    onClick={() => {
                      sound.playCorrect();
                      onSwitchAccount(account);
                      onClose();
                    }}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-sm hover:scale-105 active:scale-95 transition-all flex items-center gap-1"
                  >
                    <span>{lang === 'km' ? 'ប្តូរ' : 'Switch'}</span>
                  </button>
                )}
                {savedAccounts.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      onRemoveAccount(account.email);
                    }}
                    title={lang === 'km' ? 'លុបការចងចាំគណនីនេះ' : 'Remove saved account'}
                    className="p-1 rounded-md text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Actions */}
      <div className="p-2.5 bg-black/40 border-t border-white/10 space-y-1.5 text-xs">
        <button
          type="button"
          onClick={() => {
            sound.playClick();
            onOpenLogin();
            onClose();
          }}
          className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-purple-600/80 to-indigo-600/80 hover:from-purple-500 hover:to-indigo-500 text-white font-bold flex items-center justify-center gap-1.5 transition-all shadow-md hover:scale-[1.02] active:scale-[0.98]"
        >
          <UserPlus className="w-4 h-4" />
          <span>{lang === 'km' ? '➕ ចូលគណនីថ្មីមួយទៀត (Add Account)' : '+ Add Another Account'}</span>
        </button>

        <div className="flex items-center gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              onOpenLicense();
              onClose();
            }}
            className="flex-1 py-1.5 px-2 rounded-lg bg-white/5 hover:bg-white/10 text-purple-200 text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-yellow-300" />
            <span>{lang === 'km' ? 'សោរម៉ាស៊ីន (License)' : 'License'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sound.playClick();
              onLogout();
              onClose();
            }}
            className="flex-1 py-1.5 px-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{lang === 'km' ? 'ចាកចេញ (Logout)' : 'Logout'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
