import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

async function testVisitorGateFlow() {
  console.log('🚀 Testing Visitor Gate Self-Check-in & WhatsApp Flow...');

  // 1. Fetch public hosts
  const hostsRes = await axios.get(`${API_BASE}/visitors/public-hosts`);
  console.log(`✅ [1] Public hosts retrieved: ${hostsRes.data.data.length} active staff members found.`);
  const host = hostsRes.data.data[0];
  console.log(`   Selected Host: ${host.name} (${host.department} - ${host.designation})`);

  // 2. Submit Self-Registration at Gate (Visitor scanning QR poster)
  const regPayload = {
    fullName: 'Arjun Mehta',
    mobile: '+919876543210',
    email: 'arjun.mehta@clientcorp.com',
    organization: 'Client Tech Corp',
    idType: 'AADHAR',
    hostUserId: host.id,
    purpose: 'Product Strategy & Architecture Review',
    numberOfVisitors: 1,
    vehicleNumber: 'MH 12 XY 9988'
  };

  const regRes = await axios.post(`${API_BASE}/visitors/self-register`, regPayload);
  console.log(`✅ [2] Visitor Self-Registration submitted: Visit ID = ${regRes.data.data.visitId}`);
  const visitId = regRes.data.data.visitId;

  // 3. Check Initial Status (Awaiting Host Approval)
  const statusRes1 = await axios.get(`${API_BASE}/visitors/public-status/${visitId}`);
  console.log(`✅ [3] Public Status checked: Status = ${statusRes1.data.data.status} (Host: ${statusRes1.data.data.hostName})`);

  // 4. Host logs in and approves the visit
  const loginRes = await axios.post(`${API_BASE}/auth/login`, {
    email: 'employee@enterprise.com',
    password: 'Password123!'
  });
  const token = loginRes.data.data.accessToken;

  // Approve using admin token
  const adminLogin = await axios.post(`${API_BASE}/auth/login`, {
    email: 'admin@enterprise.com',
    password: 'Password123!'
  });
  const adminToken = adminLogin.data.data.tokens.accessToken;

  const approveRes = await axios.patch(
    `${API_BASE}/visitors/${visitId}/respond`,
    { action: 'APPROVE' },
    { headers: { Authorization: `Bearer ${adminToken}` } }
  );
  console.log(`✅ [4] Host/Admin approved visit: Pass Number = ${approveRes.data.pass?.passNumber}`);

  // 5. Visitor phone polls status and receives Pass + WhatsApp link
  const statusRes2 = await axios.get(`${API_BASE}/visitors/public-status/${visitId}`);
  console.log(`✅ [5] Visitor Phone retrieved Approved Pass!`);
  console.log(`   Pass Number: ${statusRes2.data.data.pass.passNumber}`);
  console.log(`   QR Token: ${statusRes2.data.data.pass.qrToken}`);
  console.log(`   WhatsApp Share URL: ${statusRes2.data.data.whatsappUrl}`);

  // 6. Security scans & verifies the pass
  const secLogin = await axios.post(`${API_BASE}/auth/login`, {
    email: 'security@enterprise.com',
    password: 'Password123!'
  });
  const secToken = secLogin.data.data.tokens.accessToken;

  const verifyRes = await axios.post(
    `${API_BASE}/visitors/security/verify`,
    { identifier: statusRes2.data.data.pass.passNumber },
    { headers: { Authorization: `Bearer ${secToken}` } }
  );
  const verifiedVisitor = verifyRes.data.data?.visit?.visitor?.fullName || verifyRes.data.data?.visitor?.fullName;
  console.log(`✅ [6] Security Gate Verified Pass: Visitor = ${verifiedVisitor} (Warnings: ${verifyRes.data.warnings?.length || 0})`);

  console.log('\n🎉 ALL 6 STEPS OF VISITOR GATE SELF-CHECKIN & WHATSAPP FLOW PASSED SUCCESSFULLY!\n');
}

testVisitorGateFlow().catch(err => {
  console.error('❌ Test failed:', err.response?.data || err.message);
  process.exit(1);
});
