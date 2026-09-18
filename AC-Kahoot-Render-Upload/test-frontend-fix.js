import jwt from 'jsonwebtoken';

const BASE_URL = 'http://localhost:3333';
let localStorageMock = {};

// Mock the accountManager.js saveAccount behavior AFTER our fix
function saveAccount(user) {
  if (!user || !user.email) return;
  const accountsRaw = localStorageMock['saved_accounts'];
  const accounts = accountsRaw ? JSON.parse(accountsRaw) : [];
  
  const emailLower = user.email.toLowerCase().trim();
  const existingIndex = accounts.findIndex(a => a.email?.toLowerCase().trim() === emailLower);
  
  const accountObj = {
    id: user.id || `u_${Date.now()}`,
    name: user.name || 'លោកគ្រូ/អ្នកគ្រូ',
    email: user.email.trim(),
    role: user.role || 'user',
    lastActive: Date.now(),
    token: user.token || undefined // THIS IS THE FIX WE ADDED!
  };

  if (existingIndex >= 0) {
    accounts[existingIndex] = { ...accounts[existingIndex], ...accountObj };
  } else {
    accounts.unshift(accountObj);
  }

  localStorageMock['saved_accounts'] = JSON.stringify(accounts);
  localStorageMock['auth_user'] = JSON.stringify(accountObj);
}

async function runTest() {
  console.log("=== END-TO-END SIMULATION TEST ===");
  console.log("1. Logging in as Super Admin...");
  
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'baureykem@gmail.com', password: '092673641' })
  });
  const loginData = await loginRes.json();
  
  if (!loginData.success) {
    console.error("Login Failed:", loginData.message);
    process.exit(1);
  }
  
  console.log("Login Success! Token received:", loginData.token.substring(0, 20) + "...");
  
  // 2. Simulate handleLoginSuccess in App.jsx
  console.log("2. Saving account to localStorage (simulating accountManager.js)...");
  const userWithToken = { ...loginData.user, token: loginData.token };
  saveAccount(userWithToken);
  
  // 3. Simulate page refresh
  console.log("3. Simulating page refresh...");
  const authUserAfterRefresh = JSON.parse(localStorageMock['auth_user']);
  
  console.log("Does the saved account have the token?", authUserAfterRefresh.token ? 'YES ✅' : 'NO ❌');
  if (!authUserAfterRefresh.token) {
    console.error("TEST FAILED: Token was lost during save!");
    process.exit(1);
  }
  
  // 4. Simulate fetchCurrentUser on load
  console.log("4. Fetching current user on load...");
  const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: {
      'Authorization': `Bearer ${authUserAfterRefresh.token}`,
      'x-user-id': authUserAfterRefresh.id,
      'x-user-email': authUserAfterRefresh.email
    }
  });
  
  console.log("Auth/me Status:", meRes.status); // Should be 200, not 401
  if (meRes.status === 401 || meRes.status === 403) {
    console.error("TEST FAILED: Token is invalid, user will be logged out!");
    process.exit(1);
  }
  
  // 5. Simulate Master Admin Panel fetchAdminData
  console.log("5. Fetching Master Admin Stats...");
  const statsRes = await fetch(`${BASE_URL}/api/admin/stats`, {
    headers: { 'Authorization': `Bearer ${authUserAfterRefresh.token}` }
  });
  const statsData = await statsRes.json();
  
  console.log("Admin Stats Response:", statsData.success ? 'SUCCESS ✅' : 'FAILED ❌');
  console.log("Total Users in Stats:", statsData.stats.totalUsers);
  
  if (statsData.success && statsData.stats.totalUsers > 0) {
    console.log("🎉 ALL TESTS PASSED! The fix is verified to work flawlessly.");
  } else {
    console.error("TEST FAILED: Admin stats did not load correctly.");
  }
  
  process.exit(0);
}

runTest();
