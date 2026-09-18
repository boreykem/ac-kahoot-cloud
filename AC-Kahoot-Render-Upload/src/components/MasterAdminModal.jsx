import React, { useState, useEffect } from 'react';
import { 
  X, ShieldAlert, Users, BookOpen, Award, CheckCircle2, 
  Trash2, Key, RefreshCw, Download, UserPlus, Sparkles,
  School, Mail, ShieldCheck, Zap, Activity, Lock, Save, Megaphone, Eye, EyeOff,
  Copy, Video, FileText, Globe, Share2, ExternalLink, Check,
  Send, DollarSign, Bot, MessageSquare, Phone, QrCode, Upload, Image as ImageIcon, CreditCard
} from 'lucide-react';
import { sound } from '../utils/audioEngine';
import { compressImage } from '../utils/imageCompressor';

export default function MasterAdminModal({ isOpen, onClose, currentUser, lang = 'km' }) {
  const [activeTab, setActiveTab] = useState('teachers'); // 'teachers' | 'announcement' | 'bot_pricing' | 'marketing' | 'security'
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionNotice, setActionNotice] = useState('');

  // Telegram Bot & Pricing State
  const [botPricing, setBotPricing] = useState({
    botToken: "8884699311:AAFusHbd_PRcGrPZWH9Ntc-zFA342IEVDY4",
    botUsername: "ac_mart_programer_developer_bot",
    price1Month: "$0.5",
    price1Year: "$2.5",
    priceLifetime: "$15",
    adminName: "លោកគ្រូ បូរី (Platform Owner)",
    adminTelegram: "@KEMBOREY",
    adminPhone: "0312777761",
    adminChatId: "",
    geminiApiKey: "",
    customNotes: "សូមរង់ចាំបន្តិច លោកគ្រូបូរីនឹងផ្ញើសោរ License Key ជូនលោកគ្រូ/អ្នកគ្រូក្នុងពេលឆាប់ៗនេះ!"
  });
  const [savingBotPricing, setSavingBotPricing] = useState(false);
  const [testingBot, setTestingBot] = useState(false);
  const [testBotResult, setTestBotResult] = useState(null);
  const [sendingTestMsg, setSendingTestMsg] = useState(false);

  // Announcement & Pricing Broadcast State
  const [announcementData, setAnnouncementData] = useState({
    enabled: true,
    showForFreeOnly: true,
    textKm: "⚡ បង្កើនប្រសិទ្ធភាពបង្រៀនពេញមួយឆ្នាំជាមួយ AC-Kahoot! Pro – បង្កើតវិញ្ញាសា & សិស្សចូលលេងមិនកំណត់។ ចុះតម្លៃ ២០% ត្រឹមតែ $3/ខែ (ផុតកំណត់ថ្ងៃ ៣១ សីហា)។",
    textEn: "⚡ Improve student outcomes this school year with AC-Kahoot! Pro. Unlimited quizzes & players. Save 20% from $3/mo. Offer ends August 31.",
    buttonTextKm: "ទិញឥឡូវនេះ (Buy now)",
    buttonTextEn: "Buy now",
    buttonLink: "https://t.me/ac_mart_programer_developer_bot"
  });
  const [savingAnnouncement, setSavingAnnouncement] = useState(false);

  // License Generator State
  const [licenseTypeToGen, setLicenseTypeToGen] = useState('pro_lifetime');
  const [licenseClientNote, setLicenseClientNote] = useState('');
  const [licenseCountToGen, setLicenseCountToGen] = useState(1);
  const [generatingLicense, setGeneratingLicense] = useState(false);
  const [copiedKey, setCopiedKey] = useState('');

  // Password reset for specific teacher
  const [resetTargetUser, setResetTargetUser] = useState(null);
  const [newTargetPassword, setNewTargetPassword] = useState('');

  // Admin changing own password
  const [currentAdminPass, setCurrentAdminPass] = useState('');
  const [newAdminPass, setNewAdminPass] = useState('');
  const [confirmAdminPass, setConfirmAdminPass] = useState('');
  const [showBotGeminiKey, setShowBotGeminiKey] = useState(false);
  const [showCurrentAdminPass, setShowCurrentAdminPass] = useState(false);
  const [showNewAdminPass, setShowNewAdminPass] = useState(false);
  const [showConfirmAdminPass, setShowConfirmAdminPass] = useState(false);

  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    ...(currentUser?.token ? { 'Authorization': `Bearer ${currentUser.token}` } : {})
  });

  useEffect(() => {
    if (isOpen) {
      fetchAdminData();
    }
  }, [isOpen, currentUser]);

  const fetchAdminData = async () => {
    setLoading(true);
    const authHeaders = getAuthHeaders();
    try {
      const [statsRes, usersRes, licRes, annRes, botRes] = await Promise.all([
        fetch('/api/admin/stats', { headers: authHeaders }),
        fetch('/api/admin/users', { headers: authHeaders }),
        fetch('/api/admin/licenses', { headers: authHeaders }),
        fetch('/api/announcement'),
        fetch('/api/admin/bot-pricing', { headers: authHeaders })
      ]);

      if (!statsRes.ok || !usersRes.ok) {
        console.error('Admin API failed. Status:', statsRes.status, usersRes.status);
      }

      const statsData = await statsRes.json();
      const usersData = await usersRes.json();
      const licData = await licRes.json();
      const annData = await annRes.json();
      const botData = await botRes.json().catch(() => null);

      if (statsData.success) setStats(statsData.stats);
      if (usersData.success) setUsers(usersData.users);
      else console.warn('Users fetch failed:', usersData);
      if (Array.isArray(licData)) setLicenses(licData);
      if (annData.success && annData.announcement) setAnnouncementData(annData.announcement);
      if (botData && botData.success && botData.pricing) setBotPricing(botData.pricing);
    } catch (err) {
      console.error('Failed to load admin data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBotPricing = async (e) => {
    e?.preventDefault();
    sound.playClick();
    setSavingBotPricing(true);
    try {
      const res = await fetch('/api/admin/bot-pricing', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(botPricing)
      });
      const data = await res.json();
      if (data.success) {
        setActionNotice(lang === 'km' ? '🎉 បានរក្សាទុកការកំណត់ Telegram Bot និងតម្លៃថ្មីដោយជោគជ័យ!' : 'Bot & Pricing settings updated successfully!');
        if (data.pricing) setBotPricing(data.pricing);
        setTimeout(() => setActionNotice(''), 4000);
      }
    } catch (err) {
      console.error(err);
      alert('Cannot connect to server');
    } finally {
      setSavingBotPricing(false);
    }
  };

  const handleTestBotConnection = async () => {
    sound.playClick();
    setTestingBot(true);
    setTestBotResult(null);
    try {
      const res = await fetch('/api/admin/bot/test-connection', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ botToken: botPricing.botToken })
      });
      const data = await res.json();
      setTestBotResult(data);
      if (data.success) {
        sound.playCorrect();
        if (data.bot?.username) {
          setBotPricing(prev => ({ ...prev, botUsername: data.bot.username }));
        }
      }
    } catch (err) {
      setTestBotResult({ success: false, message: 'មិនអាចតភ្ជាប់ទៅកាន់ Server បានទេ' });
    } finally {
      setTestingBot(false);
    }
  };

  const handleSendTestMsg = async () => {
    if (!botPricing.adminChatId) {
      alert('សូមបញ្ចូល Admin Chat ID ឬផ្ញើពាក្យ /admin ទៅកាន់ Bot របស់អ្នកជាមុនសិន!');
      return;
    }
    sound.playClick();
    setSendingTestMsg(true);
    try {
      const res = await fetch('/api/admin/bot/send-test', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ adminChatId: botPricing.adminChatId })
      });
      const data = await res.json();
      if (data.success) {
        sound.playCorrect();
        alert(data.message);
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert('បរាជ័យក្នុងការផ្ញើសារតេស្ត');
    } finally {
      setSendingTestMsg(false);
    }
  };

  const handleGenerateLicenses = async (e) => {
    e.preventDefault();
    sound.playClick();
    setGeneratingLicense(true);
    try {
      const res = await fetch('/api/admin/licenses/generate', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          type: licenseTypeToGen,
          clientNote: licenseClientNote,
          count: parseInt(licenseCountToGen) || 1
        })
      });
      const data = await res.json();
      if (data.success) {
        setActionNotice(`បានបង្កើត License Key ចំនួន ${data.keys.length} ដោយជោគជ័យ!`);
        setLicenseClientNote('');
        fetchAdminData();
        setTimeout(() => setActionNotice(''), 4000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingLicense(false);
    }
  };

  const handleDeleteLicense = async (licId) => {
    if (!window.confirm('តើអ្នកពិតជាចង់លុប ឬដកហូត License Key នេះមែនទេ?')) return;
    sound.playClick();
    try {
      const res = await fetch(`/api/admin/licenses/${licId}`, { 
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success) {
        setLicenses(licenses.filter(l => l.id !== licId && l.key !== licId));
        setActionNotice('បានលុប License Key ដោយជោគជ័យ!');
        setTimeout(() => setActionNotice(''), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopySalesText = (lic) => {
    sound.playClick();
    const text = `🎉 ជំរាបសួរលោកគ្រូ/អ្នកគ្រូ!\n✨ សូមអរគុណសម្រាប់ការជាវកម្មវិធី AC-Kahoot! វេទិកាសិក្សាអន្តរកម្ម។\n\n🔑 License Activation Key របស់អ្នកគឺ៖\n👉 ${lic.key}\n\n📌 ប្រភេទ៖ ${lic.typeName}\n💡 របៀបប្រើ៖ បើកកម្មវិធី AC-Kahoot! ➡️ ចុចលើរូប Profile ឬប៊ូតុង "បញ្ចូល License Key" ➡️ វាយលេខកូដខាងលើដើម្បីបើកប្រើប្រាស់ Pro បានភ្លាមៗ!`;
    navigator.clipboard.writeText(text);
    setCopiedKey(lic.key);
    setActionNotice(`បានចម្លង Key ${lic.key} ជាមួយសារ Telegram រួចរាល់!`);
    setTimeout(() => {
      setCopiedKey('');
      setActionNotice('');
    }, 4000);
  };

  const handleResetDevice = async (userId, userName) => {
    if (!window.confirm(`តើអ្នកពិតជាចង់ដោះសោ Device ID សម្រាប់ ${userName} ដើម្បីឱ្យគាត់អាចប្តូរទៅប្រើ Laptop ថ្មីមែនទេ?`)) return;
    sound.playClick();
    try {
      const res = await fetch(`/api/admin/users/${userId}/reset-device`, { 
        method: 'POST',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success) {
        setActionNotice(data.message);
        fetchAdminData();
        setTimeout(() => setActionNotice(''), 3500);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateLicense = async (userId, newLicense) => {
    sound.playClick();
    try {
      const res = await fetch(`/api/admin/users/${userId}/license`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ license: newLicense })
      });
      const data = await res.json();
      if (data.success) {
        sound.playCorrect();
        setActionNotice(lang === 'km' ? 'បានផ្លាស់ប្តូរ License ដោយជោគជ័យ!' : 'License updated successfully!');
        setTimeout(() => setActionNotice(''), 3000);
        fetchAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(lang === 'km' ? `តើអ្នកពិតជាចង់លុបគណនីគ្រូ "${userName}" មែនទេ?` : `Are you sure you want to delete teacher "${userName}"?`)) return;
    sound.playClick();
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { 
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success) {
        sound.playCorrect();
        setActionNotice(lang === 'km' ? `បានលុបគណនី ${userName} រួចរាល់` : `Deleted account ${userName}`);
        setTimeout(() => setActionNotice(''), 3000);
        fetchAdminData();
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Master Admin sets own password
  const handleSaveAdminPassword = async (e) => {
    e?.preventDefault();
    if (!newAdminPass) {
      alert(lang === 'km' ? 'សូមបញ្ចូលលេខសម្ងាត់ថ្មី!' : 'Please enter new password!');
      return;
    }
    if (newAdminPass !== confirmAdminPass) {
      alert(lang === 'km' ? 'លេខសម្ងាត់ផ្ទៀងផ្ទាត់មិនត្រូវគ្នាឡើយ!' : 'Passwords do not match!');
      return;
    }

    sound.playClick();
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          userId: currentUser?.id || 'owner_master',
          currentPassword: currentAdminPass,
          newPassword: newAdminPass
        })
      });
      const data = await res.json();
      if (data.success) {
        sound.playCorrect();
        setActionNotice(lang === 'km' ? '🎉 បានប្តូរលេខសម្ងាត់ Master Admin ថ្មីជោគជ័យ!' : 'Admin password changed successfully!');
        setCurrentAdminPass('');
        setNewAdminPass('');
        setConfirmAdminPass('');
        setTimeout(() => setActionNotice(''), 4000);
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
      alert('Cannot connect to server');
    }
  };

  // Master Admin resets specific teacher password
  const handleSaveTeacherResetPassword = async () => {
    if (!newTargetPassword || !resetTargetUser) {
      alert('សូមបញ្ចូលលេខសម្ងាត់ថ្មី!');
      return;
    }

    sound.playClick();
    try {
      const res = await fetch(`/api/admin/users/${resetTargetUser.id}/reset-password`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ newPassword: newTargetPassword })
      });
      const data = await res.json();
      if (data.success) {
        sound.playCorrect();
        setActionNotice(`✨ ${data.message}`);
        setResetTargetUser(null);
        setNewTargetPassword('');
        setTimeout(() => setActionNotice(''), 4000);
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Master Admin saves announcement & pricing broadcast
  const handleSaveAnnouncement = async (e) => {
    e?.preventDefault();
    sound.playClick();
    setSavingAnnouncement(true);
    try {
      const res = await fetch('/api/admin/announcement', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...announcementData,
          adminId: currentUser?.id
        })
      });
      const data = await res.json();
      if (data.success) {
        sound.playCorrect();
        setActionNotice(lang === 'km' ? '🎉 បានរក្សាទុក និងផ្សាយសារជូនដំណឹងថ្មីដោយជោគជ័យ!' : 'Announcement updated & broadcasted successfully!');
        setTimeout(() => setActionNotice(''), 4000);
      } else {
        alert(data.message || 'Error updating announcement');
      }
    } catch (err) {
      console.error(err);
      alert('Cannot connect to server');
    } finally {
      setSavingAnnouncement(false);
    }
  };

  const handleExportBackup = () => {
    sound.playClick();
    const backupData = {
      exportedAt: new Date().toISOString(),
      platform: 'AC-Kahoot! Enterprise',
      stats,
      users
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ac-kahoot-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  const filteredUsers = users.filter(u => 
    (u.name + ' ' + u.email + ' ' + (u.school || ''))
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md font-khmer animate-scale-in">
      <div className="glass-panel border border-yellow-500/40 rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col justify-between overflow-hidden shadow-2xl bg-[#17032d]">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-yellow-950/40 via-purple-950/40 to-black/40">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-yellow-500 to-amber-600 flex items-center justify-center text-2xl shadow-xl shadow-yellow-900/40 text-black font-black">
              👑
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-extrabold text-white">
                  {lang === 'km' ? 'ផ្ទាំងបញ្ជាកំពូល (Master Admin Panel)' : 'Master Admin Panel'}
                </h2>
                <span className="text-[10px] bg-yellow-400/20 text-yellow-300 px-2 py-0.5 rounded-full border border-yellow-400/40 font-bold">
                  FOUNDER & OWNER
                </span>
              </div>
              <p className="text-xs text-yellow-200/70">
                {lang === 'km' ? 'គ្រប់គ្រងគ្រូបង្រៀន License លេខសម្ងាត់ និងស្ថិតិប្រព័ន្ធ' : 'Manage teachers, licenses, passwords & system overview'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportBackup}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-yellow-300 text-xs font-bold flex items-center gap-1.5 border border-yellow-400/30 transition-all hover:scale-105"
              title="ទាញយកទិន្នន័យបម្រុងទុក (Export Backup JSON)"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{lang === 'km' ? 'បម្រុងទុកទិន្នន័យ' : 'Backup Data'}</span>
            </button>

            <button
              onClick={fetchAdminData}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-200 transition-all"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Notice */}
        {actionNotice && (
          <div className="bg-emerald-500/20 border-b border-emerald-400/40 p-2 text-center text-xs font-bold text-emerald-300 animate-bounce-short">
            ✨ {actionNotice}
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-3 px-6 pt-4 border-b border-white/10 text-xs font-bold overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('teachers')}
            className={`pb-3 flex items-center gap-2 border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'teachers'
                ? 'border-yellow-400 text-yellow-300'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{lang === 'km' ? '👥 បញ្ជីគ្រូបង្រៀន & គណនី' : 'Teachers & Accounts'}</span>
          </button>

          <button
            onClick={() => setActiveTab('announcement')}
            className={`pb-3 flex items-center gap-2 border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'announcement'
                ? 'border-yellow-400 text-yellow-300'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Megaphone className="w-4 h-4" />
            <span>{lang === 'km' ? '📢 គ្រប់គ្រងសារ & Promotion (Top Banner)' : 'Broadcast Banner'}</span>
          </button>

          <button
            onClick={() => setActiveTab('bot_pricing')}
            className={`pb-3 flex items-center gap-2 border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'bot_pricing'
                ? 'border-yellow-400 text-yellow-300'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Bot className="w-4 h-4 text-sky-400" />
            <span>{lang === 'km' ? '🤖 Telegram Bot & កំណត់តម្លៃ Pro (Pricing)' : 'Telegram Bot & Pricing'}</span>
          </button>

          <button
            onClick={() => setActiveTab('marketing')}
            className={`pb-3 flex items-center gap-2 border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'marketing'
                ? 'border-yellow-400 text-yellow-300'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Share2 className="w-4 h-4" />
            <span>{lang === 'km' ? '🎯 កញ្ចប់ទីផ្សារ & វីដេអូ (Marketing Kit)' : 'Marketing & Sales Kit'}</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`pb-3 flex items-center gap-2 border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'security'
                ? 'border-yellow-400 text-yellow-300'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>{lang === 'km' ? '🔐 កំណត់លេខសម្ងាត់ Admin' : 'Security & Password'}</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {activeTab === 'teachers' ? (
            <>
              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="p-4 rounded-2xl bg-purple-900/30 border border-purple-400/30 space-y-1">
                  <span className="text-xs text-purple-200 font-semibold flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-cyan-300" />
                    <span>{lang === 'km' ? 'គ្រូទាំងអស់' : 'Total Teachers'}</span>
                  </span>
                  <p className="text-2xl font-black text-white font-['Outfit']">
                    {stats?.totalTeachers ?? 0}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-purple-900/30 border border-purple-400/30 space-y-1">
                  <span className="text-xs text-purple-200 font-semibold flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-yellow-300" />
                    <span>{lang === 'km' ? 'វិញ្ញាសាសរុប' : 'Total Quizzes'}</span>
                  </span>
                  <p className="text-2xl font-black text-white font-['Outfit']">
                    {stats?.totalQuizzes ?? 0}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-purple-900/30 border border-purple-400/30 space-y-1">
                  <span className="text-xs text-purple-200 font-semibold flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>{lang === 'km' ? 'Pro License សកម្ម' : 'Active Pro'}</span>
                  </span>
                  <p className="text-2xl font-black text-yellow-300 font-['Outfit']">
                    {stats?.proLicenses ?? 0}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-purple-900/30 border border-purple-400/30 space-y-1">
                  <span className="text-xs text-purple-200 font-semibold flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    <span>{lang === 'km' ? 'បន្ទប់ Live' : 'Live Rooms'}</span>
                  </span>
                  <p className="text-2xl font-black text-emerald-300 font-['Outfit']">
                    {stats?.activeRooms ?? 0}
                  </p>
                </div>
              </div>

              {/* Teacher Users Management Section */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-yellow-400" />
                      <span>{lang === 'km' ? 'បញ្ជីគណនីគ្រូបង្រៀន (Teachers Directory)' : 'Teachers Directory'}</span>
                    </h3>
                    <p className="text-xs text-purple-200/60">
                      {lang === 'km' ? 'គ្រប់គ្រង License និង Reset លេខសម្ងាត់ជូនគ្រូ' : 'Manage licenses & reset passwords'}
                    </p>
                  </div>

                  {/* Search Teacher */}
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={lang === 'km' ? 'ស្វែងរកឈ្មោះ ឬអ៊ីមែលគ្រូ...' : 'Search teacher...'}
                    className="bg-black/50 border border-white/20 rounded-xl px-3.5 py-1.5 text-xs text-white placeholder-purple-300/40 focus:outline-none focus:border-yellow-400 min-w-[220px]"
                  />
                </div>

                {/* Table */}
                <div className="rounded-2xl border border-white/15 overflow-hidden bg-black/40">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-purple-950/60 text-purple-200 font-bold border-b border-white/10 uppercase text-[11px]">
                        <tr>
                          <th className="p-3.5">គ្រូបង្រៀន (Teacher)</th>
                          <th className="p-3.5">សាលា/ស្ថាប័ន (School)</th>
                          <th className="p-3.5">កម្រិត License</th>
                          <th className="p-3.5 text-center">សកម្មភាព (Actions)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {filteredUsers.map((u) => {
                          const isOwner = u.role === 'superadmin';
                          return (
                            <tr key={u.id} className="hover:bg-white/5 transition-colors">
                              <td className="p-3.5">
                                <div className="flex items-center gap-2.5">
                                  <span className="text-xl w-8 h-8 rounded-xl bg-purple-900/50 flex items-center justify-center border border-white/10">
                                    {u.avatar || '👨‍🏫'}
                                  </span>
                                  <div>
                                    <p className="font-bold text-white flex items-center gap-1.5">
                                      <span>{u.name}</span>
                                      {isOwner && (
                                        <span className="text-[10px] bg-yellow-400 text-black font-black px-1.5 py-0.2 rounded-full">
                                          OWNER
                                        </span>
                                      )}
                                    </p>
                                    <p className="text-[11px] text-purple-300/70 font-mono">{u.email}</p>
                                  </div>
                                </div>
                              </td>

                              <td className="p-3.5 text-purple-200 font-medium">
                                {u.school || 'សាលារៀនកម្ពុជា'}
                              </td>

                              <td className="p-3.5">
                                {isOwner ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-yellow-400/20 text-yellow-300 border border-yellow-400/40 text-[11px] font-bold">
                                    👑 Founder Unlimited
                                  </span>
                                ) : (
                                  <div className="flex flex-col gap-1.5 items-start">
                                    <select
                                      value={u.license || 'free'}
                                      onChange={(e) => handleUpdateLicense(u.id, e.target.value)}
                                      className="bg-black/60 border border-purple-400/40 text-yellow-300 rounded-xl px-2.5 py-1 text-xs font-bold focus:outline-none"
                                    >
                                      <option value="free">⚪ ធម្មតា (Free Tier)</option>
                                      <option value="PRO_LIFETIME">👑 Pro Lifetime (ប្រើមួយជីវិត)</option>
                                      <option value="VIP_SCHOOL">🏫 VIP School Lifetime (សាលារៀន)</option>
                                      <option value="pro_annual">📅 Pro Annual (ប្រចាំឆ្នាំ)</option>
                                      <option value="pro_monthly">⏳ Pro Monthly (ប្រចាំខែ)</option>
                                    </select>
                                    {u.licenseExpiryDate && (
                                      <span className="text-[10px] text-amber-400 font-medium bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-500/20 whitespace-nowrap">
                                        ផុតកំណត់៖ {new Date(u.licenseExpiryDate).toLocaleDateString('en-GB')}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </td>


                              <td className="p-3.5">
                                <div className="flex items-center justify-center gap-2">
                                  {!isOwner && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => { setResetTargetUser(u); setNewTargetPassword(''); }}
                                        title="កំណត់លេខសម្ងាត់ថ្មីឱ្យគ្រូនេះ (Reset Password)"
                                        className="px-2.5 py-1 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/40 text-yellow-300 text-[11px] font-bold border border-yellow-400/30 flex items-center gap-1 transition-all"
                                      >
                                        <Key className="w-3 h-3" />
                                        <span>Reset Pass</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => handleDeleteUser(u.id, u.name)}
                                        title="លុបគណនីគ្រូនេះ"
                                        className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white transition-all"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          ) : activeTab === 'announcement' ? (
            /* Broadcast Announcement & Promotion Banner Management */
            <div className="max-w-3xl mx-auto glass-panel p-6 sm:p-8 rounded-3xl border border-yellow-500/30 space-y-6 bg-black/40">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-600/30 border border-purple-400/40 text-yellow-300 flex items-center justify-center">
                    <Megaphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      {lang === 'km' ? '📢 គ្រប់គ្រងសារជូនដំណឹង & កំណត់តម្លៃ Pro (Super Admin Only)' : 'Broadcast Announcement & Pricing Banner'}
                    </h3>
                    <p className="text-xs text-purple-200/70">
                      {lang === 'km' ? 'កែប្រែសារដែលបង្ហាញលើកំពូលអេក្រង់ (Top Banner) សម្រាប់អតិថិជន និងគ្រូបង្រៀន' : 'Customize top announcement bar displayed to users'}
                    </p>
                  </div>
                </div>

                <span className="px-3 py-1 rounded-full text-xs font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-400/30">
                  👑 Super Admin
                </span>
              </div>

              {/* Live Preview of Banner */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-yellow-300 flex items-center gap-1.5">
                  <Eye className="w-4 h-4" />
                  <span>{lang === 'km' ? 'ទិដ្ឋភាពបង្ហាញជាក់ស្តែង (Live Preview លើអេក្រង់អតិថិជន)៖' : 'Live Preview (How customers see it):'}</span>
                </label>
                <div className="bg-[#46178f] border border-purple-400/40 text-white p-3 rounded-2xl flex items-center justify-between gap-3 text-xs shadow-lg">
                  <span className="p-1 rounded-lg text-purple-300 bg-white/10">✕</span>
                  <span className="flex-1 text-center font-medium">
                    {announcementData.textKm || '⚡ បង្កើនប្រសិទ្ធភាពបង្រៀនពេញមួយឆ្នាំជាមួយ AC-Kahoot! Pro – បង្កើតវិញ្ញាសា & សិស្សចូលលេងមិនកំណត់។ ចុះតម្លៃ ២០% ត្រឹមតែ $3/ខែ (ផុតកំណត់ថ្ងៃ ៣១ សីហា)។'}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-purple-700 text-yellow-300 text-[11px] font-bold">បញ្ចូល Key</span>
                    <span className="px-3 py-1 rounded-lg bg-white text-[#46178f] font-black text-[11px]">{announcementData.buttonTextKm || 'Buy now'}</span>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSaveAnnouncement} className="space-y-5">
                {/* Toggles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={announcementData.enabled}
                      onChange={(e) => setAnnouncementData({ ...announcementData, enabled: e.target.checked })}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-black/50 border-white/20"
                    />
                    <div>
                      <span className="text-xs font-bold text-white block">
                        {lang === 'km' ? 'បើកដំណើរការ Banner (Enable Banner)' : 'Enable Banner'}
                      </span>
                      <span className="text-[10px] text-purple-200/60 block">
                        {announcementData.enabled ? '🟢 កំពុងផ្សាយលើកំពូលអេក្រង់' : '🔴 បានបិទផ្ទាំងជូនដំណឹង'}
                      </span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={announcementData.showForFreeOnly}
                      onChange={(e) => setAnnouncementData({ ...announcementData, showForFreeOnly: e.target.checked })}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-black/50 border-white/20"
                    />
                    <div>
                      <span className="text-xs font-bold text-white block">
                        {lang === 'km' ? 'បង្ហាញតែចំពោះអ្នកមិនទាន់ជាវ (Free only)' : 'Show for Free users only'}
                      </span>
                      <span className="text-[10px] text-purple-200/60 block">
                        {announcementData.showForFreeOnly ? '🔒 មិនរំខានដល់អ្នកជាវ Pro រួចហើយ' : '🌐 បង្ហាញជូនអ្នកប្រើប្រាស់ទាំងអស់'}
                      </span>
                    </div>
                  </label>
                </div>

                {/* Khmer Text */}
                <div>
                  <label className="block text-xs font-bold text-purple-200 mb-1 flex items-center justify-between">
                    <span>{lang === 'km' ? 'ខ្លឹមសារសារជូនដំណឹងជាភាសាខ្មែរ (Khmer Text)' : 'Announcement Text (Khmer)'}</span>
                    <button
                      type="button"
                      onClick={() => setAnnouncementData({
                        ...announcementData,
                        textKm: "⚡ បង្កើនប្រសិទ្ធភាពបង្រៀនពេញមួយឆ្នាំជាមួយ AC-Kahoot! Pro – បង្កើតវិញ្ញាសា & សិស្សចូលលេងមិនកំណត់។ ចុះតម្លៃ ២០% ត្រឹមតែ $3/ខែ (ផុតកំណត់ថ្ងៃ ៣១ សីហា)។"
                      })}
                      className="text-[11px] text-yellow-300 hover:underline"
                    >
                      ប្រើអត្ថបទគំរូដើម
                    </button>
                  </label>
                  <textarea
                    rows={3}
                    value={announcementData.textKm}
                    onChange={(e) => setAnnouncementData({ ...announcementData, textKm: e.target.value })}
                    className="w-full bg-black/50 border border-white/20 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-yellow-400 font-khmer leading-relaxed"
                    placeholder="វាយបញ្ចូលសារជូនដំណឹង ការបញ្ចុះតម្លៃ ឬដំណឹងថ្មីៗ..."
                  />
                </div>

                {/* English Text */}
                <div>
                  <label className="block text-xs font-bold text-purple-200 mb-1">
                    {lang === 'km' ? 'ខ្លឹមសារសារជូនដំណឹងជាភាសាអង់គ្លេស (English Text)' : 'Announcement Text (English)'}
                  </label>
                  <textarea
                    rows={2}
                    value={announcementData.textEn}
                    onChange={(e) => setAnnouncementData({ ...announcementData, textEn: e.target.value })}
                    className="w-full bg-black/50 border border-white/20 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-yellow-400 font-sans"
                    placeholder="Enter English announcement text..."
                  />
                </div>

                {/* Button Texts & Link */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-purple-200 mb-1">
                      {lang === 'km' ? 'អក្សរលើប៊ូតុង (Khmer)' : 'Button Label (Khmer)'}
                    </label>
                    <input
                      type="text"
                      value={announcementData.buttonTextKm}
                      onChange={(e) => setAnnouncementData({ ...announcementData, buttonTextKm: e.target.value })}
                      className="w-full bg-black/50 border border-white/20 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-purple-200 mb-1">
                      {lang === 'km' ? 'អក្សរលើប៊ូតុង (English)' : 'Button Label (English)'}
                    </label>
                    <input
                      type="text"
                      value={announcementData.buttonTextEn}
                      onChange={(e) => setAnnouncementData({ ...announcementData, buttonTextEn: e.target.value })}
                      className="w-full bg-black/50 border border-white/20 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-purple-200 mb-1">
                      {lang === 'km' ? 'តំណភ្ជាប់ទិញ/ទាក់ទង (Contact Link)' : 'Purchase/Telegram Link'}
                    </label>
                    <input
                      type="text"
                      value={announcementData.buttonLink}
                      onChange={(e) => setAnnouncementData({ ...announcementData, buttonLink: e.target.value })}
                      placeholder="https://t.me/ac_mart_programer_developer_bot"
                      className="w-full bg-black/50 border border-white/20 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400 font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={savingAnnouncement}
                  className="w-full py-3.5 rounded-2xl font-bold text-xs sm:text-sm bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-black shadow-xl shadow-yellow-950/60 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingAnnouncement ? (lang === 'km' ? 'កំពុងរក្សាទុក...' : 'Saving...') : (lang === 'km' ? 'ផ្សាយសារជូនដំណឹង & តម្លៃថ្មី (Broadcast Now)' : 'Broadcast Announcement')}</span>
                </button>
              </form>
            </div>
          ) : activeTab === 'bot_pricing' ? (
            /* Telegram Bot & Pricing Settings Tab */
            <div className="space-y-6 max-w-4xl mx-auto animate-scale-in">
              <div className="glass-panel p-5 rounded-3xl border border-sky-500/40 bg-gradient-to-r from-sky-950/60 via-purple-950/60 to-black/60 flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-sky-500/20 text-sky-300 flex items-center justify-center border border-sky-400/40 text-2xl">
                    🤖
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                      <span>{lang === 'km' ? 'កំណត់តម្លៃគម្រោង Pro & Telegram Bot' : 'Pro Pricing & Telegram Bot Setup'}</span>
                      <span className="text-[10px] bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded-full border border-sky-400/40 font-bold">
                        ⚡ LIVE AUTO-RESPONDER
                      </span>
                    </h3>
                    <p className="text-xs text-purple-200/70">
                      {lang === 'km' ? 'កែប្រែតម្លៃគម្រោង និងសារដែល Telegram Bot ឆ្លើយតបទៅកាន់អតិថិជនពេលទិញ License' : 'Customize pricing tiers and automatic Telegram bot replies'}
                    </p>
                  </div>
                </div>
                
                <a
                  href={`https://t.me/${botPricing.botUsername || 'ac_mart_programer_developer_bot'}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/40 border border-sky-400/40 text-sky-200 text-xs font-bold flex items-center gap-1.5 transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>បើកមើល Bot លើ Telegram</span>
                </a>
              </div>

              <form onSubmit={handleSaveBotPricing} className="glass-panel p-6 rounded-3xl border border-white/10 space-y-6 bg-black/40">
                {/* 1. Pricing Tiers Setup */}
                <div>
                  <h4 className="text-sm font-bold text-yellow-300 flex items-center gap-2 mb-3">
                    <DollarSign className="w-4 h-4" />
                    <span>{lang === 'km' ? '១. កំណត់តម្លៃគម្រោងនីមួយៗ (Set Pricing Plans)' : '1. Set Pricing Plans'}</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-slate-900/80 p-4 rounded-2xl border border-white/10 space-y-1.5">
                      <label className="block text-xs font-bold text-purple-200">
                        {lang === 'km' ? '🗓️ Pro ប្រចាំខែ (1 Month)' : 'Monthly Plan'}
                      </label>
                      <input
                        type="text"
                        value={botPricing.price1Month}
                        onChange={(e) => setBotPricing({ ...botPricing, price1Month: e.target.value })}
                        placeholder="$0.5"
                        className="w-full bg-black/60 border border-purple-500/40 rounded-xl px-3.5 py-2 text-sm text-yellow-300 font-bold font-mono focus:outline-none focus:border-yellow-400"
                      />
                      <span className="text-[10px] text-gray-400 block">ឧទាហរណ៍៖ $0.5 ឬ 2,000៛</span>
                    </div>

                    <div className="bg-slate-900/80 p-4 rounded-2xl border border-yellow-500/30 space-y-1.5">
                      <label className="block text-xs font-bold text-yellow-300">
                        {lang === 'km' ? '⭐ Pro ប្រចាំឆ្នាំ (1 Year)' : 'Annual Plan'}
                      </label>
                      <input
                        type="text"
                        value={botPricing.price1Year}
                        onChange={(e) => setBotPricing({ ...botPricing, price1Year: e.target.value })}
                        placeholder="$2.5"
                        className="w-full bg-black/60 border border-yellow-500/40 rounded-xl px-3.5 py-2 text-sm text-yellow-300 font-bold font-mono focus:outline-none focus:border-yellow-400"
                      />
                      <span className="text-[10px] text-gray-400 block">ឧទាហរណ៍៖ $2.5 ឬ 10,000៛</span>
                    </div>

                    <div className="bg-slate-900/80 p-4 rounded-2xl border border-emerald-500/30 space-y-1.5">
                      <label className="block text-xs font-bold text-emerald-300">
                        {lang === 'km' ? '👑 Pro ពេញមួយជីវិត (Lifetime)' : 'Lifetime Plan'}
                      </label>
                      <input
                        type="text"
                        value={botPricing.priceLifetime}
                        onChange={(e) => setBotPricing({ ...botPricing, priceLifetime: e.target.value })}
                        placeholder="$15"
                        className="w-full bg-black/60 border border-emerald-500/40 rounded-xl px-3.5 py-2 text-sm text-emerald-300 font-bold font-mono focus:outline-none focus:border-emerald-400"
                      />
                      <span className="text-[10px] text-gray-400 block">ឧទាហរណ៍៖ $15 ឬ 60,000៛</span>
                    </div>
                  </div>
                </div>

                {/* 2. Telegram Bot Configuration & Admin Connection */}
                <div className="pt-4 border-t border-white/10 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h4 className="text-sm font-bold text-sky-300 flex items-center gap-2">
                      <Bot className="w-4 h-4" />
                      <span>{lang === 'km' ? '២. ព័ត៌មាន Telegram Bot & ទំនាក់ទំនង Admin' : '2. Telegram Bot Credentials & Admin Chat'}</span>
                    </h4>

                    <button
                      type="button"
                      onClick={handleTestBotConnection}
                      disabled={testingBot}
                      className="px-3 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-400/40 text-xs font-bold flex items-center gap-1.5 transition-all hover:scale-105 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${testingBot ? 'animate-spin' : ''}`} />
                      <span>{testingBot ? 'កំពុងពិនិត្យ...' : '⚡ ពិនិត្យការតភ្ជាប់ Bot (Test Connection)'}</span>
                    </button>
                  </div>

                  {/* Test Bot Result Banner */}
                  {testBotResult && (
                    <div className={`p-3 rounded-2xl text-xs font-bold flex items-center justify-between gap-2 ${
                      testBotResult.success 
                        ? 'bg-emerald-950/60 border border-emerald-400/40 text-emerald-200' 
                        : 'bg-red-950/60 border border-red-400/40 text-red-200'
                    }`}>
                      <span>{testBotResult.message}</span>
                      {testBotResult.bot && (
                        <span className="text-[11px] bg-white/10 px-2 py-0.5 rounded font-mono">
                          ID: {testBotResult.bot.id}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-purple-200 mb-1">
                        Telegram Bot Username
                      </label>
                      <input
                        type="text"
                        value={botPricing.botUsername}
                        onChange={(e) => setBotPricing({ ...botPricing, botUsername: e.target.value })}
                        placeholder="ac_mart_programer_developer_bot"
                        className="w-full bg-black/50 border border-white/20 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-400 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-purple-200 mb-1">
                        Telegram Contact ផ្ទាល់ខ្លួនរបស់ Admin (@Username)
                      </label>
                      <input
                        type="text"
                        value={botPricing.adminTelegram}
                        onChange={(e) => setBotPricing({ ...botPricing, adminTelegram: e.target.value })}
                        placeholder="@KEMBOREY"
                        className="w-full bg-black/50 border border-white/20 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-400 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-purple-200 mb-1">
                        ឈ្មោះម្ចាស់កម្មវិធី (Owner / Display Name)
                      </label>
                      <input
                        type="text"
                        value={botPricing.adminName}
                        onChange={(e) => setBotPricing({ ...botPricing, adminName: e.target.value })}
                        placeholder="លោកគ្រូ បូរី (Platform Owner)"
                        className="w-full bg-black/50 border border-white/20 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-purple-200 mb-1">
                        លេខទូរស័ព្ទទំនាក់ទំនង (Phone Number - Optional)
                      </label>
                      <input
                        type="text"
                        value={botPricing.adminPhone}
                        onChange={(e) => setBotPricing({ ...botPricing, adminPhone: e.target.value })}
                        placeholder="012 345 678"
                        className="w-full bg-black/50 border border-white/20 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-400"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-purple-200 mb-1 flex items-center justify-between">
                        <span>Telegram Bot Token (សម្ងាត់ - ពី @BotFather)</span>
                        <span className="text-[10px] text-gray-400">ប្រើសម្រាប់ឆ្លើយតប និងបញ្ជូនវិក្កយបត្រ</span>
                      </label>
                      <input
                        type="text"
                        value={botPricing.botToken}
                        onChange={(e) => setBotPricing({ ...botPricing, botToken: e.target.value })}
                        placeholder="8884699311:AAFusHbd_PRcGrPZWH9Ntc-zFA342IEVDY4"
                        className="w-full bg-black/50 border border-white/20 rounded-xl px-3 py-2 text-xs text-yellow-300 focus:outline-none focus:border-sky-400 font-mono"
                      />
                    </div>

                    {/* Admin Chat ID Box */}
                    <div className="sm:col-span-2 p-3.5 rounded-2xl bg-sky-950/30 border border-sky-500/30 space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <label className="text-xs font-bold text-sky-200 flex items-center gap-1.5">
                          <span>🔔 Admin Chat ID (ទទួលវិក្កយបត្របង់ប្រាក់ផ្ទាល់)៖</span>
                          {botPricing.adminChatId ? (
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-400/30 font-bold font-mono">
                              ✓ ភ្ជាប់រួចរាល់ ({botPricing.adminChatId})
                            </span>
                          ) : (
                            <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-400/30 font-bold">
                              ⚠️ មិនទាន់ភ្ជាប់
                            </span>
                          )}
                        </label>

                        {botPricing.adminChatId && (
                          <button
                            type="button"
                            onClick={handleSendTestMsg}
                            disabled={sendingTestMsg}
                            className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-bold transition-all disabled:opacity-50"
                          >
                            {sendingTestMsg ? 'កំពុងផ្ញើ...' : '🔔 ផ្ញើសារសាកល្បងទៅ Admin'}
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={botPricing.adminChatId || ''}
                          onChange={(e) => setBotPricing({ ...botPricing, adminChatId: e.target.value })}
                          placeholder="ឧទាហរណ៍៖ 123456789 ឬផ្ញើពាក្យ /admin ទៅកាន់ Bot របស់អ្នក"
                          className="flex-1 bg-black/60 border border-white/20 rounded-xl px-3 py-2 text-xs text-sky-200 focus:outline-none focus:border-sky-400 font-mono"
                        />
                        <a
                          href={`https://t.me/${botPricing.botUsername || 'ac_mart_programer_developer_bot'}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold whitespace-nowrap transition-all"
                          title="បើក Bot ដើម្បីផ្ញើ /admin"
                        >
                          👉 ផ្ញើ /admin
                        </a>
                      </div>
                      <p className="text-[10px] text-sky-300/70">
                        💡 <b>វិធីភ្ជាប់ Admin Chat ID៖</b> បើកមើល Bot របស់អ្នកលើ Telegram រួចវាយពាក្យ <code>/admin</code> ផ្ញើទៅកាន់ Bot នោះប្រព័ន្ធនឹងកត់ត្រា Chat ID របស់អ្នកដោយស្វ័យប្រវត្តិ។
                      </p>
                    </div>

                    {/* System Gemini API Key Setting */}
                    <div className="sm:col-span-2 p-3.5 rounded-2xl bg-amber-950/30 border border-amber-500/30 space-y-1.5">
                      <label className="text-xs font-bold text-amber-200 flex items-center justify-between">
                        <span>🤖 System Gemini API Key (សម្រាប់បង្កើតកម្រងសំណួរ AI ជូនគ្រូទាំងអស់)</span>
                        <a 
                          href="https://aistudio.google.com/app/apikey" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-[10px] text-amber-300 hover:underline"
                        >
                          យក Key ឥតគិតថ្លៃពី Google AI Studio ↗
                        </a>
                      </label>
                      <div className="relative">
                        <input
                          type={showBotGeminiKey ? "text" : "password"}
                          value={botPricing.geminiApiKey || ''}
                          onChange={(e) => setBotPricing({ ...botPricing, geminiApiKey: e.target.value })}
                          placeholder="AIzaSy... (ទុកទទេដើម្បីប្រើ Default Key របស់ប្រព័ន្ធ)"
                          className="w-full bg-black/60 border border-white/20 rounded-xl pl-3 pr-10 py-2 text-xs text-amber-200 focus:outline-none focus:border-amber-400 font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowBotGeminiKey(!showBotGeminiKey)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-amber-300 transition-colors"
                          tabIndex={-1}
                        >
                          {showBotGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <span className="text-[10px] text-gray-400 block">
                        គាំទ្រម៉ូឌែលល្បឿនលឿន៖ <code>gemini-flash-lite-latest</code>, <code>gemini-3.5-flash-lite</code> (ឆ្លើយតបក្នុង ~1 វិនាទី)
                      </span>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-purple-200 mb-1">
                        សារចំណាំនៅខាងក្រោម (Footer Note in Bot Reply)
                      </label>
                      <textarea
                        rows={2}
                        value={botPricing.customNotes}
                        onChange={(e) => setBotPricing({ ...botPricing, customNotes: e.target.value })}
                        placeholder="សូមរង់ចាំបន្តិច លោកគ្រូបូរីនឹងផ្ញើសោរ License Key ជូនលោកគ្រូ/អ្នកគ្រូក្នុងពេលឆាប់ៗនេះ!"
                        className="w-full bg-black/50 border border-white/20 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-sky-400"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. KHQR Code & Banking Details Configuration */}
                <div className="pt-4 border-t border-white/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-emerald-300 flex items-center gap-2">
                      <QrCode className="w-4 h-4" />
                      <span>{lang === 'km' ? '៣. ព័ត៌មានបង់ប្រាក់ KHQR Code & ធនាគារ (Bakong / ABA)' : '3. KHQR Code & Banking Details'}</span>
                    </h4>
                    <span className="text-[11px] text-emerald-400/80 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                      🇰🇭 ស្កេនបង់ប្រាក់ផ្ទាល់
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* KHQR Image Uploader */}
                    <div className="sm:col-span-2 p-4 rounded-2xl bg-black/40 border border-emerald-500/30 flex flex-col sm:flex-row items-center gap-4">
                      {botPricing.khqrImage ? (
                        <div className="relative group shrink-0">
                          <img 
                            src={botPricing.khqrImage} 
                            alt="KHQR Code" 
                            className="w-28 h-28 object-contain rounded-xl bg-white p-1.5 border border-emerald-400/50 shadow-md shadow-emerald-950/50"
                          />
                          <button
                            type="button"
                            onClick={() => setBotPricing({ ...botPricing, khqrImage: '' })}
                            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-md text-xs font-bold"
                            title="លុបរូប KHQR"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="w-28 h-28 rounded-xl border-2 border-dashed border-emerald-500/40 bg-emerald-950/20 flex flex-col items-center justify-center text-emerald-300 shrink-0 text-center p-2">
                          <QrCode className="w-8 h-8 mb-1 text-emerald-400 opacity-80" />
                          <span className="text-[10px] font-bold">មិនទាន់មាន KHQR</span>
                        </div>
                      )}

                      <div className="flex-1 space-y-2 text-left">
                        <label className="block text-xs font-bold text-white">
                          📸 ជ្រើសរើសរូបភាព Bakong / ABA KHQR (PNG, JPG)
                        </label>
                        <p className="text-[11px] text-purple-200/70">
                          Bot នឹងផ្ញើរូបភាព KHQR នេះទៅកាន់អតិថិជនលើ Telegram ដោយស្វ័យប្រវត្តិ ដើម្បីឱ្យគាត់ស្កេនបង់ប្រាក់បានភ្លាមៗ!
                        </p>
                        <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer transition-all shadow-md">
                          <Upload className="w-3.5 h-3.5" />
                          <span>{botPricing.khqrImage ? 'ប្តូររូប KHQR ថ្មី' : 'Upload រូប KHQR'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              if (file.size > 8 * 1024 * 1024) {
                                alert('ទំហំរូបភាពធំពេក (សូមជ្រើសរូបក្រោម 8MB)');
                                return;
                              }
                              try {
                                const compressedDataUrl = await compressImage(file, 800, 800, 0.7);
                                setBotPricing(prev => ({ ...prev, khqrImage: compressedDataUrl }));
                              } catch (err) {
                                console.error('Image compression failed', err);
                                alert('ការបង្ហោះរូបភាពមានបញ្ហា។ សូមសាកល្បងម្ដងទៀត!');
                              }
                              e.target.value = '';
                            }}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    {/* Bank Name */}
                    <div>
                      <label className="block text-xs font-bold text-purple-200 mb-1">
                        ឈ្មោះធនាគារ (Bank / Wallet Name)
                      </label>
                      <input
                        type="text"
                        value={botPricing.bankName || ''}
                        onChange={(e) => setBotPricing({ ...botPricing, bankName: e.target.value })}
                        placeholder="ABA Bank / Bakong KHQR"
                        className="w-full bg-black/50 border border-white/20 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
                      />
                    </div>

                    {/* Account Name */}
                    <div>
                      <label className="block text-xs font-bold text-purple-200 mb-1">
                        ឈ្មោះម្ចាស់គណនី (Account Name)
                      </label>
                      <input
                        type="text"
                        value={botPricing.bankAccountName || ''}
                        onChange={(e) => setBotPricing({ ...botPricing, bankAccountName: e.target.value })}
                        placeholder="KEM BOREY"
                        className="w-full bg-black/50 border border-white/20 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400 uppercase font-mono"
                      />
                    </div>

                    {/* Account Number */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-purple-200 mb-1">
                        លេខគណនីធនាគារ (Account Number - សម្រាប់ Copy វាយផ្ទេរផ្ទាល់)
                      </label>
                      <input
                        type="text"
                        value={botPricing.bankAccountNumber || ''}
                        onChange={(e) => setBotPricing({ ...botPricing, bankAccountNumber: e.target.value })}
                        placeholder="001 234 567 (ABA) ឬ 0312777761"
                        className="w-full bg-black/50 border border-white/20 rounded-xl px-3 py-2 text-xs text-emerald-300 focus:outline-none focus:border-emerald-400 font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Live Bot Reply Preview Box */}
                <div className="pt-4 border-t border-white/10 space-y-2">
                  <label className="block text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>{lang === 'km' ? 'គំរូសារដែល Bot នឹងឆ្លើយតបលើ Telegram (Live Bot Preview):' : 'Telegram Live Preview:'}</span>
                  </label>
                  
                  <div className="p-4 rounded-2xl bg-[#1c242d] border border-sky-500/30 text-white font-sans text-xs sm:text-sm space-y-3 shadow-inner">
                    {/* KHQR Card in Preview if exists */}
                    {botPricing.khqrImage && (
                      <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-gradient-to-b from-emerald-950/60 to-black/60 border border-emerald-400/40 text-center space-y-2">
                        <img 
                          src={botPricing.khqrImage} 
                          alt="KHQR Preview" 
                          className="w-36 h-36 object-contain rounded-lg bg-white p-1.5 shadow-lg border border-emerald-300"
                        />
                        <div className="text-[11px] font-bold text-emerald-300">
                          🇰🇭 Bakong KHQR - ស្កេនបង់ប្រាក់បានគ្រប់ធនាគារ
                        </div>
                      </div>
                    )}

                    <div className="text-yellow-300 font-bold flex items-center gap-1">
                      <span>🎯</span>
                      <span>សូមស្វាគមន៍មកកាន់ AC-Kahoot! Official Bot</span>
                    </div>
                    <div className="text-slate-200">
                      សួស្តី <strong>Kem!</strong> 🙏
                    </div>
                    <div className="text-slate-300 text-xs">
                      ដើម្បីទទួលបាន License Key សូមផ្ញើលេខ <strong>Hardware Machine ID</strong> របស់អ្នកមកកាន់ទីនេះ។
                    </div>
                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 space-y-1">
                      <div className="font-bold text-amber-300">🌟 គម្រោងតម្លៃ AC-Kahoot Pro៖</div>
                      {botPricing.price1Month && <div>• <strong>Pro ប្រចាំខែ (1 Month)៖</strong> <span className="text-yellow-400 font-bold">{botPricing.price1Month}</span></div>}
                      {botPricing.price1Year && <div>• <strong>Pro ប្រចាំឆ្នាំ (1 Year)៖</strong> <span className="text-yellow-400 font-bold">{botPricing.price1Year}</span></div>}
                      {botPricing.priceLifetime && <div>• <strong>Pro ពេញមួយជីវិត (Lifetime)៖</strong> <span className="text-emerald-400 font-bold">{botPricing.priceLifetime}</span></div>}
                    </div>

                    {/* Bank Info in Preview */}
                    {(botPricing.bankName || botPricing.bankAccountNumber || botPricing.bankAccountName) && (
                      <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs space-y-1">
                        <div className="font-bold text-emerald-300 flex items-center gap-1">
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>ព័ត៌មានបង់ប្រាក់តាម KHQR / ធនាគារ៖</span>
                        </div>
                        {botPricing.bankName && <div className="text-slate-300">• ធនាគារ៖ <strong className="text-white">{botPricing.bankName}</strong></div>}
                        {botPricing.bankAccountName && <div className="text-slate-300">• ឈ្មោះគណនី៖ <strong className="text-white font-mono">{botPricing.bankAccountName}</strong></div>}
                        {botPricing.bankAccountNumber && <div className="text-slate-300">• លេខកុង៖ <strong className="text-emerald-300 font-mono">{botPricing.bankAccountNumber}</strong></div>}
                      </div>
                    )}

                    <div className="text-xs text-sky-300 pt-1">
                      👉 <strong>ទំនាក់ទំនងម្ចាស់កម្មវិធីផ្ទាល់៖</strong><br />
                      👤 {botPricing.adminName || 'លោកគ្រូ បូរី'}<br />
                      📞 Telegram: {botPricing.adminTelegram || '@KEMBOREY'}
                      {botPricing.adminPhone ? ` | Phone: ${botPricing.adminPhone}` : ''}
                    </div>
                    <div className="text-[11px] text-slate-400 italic pt-1 border-t border-white/10">
                      {botPricing.customNotes || 'សូមរង់ចាំបន្តិច លោកគ្រូបូរីនឹងផ្ញើសោរ License Key ជូនលោកគ្រូ/អ្នកគ្រូក្នុងពេលឆាប់ៗនេះ!'}
                    </div>

                    {/* 2-Step Flow Preview */}
                    <div className="pt-2 space-y-3 border-t border-white/10">
                      {/* Step 1 Preview */}
                      <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-400/30 space-y-2">
                        <div className="text-[11px] text-yellow-300 font-bold flex items-center justify-between">
                          <span>📌 ជំហានទី ១៖ អតិថិជនចុចជ្រើសរើសគម្រោង</span>
                          <span className="text-[9px] bg-yellow-400/20 text-yellow-200 px-1.5 py-0.5 rounded">Step 1</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 font-bold text-[11px]">
                          {botPricing.price1Month && (
                            <div className="py-1.5 px-2 rounded-lg bg-sky-600/30 border border-sky-400/40 text-sky-200 text-center">
                              🗓️ Pro ១ ខែ ({botPricing.price1Month})
                            </div>
                          )}
                          {botPricing.price1Year && (
                            <div className="py-1.5 px-2 rounded-lg bg-yellow-600/30 border border-yellow-400/40 text-yellow-200 text-center">
                              ⭐ Pro ១ ឆ្នាំ ({botPricing.price1Year})
                            </div>
                          )}
                          {botPricing.priceLifetime && (
                            <div className="py-1.5 px-2 rounded-lg bg-emerald-600/30 border border-emerald-400/40 text-emerald-200 text-center">
                              👑 Pro មួយជីវិត ({botPricing.priceLifetime})
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Step 2 Preview */}
                      <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 space-y-2">
                        <div className="text-[11px] text-emerald-300 font-bold flex items-center justify-between">
                          <span>📸 ជំហានទី ២៖ Bot បង្ហាញ KHQR + ប៊ូតុងផ្ញើវិក្កយបត្រ</span>
                          <span className="text-[9px] bg-emerald-400/20 text-emerald-200 px-1.5 py-0.5 rounded">Step 2</span>
                        </div>
                        <div className="space-y-1 font-bold text-xs">
                          <div className="py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-center shadow-md flex items-center justify-center gap-1.5">
                            <span>✅ ខ្ញុំបានបង់ប្រាក់រួចរាល់ ➜ ផ្ញើវិក្កយបត្រ & HWID ទៅ @{(botPricing.adminTelegram || 'KEMBOREY').replace(/^@/, '')}</span>
                          </div>
                          <div className="py-1.5 px-3 rounded-xl bg-purple-600/30 border border-purple-400/40 text-purple-200 text-center text-[11px]">
                            <span>🔄 ជ្រើសរើសគម្រោងផ្សេងទៀត (Choose Another Plan)</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <button
                  type="submit"
                  disabled={savingBotPricing}
                  className="w-full py-3.5 rounded-2xl font-bold text-xs sm:text-sm bg-gradient-to-r from-emerald-500 via-sky-500 to-purple-600 hover:from-emerald-400 hover:to-purple-500 text-white shadow-xl shadow-emerald-950/60 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingBotPricing ? (lang === 'km' ? 'កំពុងរក្សាទុក...' : 'Saving...') : (lang === 'km' ? '💾 រក្សាទុកតម្លៃ, Bot & KHQR (Save & Apply Live)' : 'Save Bot & KHQR Settings')}</span>
                </button>
              </form>
            </div>
          ) : activeTab === 'marketing' ? (
            /* Super Admin Exclusive Marketing & Sales Kit Tab */
            <div className="space-y-6 max-w-4xl mx-auto animate-scale-in">
              <div className="glass-panel p-5 rounded-3xl border border-yellow-500/40 bg-gradient-to-r from-purple-950/60 via-indigo-950/60 to-black/60 flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-yellow-500/20 text-yellow-300 flex items-center justify-center border border-yellow-400/40 text-2xl">
                    🎯
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                      <span>{lang === 'km' ? 'កញ្ចប់ទីផ្សារសម្ងាត់សម្រាប់ Super Admin' : 'Super Admin Marketing & Sales Kit'}</span>
                      <span className="text-[10px] bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full border border-red-400/40 font-bold">
                        🔒 ADMIN ONLY
                      </span>
                    </h3>
                    <p className="text-xs text-purple-200/70">
                      {lang === 'km' ? 'Script វីដេអូ, Content សម្រាប់ Facebook, និង Landing Page ត្រៀមជាស្រេចសម្រាប់យកទៅផ្សព្វផ្សាយ' : 'Pre-built video scripts, Facebook posts & sales materials'}
                    </p>
                  </div>
                </div>
              </div>

              {/* SECTION 1: Video Scripts */}
              <div className="glass-panel p-5 rounded-3xl border border-white/10 bg-black/40 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <Video className="w-5 h-5 text-yellow-400" />
                    <h4 className="text-sm font-bold text-white">
                      {lang === 'km' ? '🎬 សេណារីយ៉ូវីដេអូផ្សព្វផ្សាយ (Video Scripts)' : 'Promotional Video Scripts'}
                    </h4>
                  </div>
                  <span className="text-[11px] text-purple-300">CapCut / Clipchamp / TikTok / Reels</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Short Script */}
                  <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-400/30 space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-yellow-300">⚡ TikTok / Reels (៤៥-៦០ វិនាទី)</span>
                        <span className="text-[10px] bg-yellow-400/20 text-yellow-200 px-2 py-0.5 rounded-md">Hook + AI + Offline</span>
                      </div>
                      <p className="text-xs text-purple-200/80 leading-relaxed">
                        • <strong>0:00-0:05:</strong> «តើលោកគ្រូអ្នកគ្រូធុញនឹងការអង្គុយវាយសំណួរ Kahoot រាប់ម៉ោងមែនទេ?»<br/>
                        • <strong>0:06-0:15:</strong> Copy មេរៀនខ្មែរដាក់ចូល Gemini AI ចេញសំណួរក្នុង ៥ វិនាទី!<br/>
                        • <strong>0:16-0:25:</strong> គាំទ្រ ៤ កម្រិតសិក្សា (បឋម, មធ្យម, វិទ្យាល័យ, សាកលវិទ្យាល័យ)<br/>
                        • <strong>0:26-0:38:</strong> លេងបានទោះគ្មាន Internet (Offline LAN Hotspot)<br/>
                        • <strong>0:39-0:50:</strong> Podium 3D + Call to Action (Comment "សាកល្បង")
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        sound.playClick();
                        const scriptText = `🎬 SCRIPT ខ្លី TIKTOK & REELS (៤៥-៦០ វិនាទី) - AC-KAHOOT!\n\n[0:00 - 0:05] Hook:\n«តើលោកគ្រូអ្នកគ្រូធុញនឹងការអង្គុយវាយសំណួរ Kahoot ម្តងមួយៗរាប់ម៉ោងមែនទេ?»\n\n[0:06 - 0:15] បង្ហាញ AI:\n«ឈប់បារម្ភ! ជាមួយ AC-Kahoot គ្រាន់តែ Paste មេរៀនចូល Gemini AI នឹងបង្កើតសំណួរ ៤ ជម្រើស និងការពន្យល់ជាភាសាខ្មែរស្វ័យប្រវត្ត ក្នុង ៥ វិនាទី!»\n\n[0:16 - 0:25] កម្រិតសិក្សា:\n«មិនត្រឹមតែប៉ុណ្ណោះ អាចជ្រើសរើសបាន ៤ កម្រិត៖ បឋម, មធ្យម, វិទ្យាល័យបាក់ឌុប និងសាកលវិទ្យាល័យ!»\n\n[0:26 - 0:38] Offline LAN:\n«ពិសេសបំផុត! សាលាគ្មាន WiFi ឬ Internet ខ្សោយ ក៏សិស្សអាចលេងបានរលូនគ្មាន Lag តាម Hotspot ផ្ទាល់ខ្លួន!»\n\n[0:39 - 0:50] Call to Action:\n«ប្ដូរថ្នាក់រៀនឱ្យក្លាយជាវេទិកាប្រកួតប្រជែងដ៏ជក់ចិត្ត! សាកល្បងឥឡូវនេះ Comment "សាកល្បង" ឬ Inbox មកកាន់ផេកដើម្បីទទួល License ឥតគិតថ្លៃ!»`;
                        navigator.clipboard.writeText(scriptText);
                        setActionNotice('បានចម្លង Script TikTok ខ្លីរួចរាល់!');
                        setTimeout(() => setActionNotice(''), 3000);
                      }}
                      className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>ចម្លង Script TikTok ខ្លី</span>
                    </button>
                  </div>

                  {/* Full Tutorial Script */}
                  <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-400/30 space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-yellow-300">📖 Video Demo ពេញ (៣-៤ នាទី)</span>
                        <span className="text-[10px] bg-indigo-400/20 text-indigo-200 px-2 py-0.5 rounded-md">YouTube / Facebook Page</span>
                      </div>
                      <p className="text-xs text-purple-200/80 leading-relaxed">
                        • <strong>ផ្នែកទី ១:</strong> សេចក្ដីផ្ដើម & ណែនាំ AC-Kahoot!<br/>
                        • <strong>ផ្នែកទី ២:</strong> ការបង្កើតសំណួរដោយ Gemini AI ពីមេរៀនខ្មែរ<br/>
                        • <strong>ផ្នែកទី ៣:</strong> របៀបលេងលើ Local Hotspot គ្មាន Internet<br/>
                        • <strong>ផ្នែកទី ៤:</strong> មុខងារ ៤ កម្រិតសិក្សា & Peer Instruction<br/>
                        • <strong>ផ្នែកទី ៥:</strong> ការផ្ដល់ពានរង្វាន់ Podium 3D & របៀបទិញ License
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        sound.playClick();
                        const fullScript = `💻 SCRIPT វីដេអូពេញបង្រៀនប្រើប្រាស់ (FULL TUTORIAL ៣-៤ នាទី) - AC-KAHOOT!\n\nផ្នែកទី ១៖ សេចក្ដីផ្ដើម\n«ជម្រាបសួរលោកគ្រូអ្នកគ្រូ និងសាស្ត្រាចារ្យទាំងអស់គ្នា! ថ្ងៃនេះខ្ញុំសូមណែនាំ AC-Kahoot ដែលជាប្រព័ន្ធសំណួរ-ចម្លើយអន្តរកម្មស្ទីល Kahoot ជំនាន់ថ្មី បង្កើតឡើងយ៉ាងពិសេសសម្រាប់វិស័យអប់រំនៅកម្ពុជា...»\n\nផ្នែកទី ២៖ ការបង្កើតសំណួរដោយ Gemini AI\n«ចំណុចលេចធ្លោទី ១ គឺ Gemini AI Generator។ លោកគ្រូអ្នកគ្រូមិនបាច់ចំណាយពេលច្រើនម៉ោងក្នុងការគិត ឬវាយសំណួរនោះទេ។ គ្រាន់តែ Copy អត្ថបទមេរៀនពីសៀវភៅ ឬឯកសារ PDF ដាក់ចូល AI នឹងបង្កើតសំណួរ ៤ ជម្រើសជាភាសាខ្មែរយ៉ាងត្រឹមត្រូវ...»\n\nផ្នែកទី ៣៖ ការដំណើរការលើ Local Network ដោយមិនបាច់ប្រើ Internet\n«ចំណុចទី ២៖ ដំណើរការលើ Local Network (Offline Mode)។ សាលាគ្មាន WiFi ក៏សិស្ស ៥០ ទៅ ១០០ នាក់អាច Scan QR Code ចូលលេងភ្លាមៗ គ្មាន Lag...»\n\nផ្នែកទី ៤៖ មុខងារតាមកម្រិតសិក្សា និង Peer Instruction\n«គាំទ្រ ៤ កម្រិតសិក្សា៖ បឋម, មធ្យម, វិទ្យាល័យបាក់ឌុប, និង Mazur's Peer Instruction សម្រាប់សាកលវិទ្យាល័យ...»\n\nផ្នែកទី ៥៖ សេចក្ដីសន្និដ្ឋាន & ការបញ្ជាទិញ\n«តម្លៃសមរម្យបំផុតសម្រាប់គ្រូខ្មែរ មិនបាច់បង់ប្រចាំខែថ្លៃៗ... សូមទាក់ទងមកកាន់ Telegram ខាងក្រោម!»`;
                        navigator.clipboard.writeText(fullScript);
                        setActionNotice('បានចម្លង Full Tutorial Script រួចរាល់!');
                        setTimeout(() => setActionNotice(''), 3000);
                      }}
                      className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>ចម្លង Script វីដេអូពេញ</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* SECTION 2: Facebook Post Content */}
              <div className="glass-panel p-5 rounded-3xl border border-white/10 bg-black/40 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-yellow-400" />
                    <h4 className="text-sm font-bold text-white">
                      {lang === 'km' ? '📢 កញ្ចប់សំណេរផុស Facebook (Facebook Posts)' : 'Ready Facebook Posts'}
                    </h4>
                  </div>
                  <span className="text-[11px] text-purple-300">Copy $\rightarrow$ Paste ផុសភ្លាមៗ</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Post 1 */}
                  <div className="p-3.5 rounded-2xl bg-purple-950/40 border border-purple-400/30 space-y-2 flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-bold text-yellow-300 block">📌 POST 1: ដោះស្រាយបញ្ហាគ្រូ</span>
                      <p className="text-[11px] text-purple-200/70 line-clamp-3">
                        «ធុញនឹងការអង្គុយវាយសំណួរ Kahoot រាប់ម៉ោងមែនទេ? Gemini AI បង្កើតសំណួរ ៥ វិនាទី + លេងគ្មាន Internet...»
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        sound.playClick();
                        const p1 = `🤯 ធុញនឹងការអង្គុយវាយសំណួរ Kahoot រាប់ម៉ោងមែនទេ?\nតើលោកគ្រូអ្នកគ្រូចង់បង្កើត Game សំណួរ-ចម្លើយ ១០ សំណួរក្នុងពេលត្រឹមតែ ៥ វិនាទីដែរឬទេ? ⏱️⚡\n\nសូមណែនាំ 🎯 AC-Kahoot! — កម្មវិធីសំណួរ-ចម្លើយអន្តរកម្មស្ទីល Kahoot បង្កើតឡើងយ៉ាងពិសេសសម្រាប់វិស័យអប់រំនៅកម្ពុជា 🇰🇭\n\n🌟 មុខងារពិសេសៗដែល Kahoot ធម្មតាមិនអាចធ្វើបាន៖\n✅ 🤖 Gemini AI Generator៖ គ្រាន់តែ Paste មេរៀន ឬសៀវភៅពុម្ពខ្មែរ ➡️ AI ចេញសំណួរ ៤ ជម្រើស និងការពន្យល់ភ្លាមៗ!\n✅ 📶 លេងបានទោះគ្មាន Internet (Offline Mode)៖ សាលាគ្មាន WiFi ឬ Internet ខ្សោយ ក៏នៅតែលេងបានរលូន គ្មាន Lag តាមរយៈ Local Hotspot!\n✅ 🇰🇭 ពុម្ពអក្សរខ្មែរ Kantumruy Pro ច្បាស់ស្អាត ១០០% ទាំងលើកុំព្យូទ័រ និងទូរស័ព្ទដៃ។\n✅ 🎓 បែងចែក ៤ កម្រិតសិក្សា៖ បឋមសិក្សា, អនុវិទ្យាល័យ, វិទ្យាល័យបាក់ឌុប, និងសាកលវិទ្យាល័យ (មានមុខងារ Mazur's Peer Instruction)។\n✅ 🏆 វេទិកាជ័យលាភី Podium 3D + សំឡេងតន្ត្រីរំភើបជក់ចិត្ត។\n\n🎁 ផ្ដល់ជូនសាកល្បង Free Trial សម្រាប់លោកគ្រូអ្នកគ្រូ ៥០ នាក់ដំបូង!\n👉 គ្រាន់តែ Comment ពាក្យ "សាកល្បង" ឬ Inbox មកកាន់ផេកឥឡូវនេះ ដើម្បីទទួលបាន Link ដំឡើងភ្លាមៗ!\n\n#ACKahoot #EdTechCambodia #គ្រូបង្រៀនកម្ពុជា #ការបង្រៀនបែបទំនើប #GeminiAI #KahootKhmer`;
                        navigator.clipboard.writeText(p1);
                        setActionNotice('បានចម្លង Post 1 រួចរាល់!');
                        setTimeout(() => setActionNotice(''), 3000);
                      }}
                      className="w-full py-1.5 rounded-xl bg-purple-600/80 hover:bg-purple-500 text-white text-xs font-bold flex items-center justify-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      <span>ចម្លង Post 1</span>
                    </button>
                  </div>

                  {/* Post 2 */}
                  <div className="p-3.5 rounded-2xl bg-purple-950/40 border border-purple-400/30 space-y-2 flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-bold text-yellow-300 block">📌 POST 2: ប្រៀបធៀប vs Kahoot</span>
                      <p className="text-[11px] text-purple-200/70 line-clamp-3">
                        «ហេតុអ្វីគួរជ្រើស AC-Kahoot ជំនួសឱ្យ Kahoot? គ្មាន Internet ក៏លេងបាន, តម្លៃទិញដាច់មួយជីវិត, គាំទ្រវិញ្ញាសាខ្មែរ...»
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        sound.playClick();
                        const p2 = `🤔 ហេតុអ្វីបានជាលោកគ្រូអ្នកគ្រូគួរជ្រើសរើស AC-Kahoot ជំនួសឱ្យ Kahoot ធម្មតា?\n\nការបង្រៀនបែប Interactive ពិតជាជួយឱ្យសិស្សសប្បាយចិត្ត និងឆាប់ចាំមេរៀន ប៉ុន្តែ Kahoot ធម្មតាមិនសូវស័ក្តិសមនឹងសាលារៀននៅកម្ពុជាទេ ដោយសារ៖\n❌ ត្រូវការ Internet ល្បឿនលឿន (បើ WiFi ខ្សោយ លេងមិនកើត)\n❌ មុខងារ AI បង្កើតសំណួរគិតលុយថ្លៃរាប់សិបដុល្លារក្នុងមួយខែ\n❌ មិនសូវត្រូវតាមកម្មវិធីសិក្សារបស់ក្រសួងអប់រំកម្ពុជា\n\n👉 តែជាមួយ 🎯 AC-Kahoot ទាំងអស់នេះត្រូវបានដោះស្រាយ៖\n1️⃣ ដំណើរការលើ Local WiFi/Hotspot មិនបាច់ខ្វល់រឿងដាច់ Internet 🚀\n2️⃣ Gemini AI បង្កើតសំណួរភាសាខ្មែរ ឥតគិតថ្លៃរហ័សទាន់ចិត្ត 🤖\n3️⃣ តម្លៃសមរម្យបំផុតសម្រាប់គ្រូខ្មែរ (ទិញដាច់ប្រើបានមួយជីវិត មិនបាច់បង់ប្រចាំខែ) 💎\n4️⃣ មានវិញ្ញាសា និងរូបមន្តត្រៀមប្រឡងបាក់ឌុប MoEYS ស្រេចៗ 📚\n\n🔥 កញ្ចប់ពិសេសដើមឆ្នាំ៖ បញ្ចុះតម្លៃ ៥០% សម្រាប់គ្រូបង្រៀន!\n📩 Inbox មកកាន់យើងខ្ញុំឥឡូវនេះ ដើម្បីទទួលបានការប្រឹក្សា និង Demo ផ្ទាល់!\n\n#ACKahoot #KhmerEducation #QuizApp #បង្រៀនសិស្ស #សាលារៀនកម្ពុជា`;
                        navigator.clipboard.writeText(p2);
                        setActionNotice('បានចម្លង Post 2 រួចរាល់!');
                        setTimeout(() => setActionNotice(''), 3000);
                      }}
                      className="w-full py-1.5 rounded-xl bg-purple-600/80 hover:bg-purple-500 text-white text-xs font-bold flex items-center justify-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      <span>ចម្លង Post 2</span>
                    </button>
                  </div>

                  {/* Post 3 */}
                  <div className="p-3.5 rounded-2xl bg-purple-950/40 border border-purple-400/30 space-y-2 flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-bold text-yellow-300 block">📌 POST 3: លក់ជូនសាលា (B2B)</span>
                      <p className="text-[11px] text-purple-200/70 line-clamp-3">
                        «បង្កើនគុណភាពនៃការបង្រៀនក្នុងសាលារបស់លោកអ្នកជាមួយ AC-Kahoot Campus Edition! ដាក់ Logo សាលាផ្ទាល់...»
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        sound.playClick();
                        const p3 = `🏫 បង្កើនគុណភាពនៃការបង្រៀន និងភាពទាក់ទាញក្នុងថ្នាក់រៀនសម្រាប់សាលារបស់លោកអ្នកជាមួយ 🎯 AC-Kahoot Campus Edition!\n\nបច្ចុប្បន្ន សិស្សជំនាន់ Gen Z ចូលចិត្តការរៀនបែបកម្សាន្ត (Gamification)។ AC-Kahoot ជួយឱ្យលោកគ្រូអ្នកគ្រូក្នុងស្ថាប័នរបស់លោកអ្នក៖\n🔹 បង្កើតបរិយាកាសប្រកួតប្រជែងវិជ្ជមានក្នុងថ្នាក់រៀន\n🔹 វាយតម្លៃសមត្ថភាពសិស្សភ្លាមៗ (Real-time Live Analytics)\n🔹 មិនត្រូវការដំឡើងប្រព័ន្ធ Internet ថ្លៃៗតាមបន្ទប់នីមួយៗ (ដំណើរការលើ Intranet សាលាបាន)\n🔹 អាចដាក់ Logo និង Brand របស់សាលាបានផ្ទាល់ខ្លួន\n\n💼 យើងខ្ញុំផ្ដល់ជូនកញ្ចប់ School License សម្រាប់សាលារៀនគ្រប់កម្រិត ព្រមទាំងការបណ្ដុះបណ្ដាលដល់គ្រូបង្រៀនផ្ទាល់!\n\n📩 ទាក់ទងមកកាន់យើងខ្ញុំឥឡូវនេះដើម្បីណាត់ជួប Demo ផ្ទាល់ ឬតាម Online:\n#EdTech #SchoolManagement #CambodiaEducation #DigitalClassroom #ACKahoot`;
                        navigator.clipboard.writeText(p3);
                        setActionNotice('បានចម្លង Post 3 រួចរាល់!');
                        setTimeout(() => setActionNotice(''), 3000);
                      }}
                      className="w-full py-1.5 rounded-xl bg-purple-600/80 hover:bg-purple-500 text-white text-xs font-bold flex items-center justify-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      <span>ចម្លង Post 3</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* SECTION 3: Landing Page & Instant Sales Pitch */}
              <div className="glass-panel p-5 rounded-3xl border border-white/10 bg-black/40 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-yellow-400" />
                    <h4 className="text-sm font-bold text-white">
                      {lang === 'km' ? '🌐 ទំព័រ Landing Page & សារលក់រហ័ស' : 'Landing Page & Quick Pitch'}
                    </h4>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/30 to-purple-950/30 border border-yellow-500/30 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div>
                    <h5 className="text-xs font-bold text-yellow-300">📄 ឯកសារ Landing Page (HTML)</h5>
                    <p className="text-[11px] text-purple-200/70">
                      ទំព័រ Web ស្រស់ស្អាត ត្រៀមរួចជាស្រេចក្នុង Folder <code className="text-yellow-300 font-mono bg-black/40 px-1 py-0.5 rounded">marketing/landing_page.html</code>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        sound.playClick();
                        const pitchText = `🎉 ជំរាបសួរលោកគ្រូ/អ្នកគ្រូ!\nតើលោកគ្រូចង់សាកល្បងប្រើ AC-Kahoot! ដែលជាប្រព័ន្ធល្បែងសិក្សា Quiz ជំនាន់ថ្មី មាន Gemini AI បង្កើតសំណួរក្នុង 5 វិនាទី និងអាចលេងបានទោះគ្មាន Internet មែនទេ?\n👉 ខ្ញុំផ្ដល់ជូន License សាកល្បងឥតគិតថ្លៃ! ប្រសិនបើលោកគ្រូចាប់អារម្មណ៍ ខ្ញុំនឹងផ្ញើ Link ដំឡើងជូនភ្លាមៗបាទ/ចាស។`;
                        navigator.clipboard.writeText(pitchText);
                        setActionNotice('បានចម្លងសារលក់រហ័សសម្រាប់ Telegram រួចរាល់!');
                        setTimeout(() => setActionNotice(''), 3000);
                      }}
                      className="px-3 py-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-bold flex items-center gap-1.5 shadow-md"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>ចម្លងសារលក់ Telegram</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'security' ? (
            /* Security & Master Password Tab */
            <div className="max-w-xl mx-auto glass-panel p-6 rounded-3xl border border-yellow-500/30 space-y-5 bg-black/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-yellow-500/20 text-yellow-300 flex items-center justify-center border border-yellow-400/30">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {lang === 'km' ? 'កំណត់លេខសម្ងាត់ Master Admin ថ្មី' : 'Change Master Admin Password'}
                  </h3>
                  <p className="text-xs text-purple-200/70">
                    {lang === 'km' ? 'ប្តូរលេខសម្ងាត់សម្រាប់គណនី admin@ac-kahoot.edu' : 'Update password for admin@ac-kahoot.edu'}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveAdminPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-purple-200 mb-1">
                    {lang === 'km' ? 'លេខសម្ងាត់ចាស់ (Current Password - លំនាំដើម៖ admin123)' : 'Current Password'}
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentAdminPass ? "text" : "password"}
                      value={currentAdminPass}
                      onChange={(e) => setCurrentAdminPass(e.target.value)}
                      placeholder="admin123"
                      className="w-full bg-black/60 border border-white/20 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-white focus:outline-none focus:border-yellow-400 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentAdminPass(!showCurrentAdminPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-yellow-300 transition-colors"
                      tabIndex={-1}
                    >
                      {showCurrentAdminPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-purple-200 mb-1">
                    {lang === 'km' ? 'លេខសម្ងាត់ថ្មី (New Password)' : 'New Password'}
                  </label>
                  <div className="relative">
                    <input
                      type={showNewAdminPass ? "text" : "password"}
                      required
                      value={newAdminPass}
                      onChange={(e) => setNewAdminPass(e.target.value)}
                      placeholder="បញ្ចូលលេខសម្ងាត់ថ្មីរបស់អ្នក"
                      className="w-full bg-black/60 border border-white/20 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-white focus:outline-none focus:border-yellow-400 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewAdminPass(!showNewAdminPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-yellow-300 transition-colors"
                      tabIndex={-1}
                    >
                      {showNewAdminPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-purple-200 mb-1">
                    {lang === 'km' ? 'បញ្ជាក់លេខសម្ងាត់ថ្មី (Confirm New Password)' : 'Confirm New Password'}
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmAdminPass ? "text" : "password"}
                      required
                      value={confirmAdminPass}
                      onChange={(e) => setConfirmAdminPass(e.target.value)}
                      placeholder="វាយលេខសម្ងាត់ថ្មីម្តងទៀត"
                      className="w-full bg-black/60 border border-white/20 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-white focus:outline-none focus:border-yellow-400 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmAdminPass(!showConfirmAdminPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-yellow-300 transition-colors"
                      tabIndex={-1}
                    >
                      {showConfirmAdminPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl font-bold text-xs bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-black shadow-lg shadow-yellow-950/60 flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95"
                >
                  <Save className="w-4 h-4" />
                  <span>{lang === 'km' ? 'រក្សាទុកលេខសម្ងាត់ថ្មី (Save Password)' : 'Save Password'}</span>
                </button>
              </form>
            </div>
          ) : null}
        </div>

        {/* Modal for Resetting a Teacher's Password */}
        {resetTargetUser && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="glass-panel border border-yellow-400/40 rounded-2xl max-w-sm w-full p-5 space-y-4 bg-[#20053e] animate-scale-in">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Key className="w-4 h-4 text-yellow-300" />
                  <span>Reset លេខសម្ងាត់ឱ្យ៖ {resetTargetUser.name}</span>
                </h4>
                <button
                  onClick={() => setResetTargetUser(null)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-purple-200 mb-1">
                  វាយលេខសម្ងាត់ថ្មីសម្រាប់ {resetTargetUser.email}
                </label>
                <input
                  type="text"
                  value={newTargetPassword}
                  onChange={(e) => setNewTargetPassword(e.target.value)}
                  placeholder="ឧ. pass12345"
                  className="w-full bg-black/60 border border-white/20 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetTargetUser(null)}
                  className="px-3 py-1.5 rounded-xl bg-white/10 text-xs text-gray-300 hover:text-white font-bold"
                >
                  បោះបង់
                </button>
                <button
                  type="button"
                  onClick={handleSaveTeacherResetPassword}
                  className="px-4 py-1.5 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-bold shadow-md"
                >
                  កំណត់ថ្មី (Save)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-black/40 flex items-center justify-between text-xs text-purple-300/70">
          <span>AC-Kahoot! Enterprise Platform v2.5.0</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all"
          >
            {lang === 'km' ? 'បិទផ្ទាំងបញ្ជា' : 'Close Panel'}
          </button>
        </div>
      </div>
    </div>
  );
}
