/**
 * AC-Kahoot! Cryptographic Hardware-Locked License Engine (Anti-Piracy & Anti-Sharing)
 * Designed for offline verification using HMAC-SHA256 signatures.
 */

import os from 'os';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Master Secret Salt for Signature Verification (Keep secure & obfuscated)
export const MASTER_SECRET = 'ACK-KHMER-SECURE-KEY-2026-X99-PRO-BAUREY-MASTER-SALT-084920';

const LICENSE_DATA_PATH = path.join(__dirname, '../license.active.json');

/**
 * Generate a deterministic, stable Hardware ID (HWID) for this machine.
 */
export function getHardwareFingerprint() {
  try {
    const interfaces = os.networkInterfaces();
    let macAddresses = [];
    for (const key of Object.keys(interfaces)) {
      for (const net of interfaces[key]) {
        if (net.mac && net.mac !== '00:00:00:00:00:00' && !net.internal) {
          macAddresses.push(net.mac.toLowerCase());
        }
      }
    }
    macAddresses.sort();
    const macStr = macAddresses.join('|') || 'mac-fallback-ack';

    const cpus = os.cpus();
    const cpuModel = (cpus && cpus[0]) ? cpus[0].model : 'cpu-generic';

    const rawString = `${os.hostname()}#${os.platform()}#${os.arch()}#${cpuModel}#${macStr}`;
    const hash = crypto.createHash('sha256').update(rawString).digest('hex').toUpperCase();

    // Format: ACK-HWID-XXXX-YYYY-ZZZZ
    const p1 = hash.substring(0, 4);
    const p2 = hash.substring(4, 8);
    const p3 = hash.substring(8, 12);
    return `ACK-HWID-${p1}-${p2}-${p3}`;
  } catch (err) {
    console.error('[HWID] Fingerprint error:', err);
    return 'ACK-HWID-FALLBACK-0000-0000';
  }
}

/**
 * Generate a Cryptographic License Key bound to a specific HWID.
 * @param {string} hwid - Target machine HWID
 * @param {string} planType - 'PRO_LIFETIME' | 'PRO_ANNUAL' | 'PRO_MONTHLY' | 'VIP_SCHOOL'
 * @param {number} durationDays - 0 for lifetime, or number of days
 * @returns {string} License Key
 */
export function generateCryptographicKey(hwid, planType = 'PRO_LIFETIME', durationDays = 0) {
  const cleanHwid = (hwid || '').trim().toUpperCase();
  const cleanPlan = (planType || 'PRO_LIFETIME').trim().toUpperCase();
  
  let expiryCode = 'LIFE';
  let expiryTimestamp = 0;

  if (durationDays > 0) {
    expiryTimestamp = Date.now() + (durationDays * 24 * 60 * 60 * 1000);
    expiryCode = expiryTimestamp.toString(36).toUpperCase();
  }

  // Plan prefix map
  const planPrefix = {
    PRO_LIFETIME: 'PRO',
    PRO_ANNUAL: 'ANN',
    PRO_MONTHLY: 'MON',
    VIP_SCHOOL: 'VIP'
  }[cleanPlan] || 'PRO';

  // HMAC payload
  const payload = `${cleanHwid}#${cleanPlan}#${expiryCode}`;
  const signature = crypto.createHmac('sha256', MASTER_SECRET).update(payload).digest('hex').substring(0, 8).toUpperCase();

  // License Key Format: ACK-[PLAN]-[EXPIRY]-[SIG1]-[SIG2]
  const sigPart1 = signature.substring(0, 4);
  const sigPart2 = signature.substring(4, 8);

  return `ACK-${planPrefix}-${expiryCode}-${sigPart1}-${sigPart2}`;
}

/**
 * Validate a License Key against a target HWID (or this machine's current HWID).
 * @param {string} licenseKey 
 * @param {string} targetHwid 
 */
export function verifyCryptographicKey(licenseKey, targetHwid = null) {
  const currentHwid = targetHwid || getHardwareFingerprint();
  if (!licenseKey || typeof licenseKey !== 'string') {
    return { valid: false, message: 'សូមបញ្ចូល License Key ឱ្យបានត្រឹមត្រូវ!' };
  }

  const parts = licenseKey.trim().toUpperCase().split('-');
  if (parts.length !== 5 || parts[0] !== 'ACK') {
    return { valid: false, message: 'ទម្រង់ License Key មិនត្រឹមត្រូវឡើយ (ត្រូវចាប់ផ្តើមដោយ ACK-...)!' };
  }

  const [, planPrefix, expiryCode, sigPart1, sigPart2] = parts;
  const providedSignature = `${sigPart1}${sigPart2}`;

  const prefixToPlan = {
    PRO: 'PRO_LIFETIME',
    ANN: 'PRO_ANNUAL',
    MON: 'PRO_MONTHLY',
    VIP: 'VIP_SCHOOL'
  };

  const planType = prefixToPlan[planPrefix] || 'PRO_LIFETIME';

  // Check Expiry Date if not LIFE
  let expiresAt = null;
  if (expiryCode !== 'LIFE') {
    try {
      const parsedTimestamp = parseInt(expiryCode, 36);
      if (isNaN(parsedTimestamp)) {
        return { valid: false, message: 'កាលបរិច្ឆេទនៃ License Key មិនត្រឹមត្រូវ!' };
      }
      expiresAt = new Date(parsedTimestamp);
      if (Date.now() > parsedTimestamp) {
        return { 
          valid: false, 
          expired: true, 
          message: `License Key នេះបានផុតកំណត់តាំងពីថ្ងៃទី ${expiresAt.toLocaleDateString('km-KH')}!` 
        };
      }
    } catch (e) {
      return { valid: false, message: 'កូដសុពលភាពមិនត្រឹមត្រូវ!' };
    }
  }

  // Recompute Expected Signature
  const expectedPayload = `${currentHwid.trim().toUpperCase()}#${planType}#${expiryCode}`;
  const expectedSignature = crypto.createHmac('sha256', MASTER_SECRET)
    .update(expectedPayload)
    .digest('hex')
    .substring(0, 8)
    .toUpperCase();

  if (providedSignature !== expectedSignature) {
    return {
      valid: false,
      hardwareMismatch: true,
      message: '🔒 License Key នេះមិនត្រូវជាមួយអ៊ីមែលនេះឡើយ (Email Mismatch)! មិនអាចយក Key ពីគណនីផ្សេងមកប្រើបានទេ។'
    };
  }

  const planTitles = {
    PRO_LIFETIME: 'Pro Lifetime (ប្រើមួយជីវិត)',
    VIP_SCHOOL: 'VIP School Lifetime (សាលារៀន/ស្ថាប័ន - ប្រើមួយជីវិត)',
    PRO_ANNUAL: 'Pro Annual (គម្រោងប្រចាំឆ្នាំ)',
    PRO_MONTHLY: 'Pro Monthly (គម្រោងប្រចាំខែ)'
  };

  return {
    valid: true,
    planType,
    planTitle: planTitles[planType] || 'Pro License',
    expiryCode,
    expiresAt: expiresAt ? expiresAt.toISOString() : 'LIFETIME',
    hwid: currentHwid
  };
}

/**
 * Load currently saved active license state from disk.
 */
export function loadActiveLicense() {
  try {
    if (fs.existsSync(LICENSE_DATA_PATH)) {
      const data = JSON.parse(fs.readFileSync(LICENSE_DATA_PATH, 'utf-8'));
      if (data && data.licenseKey) {
        const verification = verifyCryptographicKey(data.licenseKey, getHardwareFingerprint());
        if (verification.valid) {
          return {
            isLicensed: true,
            plan: verification.planType,
            planTitle: verification.planTitle,
            expiresAt: verification.expiresAt,
            licensedTo: data.licensedTo || 'អតិថិជនកិត្តិយស',
            activatedAt: data.activatedAt,
            hwid: getHardwareFingerprint()
          };
        }
      }
    }
  } catch (err) {
    console.error('[License] Load error:', err);
  }

  return {
    isLicensed: false,
    plan: 'FREE_TIER',
    planTitle: 'Free Edition (សាកល្បងឥតគិតថ្លៃ)',
    expiresAt: null,
    hwid: getHardwareFingerprint()
  };
}

/**
 * Save newly activated license key to disk.
 */
export function saveActiveLicense(licenseKey, licensedTo = '') {
  const currentHwid = getHardwareFingerprint();
  const verification = verifyCryptographicKey(licenseKey, currentHwid);

  if (!verification.valid) {
    return {
      success: false,
      ...verification
    };
  }

  const record = {
    licenseKey: licenseKey.trim().toUpperCase(),
    hwid: currentHwid,
    plan: verification.planType,
    planTitle: verification.planTitle,
    expiresAt: verification.expiresAt,
    licensedTo: licensedTo.trim() || 'អតិថិជនកិត្តិយស',
    activatedAt: new Date().toISOString()
  };

  try {
    fs.writeFileSync(LICENSE_DATA_PATH, JSON.stringify(record, null, 2), 'utf-8');
    return {
      success: true,
      message: `🎉 អបអរសាទរ! កម្មវិធី AC-Kahoot ត្រូវបាន Activated ជា ${verification.planTitle} ដោយជោគជ័យ!`,
      license: record
    };
  } catch (err) {
    console.error('[License] Save error:', err);
    return { success: false, message: 'បរាជ័យក្នុងការរក្សាទុក License File លើម៉ាស៊ីន!' };
  }
}
