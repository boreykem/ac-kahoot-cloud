const http = require('http');

async function testRegistrationFlow() {
  console.log('========================================');
  console.log('🧪 TESTING USER REGISTRATION & AUTH FLOW');
  console.log('========================================\n');

  const testEmail = `test_teacher_${Date.now()}@ac-kahoot.edu`;
  const testPassword = 'SecurePassword123!';
  const testName = 'សាស្ត្រាចារ្យ តេស្ត (Prof. Tester)';

  // 1. Test Valid Registration
  console.log(`1️⃣ Testing New User Registration (${testEmail})...`);
  const regRes = await fetch('http://localhost:3333/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: testName,
      email: testEmail,
      password: testPassword,
      school: 'សាកលវិទ្យាល័យភូមិន្ទភ្នំពេញ (RUPP)',
      avatar: '🎓'
    })
  });
  const regData = await regRes.json();
  console.log('   Registration response:', regData);
  if (regRes.ok && regData.success && regData.user?.email === testEmail) {
    console.log('   ✅ Registration: PASSED\n');
  } else {
    console.log('   ❌ Registration: FAILED\n');
  }

  // 2. Test Duplicate Email Prevention
  console.log(`2️⃣ Testing Duplicate Email Rejection (${testEmail})...`);
  const dupRes = await fetch('http://localhost:3333/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Another Name',
      email: testEmail,
      password: 'SomePassword'
    })
  });
  const dupData = await dupRes.json();
  console.log('   Duplicate response:', dupData);
  if (!dupRes.ok || !dupData.success) {
    console.log('   ✅ Duplicate Email Rejection: PASSED\n');
  } else {
    console.log('   ❌ Duplicate Email Rejection: FAILED (Allowed duplicate)\n');
  }

  // 3. Test Invalid Email Rejection
  console.log(`3️⃣ Testing Invalid Email Format Rejection...`);
  const invRes = await fetch('http://localhost:3333/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Invalid User',
      email: 'not-an-email',
      password: 'password'
    })
  });
  const invData = await invRes.json();
  console.log('   Invalid email response:', invData);
  if (!invRes.ok || !invData.success) {
    console.log('   ✅ Invalid Email Rejection: PASSED\n');
  } else {
    console.log('   ❌ Invalid Email Rejection: FAILED\n');
  }

  // 4. Test Login with Registered Account
  console.log(`4️⃣ Testing Login with Newly Created Account...`);
  const loginRes = await fetch('http://localhost:3333/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword
    })
  });
  const loginData = await loginRes.json();
  console.log('   Login response:', loginData);
  if (loginRes.ok && loginData.success && loginData.user?.name === testName) {
    console.log('   ✅ Login Authentication: PASSED\n');
  } else {
    console.log('   ❌ Login Authentication: FAILED\n');
  }

  // 5. Test Login with Wrong Password
  console.log(`5️⃣ Testing Login with Wrong Password...`);
  const wrongRes = await fetch('http://localhost:3333/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: 'WrongPassword'
    })
  });
  const wrongData = await wrongRes.json();
  console.log('   Wrong password response:', wrongData);
  if (wrongRes.status === 401 && !wrongData.success) {
    console.log('   ✅ Wrong Password Handling: PASSED\n');
  } else {
    console.log('   ❌ Wrong Password Handling: FAILED\n');
  }

  console.log('========================================');
  console.log('🎉 REGISTRATION & AUTH VERIFICATION COMPLETE');
  console.log('========================================');
}

testRegistrationFlow();
