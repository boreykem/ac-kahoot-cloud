/**
 * AC-Kahoot! 24/7 Standalone Cloud Telegram Bot & Cryptographic Keygen Service
 * Author: KEM BOREY (Platform Owner)
 *
 * This service runs 24/7 in the cloud (e.g. Render, Railway, Glitch, VPS)
 * independently from the local AC-Kahoot host application.
 * You can turn off your PC at home anytime, and this bot will still receive
 * payment slips and allow 1-Click License Key generation directly from your phone!
 */

import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Master Salt for offline cryptographic HMAC-SHA256 license generation
const MASTER_SECRET = 'ACK-KHMER-SECURE-KEY-2026-X99-PRO-BAUREY-MASTER-SALT-084920';
const CONFIG_FILE = path.join(__dirname, 'botConfig.json');
const STATES_FILE = path.join(__dirname, 'telegramUserStates.json');

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Error loading botConfig.json:', e.message);
  }
  return {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '8884699311:AAFusHbd_PRcGrPZWH9Ntc-zFA342IEVDY4',
    botUsername: process.env.TELEGRAM_BOT_USERNAME || 'ac_mart_programer_developer_bot',
    price1Month: '$0.5',
    price1Year: '$2.5',
    priceLifetime: '$15',
    adminName: 'លោកគ្រូ បូរី (Platform Owner)',
    adminTelegram: '@KEMBOREY',
    adminPhone: '0312777761',
    adminChatId: '',
    customNotes: 'សូមរង់ចាំបន្តិច លោកគ្រូបូរីនឹងផ្ញើសោរ License Key ជូនលោកគ្រូ/អ្នកគ្រូក្នុងពេលឆាប់ៗនេះ!'
  };
}

function saveConfig(cfg) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving botConfig.json:', e.message);
  }
}

function loadStates() {
  try {
    if (fs.existsSync(STATES_FILE)) {
      return JSON.parse(fs.readFileSync(STATES_FILE, 'utf-8'));
    }
  } catch (e) {}
  return {};
}

function saveStates(states) {
  try {
    fs.writeFileSync(STATES_FILE, JSON.stringify(states, null, 2), 'utf-8');
  } catch (e) {}
}

let botConfig = loadConfig();
let userStates = loadStates();

// Cryptographic License Key Generator
function generateCryptographicKey(hwid, planType = 'PRO_LIFETIME', durationDays = 0) {
  const cleanHwid = (hwid || '').trim().toUpperCase();
  const cleanPlan = (planType || 'PRO_LIFETIME').trim().toUpperCase();

  let expiryCode = 'LIFE';
  if (durationDays > 0) {
    const expiryTimestamp = Date.now() + (durationDays * 24 * 60 * 60 * 1000);
    expiryCode = expiryTimestamp.toString(36).toUpperCase();
  }

  const planPrefix = {
    PRO_LIFETIME: 'PRO',
    PRO_ANNUAL: 'ANN',
    PRO_MONTHLY: 'MON',
    VIP_SCHOOL: 'VIP'
  }[cleanPlan] || 'PRO';

  const payload = `${cleanHwid}#${cleanPlan}#${expiryCode}`;
  const signature = crypto.createHmac('sha256', MASTER_SECRET).update(payload).digest('hex').substring(0, 8).toUpperCase();

  const sigPart1 = signature.substring(0, 4);
  const sigPart2 = signature.substring(4, 8);

  return `ACK-${planPrefix}-${expiryCode}-${sigPart1}-${sigPart2}`;
}

// Telegram API Request Helper (Force IPv4 for stability)
function telegramRequest(method, payload = null) {
  return new Promise((resolve) => {
    const token = botConfig.botToken || process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return resolve({ ok: false, description: 'No bot token configured' });

    const postData = payload ? JSON.stringify(payload) : null;
    const options = {
      hostname: 'api.telegram.org',
      port: 443,
      path: `/bot${token}/${method}`,
      method: postData ? 'POST' : 'GET',
      family: 4,
      headers: {
        'Accept': 'application/json',
        ...(postData ? {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        } : {})
      },
      timeout: 15000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ ok: false, raw: data });
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false, description: 'Request timeout' });
    });

    req.on('error', (err) => {
      console.warn(`[Telegram ${method} Error]:`, err.message);
      resolve({ ok: false, description: err.message });
    });

    if (postData) req.write(postData);
    req.end();
  });
}

async function sendTelegramMessage(chatId, text, parseMode = 'HTML', replyMarkup = null) {
  if (!chatId || !text) return false;
  const payload = { chat_id: chatId, text, parse_mode: parseMode };
  if (replyMarkup) payload.reply_markup = replyMarkup;
  const res = await telegramRequest('sendMessage', payload);
  return res && res.ok;
}

async function sendTelegramPhoto(chatId, photo, caption = '', parseMode = 'HTML', replyMarkup = null) {
  if (!chatId || !photo) return false;
  const safeCaption = caption ? caption.slice(0, 1020) : '';

  if (photo.startsWith('data:image/')) {
    // If base64 KHQR image, post as multipart/form-data via fetch
    try {
      const matches = photo.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
      if (matches) {
        const ext = matches[1] || 'png';
        const buffer = Buffer.from(matches[2], 'base64');
        const formData = new FormData();
        formData.append('chat_id', chatId.toString());
        if (safeCaption) formData.append('caption', safeCaption);
        formData.append('parse_mode', parseMode);
        if (replyMarkup) formData.append('reply_markup', JSON.stringify(replyMarkup));
        const blob = new Blob([buffer], { type: `image/${ext}` });
        formData.append('photo', blob, `khqr.${ext}`);

        const token = botConfig.botToken || process.env.TELEGRAM_BOT_TOKEN;
        const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
          method: 'POST',
          body: formData
        });
        return res.ok;
      }
    } catch (e) {
      console.warn('[Telegram sendPhoto base64 error]:', e.message);
    }
  }

  // Telegram file_id or standard URL
  const payload = {
    chat_id: chatId,
    photo: photo,
    caption: safeCaption,
    parse_mode: parseMode
  };
  if (replyMarkup) payload.reply_markup = replyMarkup;
  const res = await telegramRequest('sendPhoto', payload);
  return res && res.ok;
}

async function answerCallbackQuery(callbackQueryId, text = '') {
  return await telegramRequest('answerCallbackQuery', { callback_query_id: callbackQueryId, text });
}

async function editTelegramMessageReplyMarkup(chatId, messageId, replyMarkup) {
  return await telegramRequest('editMessageReplyMarkup', { chat_id: chatId, message_id: messageId, reply_markup: replyMarkup });
}

// Polling Engine
let lastUpdateId = 0;
async function pollTelegramBot() {
  const token = botConfig.botToken || process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    setTimeout(pollTelegramBot, 5000);
    return;
  }

  try {
    const res = await telegramRequest(`getUpdates?offset=${lastUpdateId + 1}&timeout=10`);
    if (res && res.ok && Array.isArray(res.result)) {
      for (const update of res.result) {
        lastUpdateId = update.update_id;
        botConfig = loadConfig();
        userStates = loadStates();
        const adminUser = (botConfig.adminTelegram || 'KEMBOREY').replace(/^@/, '').trim();

        // ----------------------------------------------------
        // CASE 1: USER SENDS MESSAGE, HWID, PHOTO, OR /start
        // ----------------------------------------------------
        const msg = update.message;
        if (msg && msg.chat) {
          const chatId = msg.chat.id;
          const text = (msg.text || msg.caption || '').trim();
          const senderName = msg.from?.first_name || 'លោកគ្រូ/អ្នកគ្រូ';
          const fromUsername = (msg.from?.username || '').toLowerCase();
          const isMatchUsername = adminUser && fromUsername && fromUsername === adminUser.toLowerCase();

          // Auto-bind Admin Chat ID if username matches @KEMBOREY or text starts with /admin
          if (isMatchUsername) {
            if (botConfig.adminChatId !== chatId.toString()) {
              botConfig.adminChatId = chatId.toString();
              saveConfig(botConfig);
              console.log(`[Cloud Bot] Auto-registered Admin Chat ID: ${chatId} (@${fromUsername})`);
            }
          }

          // HWID regex detector
          const hwidMatch = text.match(/(?:HWID_|ACK-HWID-|ACK-)([A-Z0-9_-]+)/i);
          const extractedHwid = hwidMatch ? hwidMatch[0].replace(/^HWID_/i, '').trim() : '';

          if (text.startsWith('/start') || text.toLowerCase() === 'menu' || text.toLowerCase() === 'price') {
            const parts = text.split(' ');
            const param = parts[1] || '';
            let hwid = param.replace(/^HWID_/i, '').trim();
            if (hwid.toUpperCase() === 'BUY_LICENSE') hwid = '';
            if (!hwid && extractedHwid) hwid = extractedHwid;

            userStates[chatId] = {
              hwid: hwid || (userStates[chatId]?.hwid || ''),
              plan: userStates[chatId]?.plan || '',
              name: senderName,
              username: msg.from?.username || '',
              updatedAt: new Date().toISOString()
            };
            saveStates(userStates);

            let reply = `🎯 <b>សូមស្វាគមន៍មកកាន់ AC-Kahoot! Official Bot</b>\n\n`;
            reply += `សួស្តី <b>${senderName}</b>! 🙏\n\n`;
            if (userStates[chatId].hwid) {
              reply += `💻 <b>Hardware Machine ID របស់អ្នក៖</b>\n<code>${userStates[chatId].hwid}</code>\n\n`;
              reply += `✅ យើងខ្ញុំបានកត់ត្រា Machine ID របស់អ្នករួចរាល់ហើយ!\n\n`;
            } else {
              reply += `ដើម្បីទទួលបាន License Key សូមផ្ញើលេខ <b>Hardware Machine ID</b> របស់អ្នកមកកាន់ទីនេះ។\n\n`;
            }
            reply += `🌟 <b>សូមចុចជ្រើសរើសគម្រោងដែលលោកគ្រូ/អ្នកគ្រូចង់ទិញខាងក្រោម៖</b>\n`;
            if (botConfig.price1Month) reply += `• <b>Pro ប្រចាំខែ (1 Month)៖</b> ${botConfig.price1Month}\n`;
            if (botConfig.price1Year) reply += `• <b>Pro ប្រចាំឆ្នាំ (1 Year)៖</b> ${botConfig.price1Year}\n`;
            if (botConfig.priceLifetime) reply += `• <b>Pro ពេញមួយជីវិត (Lifetime)៖</b> ${botConfig.priceLifetime}\n\n`;

            reply += `👉 <i>សូមចុចលើប៊ូតុងគម្រោងខាងក្រោម ដើម្បីទទួល QR Code បង់ប្រាក់៖</i>`;

            const currentHwid = userStates[chatId].hwid || '';
            const inlineKeyboard = [];
            if (botConfig.price1Month) {
              inlineKeyboard.push([
                { text: `🗓️ Pro ១ ខែ (${botConfig.price1Month})`, callback_data: `plan:1m:${currentHwid}` }
              ]);
            }
            if (botConfig.price1Year) {
              inlineKeyboard.push([
                { text: `⭐ Pro ១ ឆ្នាំ (${botConfig.price1Year})`, callback_data: `plan:1y:${currentHwid}` }
              ]);
            }
            if (botConfig.priceLifetime) {
              inlineKeyboard.push([
                { text: `👑 Pro ពេញមួយជីវិត (${botConfig.priceLifetime})`, callback_data: `plan:lifetime:${currentHwid}` }
              ]);
            }
            inlineKeyboard.push([
              { text: `💬 ឆាតទាក់ទងលោកគ្រូ បូរី (@${adminUser}) ផ្ទាល់`, url: `https://t.me/${adminUser}` }
            ]);

            await sendTelegramMessage(chatId, reply, 'HTML', { inline_keyboard: inlineKeyboard });
          } else if (text.startsWith('/admin')) {
            botConfig.adminChatId = chatId.toString();
            saveConfig(botConfig);
            console.log(`[Cloud Bot] Explicitly connected Admin Chat ID: ${chatId} (@${fromUsername || 'N/A'})`);
            await sendTelegramMessage(chatId, `✅ <b>ជោគជ័យ!</b> Bot បានកត់ត្រា និងភ្ជាប់ Admin Chat ID (<code>${chatId}</code>) រួចរាល់។ លោកគ្រូនឹងទទួលបានវិក្កយបត្របង់ប្រាក់នៅទីនេះដោយស្វ័យប្រវត្តិ។`, 'HTML');
          } else if (msg.photo || msg.document) {
            const state = userStates[chatId] || {};
            if (extractedHwid && !state.hwid) {
              state.hwid = extractedHwid;
              userStates[chatId] = state;
              saveStates(userStates);
            }

            if (!state.hwid) {
              await sendTelegramMessage(chatId, `⚠️ <b>សូមអភ័យទោស!</b> យើងខ្ញុំមិនទាន់ស្គាល់ Hardware ID របស់អ្នកទេ។\nសូមចូលទៅកាន់កម្មវិធី រួចចុចប៉ូតុង <b>"ទិញឥឡូវនេះ (Buy Now)"</b> ម្តងទៀត ឬវាយផ្ញើលេខ HWID (ឧទាហរណ៍៖ <code>ACK-HWID-XXXX-YYYY-ZZZZ</code>) មកកាន់ទីនេះសិន។`, 'HTML');
            } else {
              const effectivePlan = state.plan || 'lifetime';
              let slipReply = `✅ <b>យើងខ្ញុំបានទទួលរូបភាពវិក្កយបត្រ (Payment Slip) របស់អ្នករួចរាល់ហើយ!</b> 🙏\n\n`;
              slipReply += `👤 <b>គណនីផ្ញើ៖</b> ${senderName} (@${msg.from?.username || 'N/A'})\n`;
              slipReply += `💻 <b>HWID៖</b> <code>${state.hwid}</code>\n`;
              slipReply += `🕒 <b>កាលបរិច្ឆេទ៖</b> ${new Date().toLocaleString('km-KH', { timeZone: 'Asia/Phnom_Penh' })}\n\n`;
              slipReply += `⏳ លោកគ្រូ បូរី (Admin) នឹងពិនិត្យ និងចេញ <b>License Key</b> ជូនលោកគ្រូ/អ្នកគ្រូតាមរយៈ Bot នេះក្នុងពេលឆាប់ៗនេះ។\n\n`;
              slipReply += `💡 <i>(ប្រសិនបើយឺតយ៉ាវ លោកគ្រូ/អ្នកគ្រូអាចឆាតទៅកាន់ @${adminUser} បន្ថែមបានផងដែរ)</i>`;

              await sendTelegramMessage(chatId, slipReply, 'HTML');

              // Forward to Admin with inline buttons
              if (botConfig.adminChatId) {
                let adminNotice = `🚨 <b>មានវិក្កយបត្របង់ប្រាក់ថ្មី!</b>\n\n`;
                adminNotice += `👤 <b>អតិថិជន៖</b> ${senderName} (@${msg.from?.username || 'N/A'})\n`;
                adminNotice += `💻 <b>HWID៖</b> <code>${state.hwid}</code>\n`;

                let planTitle = effectivePlan === '1m' ? 'Pro ប្រចាំខែ (1 Month)' : effectivePlan === '1y' ? 'Pro ប្រចាំឆ្នាំ (1 Year)' : 'Pro ពេញមួយជីវិត (Lifetime)';
                adminNotice += `🌟 <b>គម្រោង៖</b> <b>${planTitle}</b>\n\n`;
                adminNotice += `👉 <i>សូមចុចប៊ូតុងខាងក្រោម ដើម្បីអនុម័ត និងផ្ញើ Key ស្វ័យប្រវត្តិ៖</i>`;

                const adminKeyboard = [
                  [{ text: `✅ ទទួលស្គាល់ការបង់ប្រាក់ & ផ្ញើ Key`, callback_data: `approve:${chatId}:${effectivePlan}` }],
                  [{ text: `❌ បដិសេធ (វិក្កយបត្រក្លែងក្លាយ)`, callback_data: `reject:${chatId}` }]
                ];

                let photoId = '';
                if (msg.photo && msg.photo.length > 0) photoId = msg.photo[msg.photo.length - 1].file_id;
                if (msg.document) photoId = msg.document.file_id;

                let sentOk = false;
                if (photoId) {
                  sentOk = await sendTelegramPhoto(botConfig.adminChatId, photoId, adminNotice, 'HTML', { inline_keyboard: adminKeyboard });
                }
                if (!sentOk) {
                  await sendTelegramMessage(botConfig.adminChatId, adminNotice, 'HTML', { inline_keyboard: adminKeyboard });
                }
              }
            }
          } else if (text) {
            if (extractedHwid) {
              userStates[chatId] = userStates[chatId] || {};
              userStates[chatId].hwid = extractedHwid;
              userStates[chatId].name = senderName;
              userStates[chatId].username = msg.from?.username || '';
              saveStates(userStates);
            }

            let textReply = `🎯 <b>សូមស្វាគមន៍មកកាន់ AC-Kahoot! Official Bot</b>\n\n`;
            textReply += `សួស្តី <b>${senderName}</b>! 🙏\n`;
            if (extractedHwid || userStates[chatId]?.hwid) {
              textReply += `💻 <b>Machine ID៖</b> <code>${userStates[chatId]?.hwid || extractedHwid}</code>\n\n`;
            }
            textReply += `ដើម្បីបញ្ជាទិញ License Key ឬទទួលបានព័ត៌មានគម្រោងតម្លៃ សូមចុចជ្រើសរើសគម្រោងខាងក្រោម៖\n`;

            const curHwid = userStates[chatId]?.hwid || extractedHwid || '';
            const inlineKeyboard = [];
            if (botConfig.price1Month) {
              inlineKeyboard.push([
                { text: `🗓️ Pro ១ ខែ (${botConfig.price1Month})`, callback_data: `plan:1m:${curHwid}` }
              ]);
            }
            if (botConfig.price1Year) {
              inlineKeyboard.push([
                { text: `⭐ Pro ១ ឆ្នាំ (${botConfig.price1Year})`, callback_data: `plan:1y:${curHwid}` }
              ]);
            }
            if (botConfig.priceLifetime) {
              inlineKeyboard.push([
                { text: `👑 Pro ពេញមួយជីវិត (${botConfig.priceLifetime})`, callback_data: `plan:lifetime:${curHwid}` }
              ]);
            }
            inlineKeyboard.push([
              { text: `💬 ឆាតទាក់ទងលោកគ្រូ បូរី (@${adminUser}) ផ្ទាល់`, url: `https://t.me/${adminUser}` }
            ]);

            await sendTelegramMessage(chatId, textReply, 'HTML', { inline_keyboard: inlineKeyboard });
          }
        }

        // ----------------------------------------------------
        // CASE 2: USER CLICKS A PLAN BUTTON
        // ----------------------------------------------------
        const cq = update.callback_query;
        if (cq && cq.data && cq.message && cq.message.chat) {
          const chatId = cq.message.chat.id;
          const dataParts = cq.data.split(':');
          const action = dataParts[0];
          const planKey = dataParts[1];
          const hwid = dataParts[2] || '';

          await answerCallbackQuery(cq.id, 'កំពុងដំណើរការ...');

          if (action === 'plan') {
            userStates[chatId] = userStates[chatId] || { hwid: '' };
            userStates[chatId].plan = planKey;
            if (hwid && hwid.toUpperCase() !== 'BUY_LICENSE') userStates[chatId].hwid = hwid;
            saveStates(userStates);

            let planTitle = 'Pro ពេញមួយជីវិត (Lifetime)';
            let planPrice = botConfig.priceLifetime || '$15';

            if (planKey === '1m') {
              planTitle = 'Pro ប្រចាំខែ (1 Month)';
              planPrice = botConfig.price1Month || '$0.5';
            } else if (planKey === '1y') {
              planTitle = 'Pro ប្រចាំឆ្នាំ (1 Year)';
              planPrice = botConfig.price1Year || '$2.5';
            }

            let reply = `🎉 <b>ព័ត៌មានបញ្ជាទិញ AC-Kahoot! Pro</b>\n\n`;
            reply += `🌟 <b>គម្រោងដែលបានជ្រើសរើស៖</b> ${planTitle}\n`;
            reply += `💵 <b>ចំនួនទឹកប្រាក់ត្រូវបង់៖</b> <b>${planPrice}</b>\n`;
            if (userStates[chatId].hwid) {
              reply += `💻 <b>Hardware Machine ID (HWID)៖</b>\n<code>${userStates[chatId].hwid}</code>\n\n`;
            } else {
              reply += `\n`;
            }

            if (botConfig.bankName || botConfig.bankAccountNumber || botConfig.bankAccountName) {
              reply += `🏦 <b>ព័ត៌មានស្កេនបង់ប្រាក់ KHQR / ធនាគារ៖</b>\n`;
              if (botConfig.bankName) reply += `• <b>ធនាគារ៖</b> ${botConfig.bankName}\n`;
              if (botConfig.bankAccountName) reply += `• <b>ឈ្មោះគណនី៖</b> <code>${botConfig.bankAccountName}</code>\n`;
              if (botConfig.bankAccountNumber) reply += `• <b>លេខកុង៖</b> <code>${botConfig.bankAccountNumber}</code>\n\n`;
            }

            if (botConfig.customNotes) {
              reply += `\n💬 <i>${botConfig.customNotes}</i>`;
            }

            const targetHwid = userStates[chatId].hwid || '';
            const inlineKeyboard = [
              [
                { text: `🔄 ជ្រើសរើសគម្រោងផ្សេងទៀត`, callback_data: `show_menu:${targetHwid}` }
              ],
              [
                { text: `💬 ឆាតទាក់ទងលោកគ្រូ បូរី ផ្ទាល់`, url: `https://t.me/${adminUser}` }
              ]
            ];

            let sentWithPhoto = false;
            if (botConfig.khqrImage) {
              sentWithPhoto = await sendTelegramPhoto(chatId, botConfig.khqrImage, reply, 'HTML', { inline_keyboard: inlineKeyboard });
            }
            if (!sentWithPhoto) {
              await sendTelegramMessage(chatId, reply, 'HTML', { inline_keyboard: inlineKeyboard });
            }
          } else if (action === 'show_menu') {
            const activeHwid = hwid || userStates[chatId]?.hwid || '';
            let reply = `🌟 <b>សូមចុចជ្រើសរើសគម្រោងដែលលោកគ្រូ/អ្នកគ្រូចង់ទិញ៖</b>\n\n`;
            if (activeHwid) reply += `💻 <b>Machine ID៖</b> <code>${activeHwid}</code>\n\n`;
            if (botConfig.price1Month) reply += `• <b>Pro ប្រចាំខែ (1 Month)៖</b> ${botConfig.price1Month}\n`;
            if (botConfig.price1Year) reply += `• <b>Pro ប្រចាំឆ្នាំ (1 Year)៖</b> ${botConfig.price1Year}\n`;
            if (botConfig.priceLifetime) reply += `• <b>Pro ពេញមួយជីវិត (Lifetime)៖</b> ${botConfig.priceLifetime}\n\n`;

            const inlineKeyboard = [];
            if (botConfig.price1Month) {
              inlineKeyboard.push([
                { text: `🗓️ Pro ១ ខែ (${botConfig.price1Month})`, callback_data: `plan:1m:${activeHwid}` }
              ]);
            }
            if (botConfig.price1Year) {
              inlineKeyboard.push([
                { text: `⭐ Pro ១ ឆ្នាំ (${botConfig.price1Year})`, callback_data: `plan:1y:${activeHwid}` }
              ]);
            }
            if (botConfig.priceLifetime) {
              inlineKeyboard.push([
                { text: `👑 Pro ពេញមួយជីវិត (${botConfig.priceLifetime})`, callback_data: `plan:lifetime:${activeHwid}` }
              ]);
            }
            inlineKeyboard.push([
              { text: `💬 ឆាតទាក់ទងលោកគ្រូ បូរី (@${adminUser}) ផ្ទាល់`, url: `https://t.me/${adminUser}` }
            ]);

            await sendTelegramMessage(chatId, reply, 'HTML', { inline_keyboard: inlineKeyboard });
          } else if (action === 'reject') {
            const customerChatId = dataParts[1];
            await editTelegramMessageReplyMarkup(chatId, cq.message.message_id, { inline_keyboard: [] });
            await sendTelegramMessage(chatId, `❌ អ្នកបានបដិសេធវិក្កយបត្រខាងលើរួចរាល់។`, 'HTML');
            await sendTelegramMessage(customerChatId, `❌ <b>សូមអភ័យទោស!</b>\nវិក្កយបត្របង់ប្រាក់របស់អ្នកត្រូវបានបដិសេធ។ សូមទាក់ទងមកកាន់ @${adminUser} ដើម្បីបញ្ជាក់បន្ថែម។`, 'HTML');
          } else if (action === 'approve') {
            const customerChatId = dataParts[1];
            const specifiedPlan = dataParts[2] || '';

            const msgText = cq.message.text || cq.message.caption || '';
            const hwidMatch = msgText.match(/HWID៖\s*([a-zA-Z0-9_-]+)/);
            const planMatch = msgText.match(/គម្រោង៖\s*Pro\s*(ប្រចាំខែ|ប្រចាំឆ្នាំ|ពេញមួយជីវិត)/);

            let customerHwid = hwidMatch ? hwidMatch[1] : (userStates[customerChatId]?.hwid || '');
            let plan = specifiedPlan || userStates[customerChatId]?.plan || 'lifetime';
            if (!specifiedPlan && planMatch) {
              if (planMatch[1].includes('ប្រចាំខែ')) plan = '1m';
              else if (planMatch[1].includes('ប្រចាំឆ្នាំ')) plan = '1y';
            }

            if (!customerHwid) customerHwid = 'ACK-HWID-ONLINE-USER';

            await editTelegramMessageReplyMarkup(chatId, cq.message.message_id, { inline_keyboard: [] });

            const typeMap = { '1m': 'pro_monthly', '1y': 'pro_annual', 'lifetime': 'pro_lifetime' };
            const daysMap = { pro_lifetime: 0, pro_annual: 365, pro_monthly: 30 };
            const planEnumMap = { pro_lifetime: 'PRO_LIFETIME', pro_annual: 'PRO_ANNUAL', pro_monthly: 'PRO_MONTHLY' };

            const type = typeMap[plan] || 'pro_lifetime';
            const keyStr = generateCryptographicKey(customerHwid, planEnumMap[type], daysMap[type]);
            const typeLabels = { pro_lifetime: 'Pro Lifetime (ប្រើមួយជីវិត)', pro_annual: 'Pro Annual (ប្រចាំឆ្នាំ)', pro_monthly: 'Pro Monthly (ប្រចាំខែ)' };

            await sendTelegramMessage(chatId, `✅ <b>បង្កើត និងផ្ញើ Key រួចរាល់!</b>\n<code>${keyStr}</code>\nHWID: <code>${customerHwid}</code>\nKey ត្រូវបានបញ្ជូនទៅ Telegram អតិថិជនរួចរាល់។`, 'HTML');

            let successMsg = `🎉 <b>ការបញ្ជាទិញទទួលបានជោគជ័យ!</b>\n\n`;
            successMsg += `អរគុណច្រើនដែលបានគាំទ្រប្រព័ន្ធគ្រប់គ្រងវិញ្ញាសា AC-Kahoot! 🙏\n`;
            successMsg += `នេះជា <b>License Key</b> របស់អ្នកសម្រាប់គម្រោង <b>${typeLabels[type]}</b>៖\n\n`;
            successMsg += `🔑 <code>${keyStr}</code>\n\n`;
            successMsg += `👉 <i>សូម Copy លេខកូដនេះ ទៅកាន់កម្មវិធី AC-Kahoot! ត្រង់ផ្ទាំងបញ្ចូល Key រួចចុច "បញ្ជាក់ Activation"។</i>`;

            await sendTelegramMessage(customerChatId, successMsg, 'HTML');
          }
        }
      }
    }
  } catch (err) {
    console.warn('[Cloud Bot Poller]:', err.message);
  }

  setTimeout(pollTelegramBot, 1000);
}

// Minimal Healthcheck Web Server for Cloud Platforms (Render, Railway, Fly.io, etc.)
const PORT = process.env.PORT || 8080;
const server = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'online',
      bot: botConfig.botUsername,
      admin: botConfig.adminTelegram,
      adminChatIdConnected: !!botConfig.adminChatId,
      time: new Date().toISOString()
    }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 AC-Kahoot 24/7 Cloud Telegram Bot is RUNNING!`);
  console.log(`🌐 Health endpoint on port ${PORT}`);
  console.log(`🤖 Connected Bot: @${botConfig.botUsername}`);
  console.log(`👤 Admin: ${botConfig.adminTelegram} (Chat ID: ${botConfig.adminChatId || 'Not connected yet - send /admin to bot'})`);
  console.log(`====================================================`);
  pollTelegramBot();
});
