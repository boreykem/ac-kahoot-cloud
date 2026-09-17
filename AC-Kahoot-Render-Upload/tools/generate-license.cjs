#!/usr/bin/env node
/**
 * AC-Kahoot! Official Key Generator CLI for Baurey (Platform Owner)
 * Usage: node generate-license.cjs [HWID] [PLAN: pro_lifetime|pro_annual|pro_monthly|vip] [DAYS]
 */

const { generateCryptographicKey, verifyCryptographicKey } = require('../server/security/licensing.cjs');

const args = process.argv.slice(2);
const hwid = args[0];
const plan = (args[1] || 'PRO_LIFETIME').toUpperCase();
const days = parseInt(args[2]) || (plan === 'PRO_ANNUAL' ? 365 : plan === 'PRO_MONTHLY' ? 30 : 0);

if (!hwid) {
  console.log(`
========================================================================
  🎯 AC-Kahoot! Cryptographic License Key Generator (Offline HWID)
========================================================================
  
  👉 របៀបប្រើ (Usage):
     node tools/generate-license.cjs <HWID> [PLAN] [DURATION_DAYS]

  👉 ឧទាហរណ៍ (Examples):
     1. Pro Lifetime:
        node tools/generate-license.cjs ACK-HWID-4B82-99FA-10CD PRO_LIFETIME

     2. Pro 1 Year (365 Days):
        node tools/generate-license.cjs ACK-HWID-4B82-99FA-10CD PRO_ANNUAL 365

     3. Pro 1 Month (30 Days):
        node tools/generate-license.cjs ACK-HWID-4B82-99FA-10CD PRO_MONTHLY 30

     4. VIP School Edition:
        node tools/generate-license.cjs ACK-HWID-4B82-99FA-10CD VIP_SCHOOL

========================================================================
`);
  process.exit(0);
}

const key = generateCryptographicKey(hwid, plan, days);
const testVerify = verifyCryptographicKey(key, hwid);

console.log(`
========================================================================
  ✅ បង្កើត LICENSE KEY ថ្មីដោយជោគជ័យ (GENERATED SUCCESSFULLY)
========================================================================
  
  💻 Target HWID : ${hwid}
  🏷️ Plan Type   : ${testVerify.planTitle}
  ⏳ Expiration  : ${testVerify.expiresAt}
  
  🔑 LICENSE KEY : \x1b[32m\x1b[1m${key}\x1b[0m
  
  👉 សូម Copy លេខកូដខាងលើផ្ញើជូនអតិថិជនតាម Telegram!
========================================================================
`);
