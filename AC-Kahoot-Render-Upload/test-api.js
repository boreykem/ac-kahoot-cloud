import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = 'http://localhost:3333';
const JWT_SECRET = process.env.JWT_SECRET || 'ac-kahoot-super-secret-key-2026';

async function run() {
  console.log("Generating token...");
  const token = jwt.sign(
    { id: 'owner_master', email: 'baureykem@gmail.com', role: 'superadmin' },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
  
  console.log("Fetching admin users...");
  const usersRes = await fetch(`${BASE_URL}/api/admin/users`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const usersData = await usersRes.json();
  console.log("Admin Users Response:", usersData.success, "Count:", usersData.users ? usersData.users.length : 0);
  
  console.log("Fetching admin stats...");
  const statsRes = await fetch(`${BASE_URL}/api/admin/stats`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const statsData = await statsRes.json();
  console.log("Admin Stats Response:", statsData);
  
  console.log("Fetching admin licenses...");
  const licRes = await fetch(`${BASE_URL}/api/admin/licenses`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const licData = await licRes.json();
  console.log("Admin Lic Response:", Array.isArray(licData) ? licData.length : licData);
  
  process.exit(0);
}

run();
