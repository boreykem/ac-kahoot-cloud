import jwt from 'jsonwebtoken';

const BASE_URL = 'http://localhost:3333';

async function runTests() {
  console.log("🚀 Starting E2E System Check...\n");
  let passed = 0;
  let failed = 0;

  const assert = (condition, message) => {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  };

  try {
    // 1. Check Server Liveness
    const pingRes = await fetch(`${BASE_URL}/api/quizzes`);
    assert(pingRes.status === 200, "Server is up and /api/quizzes is responding");
    
    // 2. Test Super Admin Login
    console.log("\n🔑 Testing Authentication...");
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'baureykem@gmail.com', password: '092673641' })
    });
    const loginData = await loginRes.json();
    assert(loginData.success && loginData.token, "Super Admin login successful and JWT received");
    const adminToken = loginData.token;

    // 3. Test Master Admin Stats (Verify MongoDB Migration)
    console.log("\n📊 Testing Admin Stats (MongoDB Migration)...");
    const statsRes = await fetch(`${BASE_URL}/api/admin/stats`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const statsData = await statsRes.json();
    assert(statsData.success, "Admin stats fetched successfully");
    assert(typeof statsData.stats.totalUsers === 'number', `Total Users is a number (${statsData.stats?.totalUsers})`);
    assert(typeof statsData.stats.totalQuizzes === 'number', `Total Quizzes is a number (${statsData.stats?.totalQuizzes})`);

    // 4. Test Forgot Password Error Handling (User Not Found)
    console.log("\n📧 Testing Forgot Password Error Handling...");
    const forgotRes = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nonexistent@example.com' })
    });
    const forgotData = await forgotRes.json();
    console.log("Forgot Password Response:", forgotData);
    assert(!forgotData.success && forgotData.message.includes('រកមិនឃើញ'), "Properly rejects non-existent email for password reset");

    // 5. Test License Activation (HWID) Validation
    console.log("\n🛡️ Testing License HWID Activation...");
    const hwidRes = await fetch(`${BASE_URL}/api/license/activate-hwid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licenseKey: 'INVALID_KEY', email: 'baureykem@gmail.com' })
    });
    const hwidData = await hwidRes.json();
    console.log("HWID Activation Response:", hwidData);
    assert(!hwidData.success, "Correctly rejects invalid HWID license keys");

    // Summary
    console.log("\n=================================");
    console.log(`🏁 TEST SUMMARY: ${passed} Passed | ${failed} Failed`);
    console.log("=================================\n");
    
    if (failed === 0) {
      console.log("🎉 All critical API flows are solid!");
    }

  } catch (err) {
    console.error("Test script crashed:", err);
  }
}

runTests();
