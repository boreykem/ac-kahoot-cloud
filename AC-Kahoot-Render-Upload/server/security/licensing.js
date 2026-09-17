/**
 * AC-Kahoot! Cloud License Engine
 * Transitioned to Cloud SaaS - No longer using Hardware locking.
 */

export const MASTER_SECRET = 'ACK-KHMER-SECURE-KEY-CLOUD';

export function getHardwareFingerprint() {
  return 'CLOUD-SaaS-GLOBAL';
}

export function generateCryptographicKey(hwid, planType = 'PRO_LIFETIME', durationDays = 0) {
  return `ACK-${planType}-CLOUD-KEY`;
}

export function verifyCryptographicKey(licenseKey, targetHwid = null) {
  // In cloud mode, license key validation will just be checking MongoDB.
  // For legacy endpoint compatibility:
  return {
    valid: true,
    planType: 'PRO_LIFETIME',
    planTitle: 'Pro Cloud Edition',
    expiryCode: 'LIFE',
    expiresAt: 'LIFETIME',
    hwid: 'CLOUD-SaaS-GLOBAL'
  };
}

export function loadActiveLicense() {
  return {
    isLicensed: true,
    plan: 'PRO_LIFETIME',
    planTitle: 'Cloud Global Edition',
    expiresAt: null,
    hwid: 'CLOUD-SaaS-GLOBAL'
  };
}

export function saveActiveLicense(licenseKey, licensedTo = '') {
  return {
    success: true,
    message: `Cloud License Accepted!`,
    license: { plan: 'PRO_LIFETIME' }
  };
}
