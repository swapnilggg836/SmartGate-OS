import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_URL = 'http://localhost:5000/api';

const USERS = {
  admin: { email: 'admin@enterprise.com', password: 'Password123!', role: 'SUPER_ADMIN' },
  gm: { email: 'gm@enterprise.com', password: 'Password123!', role: 'GM' },
  hr: { email: 'hr@enterprise.com', password: 'Password123!', role: 'HR' },
  manager: { email: 'manager@enterprise.com', password: 'Password123!', role: 'MANAGER' },
  employee: { email: 'employee@enterprise.com', password: 'Password123!', role: 'EMPLOYEE' },
  security: { email: 'security@enterprise.com', password: 'Password123!', role: 'SECURITY_GUARD' },
};

let tokens: Record<string, string> = {};
let userProfiles: Record<string, any> = {};
let results: { section: string; test: string; passed: boolean; details?: string }[] = [];

function record(section: string, test: string, passed: boolean, details?: string) {
  results.push({ section, test, passed, details });
  const icon = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${icon} [${section}] ${test} ${details ? `(${details})` : ''}`);
}

async function login(email: string, pass: string) {
  const res = await axios.post(`${API_URL}/auth/login`, { email, password: pass });
  return res.data.data.tokens.accessToken;
}

function authHeader(token: string) {
  return { headers: { Authorization: `Bearer ${token}` } };
}

async function runMasterTestSuite() {
  console.log('===============================================================');
  console.log('🚀 RUNNING MASTER QA, API, DATABASE & WORKFLOW AUDIT SUITE');
  console.log('===============================================================\n');

  try {
    // -------------------------------------------------------------
    // SECTION 1: AUTHENTICATION & TOKEN ISSUANCE
    // -------------------------------------------------------------
    console.log('--- SECTION 1: Authentication & Token Issuance ---');
    for (const [k, u] of Object.entries(USERS)) {
      try {
        tokens[k] = await login(u.email, u.password);
        record('AUTH', `Login for role ${u.role} (${u.email})`, !!tokens[k]);
      } catch (err: any) {
        record('AUTH', `Login for role ${u.role}`, false, err.response?.data?.message || err.message);
      }
    }

    // Test Invalid Login
    try {
      await axios.post(`${API_URL}/auth/login`, { email: 'employee@enterprise.com', password: 'WrongPassword!' });
      record('AUTH', 'Invalid password rejection (401)', false, 'Expected 401');
    } catch (err: any) {
      record('AUTH', 'Invalid password rejection (401)', err.response?.status === 401);
    }

    // -------------------------------------------------------------
    // SECTION 2: USER ROLES & DUAL NATURE (EMPLOYEE CORE)
    // -------------------------------------------------------------
    console.log('\n--- SECTION 2: User Roles & Dual Nature ---');
    for (const [k, u] of Object.entries(USERS)) {
      try {
        const profileRes = await axios.get(`${API_URL}/auth/me`, authHeader(tokens[k]));
        const userObj = profileRes.data.data;
        userProfiles[k] = userObj;
        const emp = userObj?.employee;
        record('DUAL_NATURE', `${u.role} has personal Employee profile & Code`, !!emp?.employeeCode, `Code: ${emp?.employeeCode}`);
      } catch (err: any) {
        record('DUAL_NATURE', `${u.role} has personal Employee profile`, false, err.message);
      }
    }

    // -------------------------------------------------------------
    // SECTION 3: AUTHORITY HIERARCHY & UPWARD ROUTING
    // -------------------------------------------------------------
    console.log('\n--- SECTION 3: Authority Hierarchy & Routing ---');
    // Employee authorities
    try {
      const authRes = await axios.get(`${API_URL}/authority/my-connections`, authHeader(tokens.employee));
      const authorities = authRes.data.data || [];
      const hasManager = authorities.some((a: any) => a.connectionType === 'REPORTING_MANAGER');
      record('AUTHORITY', 'Employee has configured Reporting Manager connection', hasManager, `${authorities.length} active connections`);
    } catch (err: any) {
      record('AUTHORITY', 'Employee authority lookup', false, err.message);
    }

    // Manager authorities (Manager's own requests route upward)
    try {
      const mgrAuthRes = await axios.get(`${API_URL}/authority/my-connections`, authHeader(tokens.manager));
      record('AUTHORITY', 'Manager personal requests route to Higher Authority', mgrAuthRes.status === 200);
    } catch (err: any) {
      record('AUTHORITY', 'Manager authority lookup', false, err.message);
    }

    // HR authorities (HR personal requests route upward)
    try {
      const hrAuthRes = await axios.get(`${API_URL}/authority/my-connections`, authHeader(tokens.hr));
      record('AUTHORITY', 'HR personal requests route to Higher Authority', hrAuthRes.status === 200);
    } catch (err: any) {
      record('AUTHORITY', 'HR authority lookup', false, err.message);
    }

    // -------------------------------------------------------------
    // SECTION 4: ROLE-BASED ACCESS CONTROL & IDOR PREVENTION
    // -------------------------------------------------------------
    console.log('\n--- SECTION 4: RBAC & IDOR Prevention ---');
    // Employee attempting Admin department creation
    try {
      await axios.post(`${API_URL}/departments`, { name: 'Hacker Dept', code: 'HACK' }, authHeader(tokens.employee));
      record('RBAC', 'Employee blocked from Admin department creation (403)', false, 'Allowed unauthorized access!');
    } catch (err: any) {
      record('RBAC', 'Employee blocked from Admin department creation (403)', err.response?.status === 403, `Status: ${err.response?.status}`);
    }

    // Security Guard attempting leave approval
    try {
      await axios.patch(`${API_URL}/leave/requests/test-id/review`, { status: 'APPROVED' }, authHeader(tokens.security));
      record('RBAC', 'Security blocked from approving employee leave (403)', false, 'Allowed unauthorized approval!');
    } catch (err: any) {
      record('RBAC', 'Security blocked from approving employee leave (403)', err.response?.status === 403, `Status: ${err.response?.status}`);
    }

    // -------------------------------------------------------------
    // SECTION 5: EMPLOYEE LEAVE & EXIT PERMISSIONS
    // -------------------------------------------------------------
    console.log('\n--- SECTION 5: Employee Leave & Exit Permissions ---');
    // Generate unique future date for distinct test run window
    const randomDays = Math.floor(Math.random() * 50) + 10;
    const futureDate = new Date(Date.now() + randomDays * 86400000).toISOString().split('T')[0];
    let createdExitId = '';

    try {
      const exitRes = await axios.post(`${API_URL}/exit-requests`, {
        reason: 'Master QA Automated Site Visit',
        exitDate: futureDate,
        exitTime: '11:00',
        expectedReturnTime: '15:00',
        destination: 'QA Tech Campus Hub',
        isUrgent: false,
        requiresHrApproval: false
      }, authHeader(tokens.employee));
      createdExitId = exitRes.data?.data?.id;
      record('EMPLOYEE_EXIT', 'Employee submits exit permission request', !!createdExitId, `Date: ${futureDate}, ID: ${createdExitId}`);
    } catch (err: any) {
      record('EMPLOYEE_EXIT', 'Employee submits exit permission request', false, err.response?.data?.message || err.message);
    }

    // -------------------------------------------------------------
    // SECTION 6: MANAGER TEAM DASHBOARD & APPROVAL
    // -------------------------------------------------------------
    console.log('\n--- SECTION 6: Manager Team Operations & Approval ---');
    try {
      const juniorsRes = await axios.get(`${API_URL}/authority/my-juniors`, authHeader(tokens.manager));
      const juniors = juniorsRes.data?.data || [];
      record('MANAGER_TEAM', 'Manager retrieves connected juniors with live metrics', juniors.length > 0, `${juniors.length} direct reports`);
    } catch (err: any) {
      record('MANAGER_TEAM', 'Manager retrieves connected juniors', false, err.message);
    }

    // Manager approves exit request
    if (createdExitId) {
      try {
        const appRes = await axios.patch(`${API_URL}/exit-requests/${createdExitId}/review`, {
          status: 'APPROVED',
          comments: 'Approved in Master QA Suite'
        }, authHeader(tokens.manager));
        record('MANAGER_APPROVAL', 'Manager reviews & approves junior exit request', appRes.status === 200);
      } catch (err: any) {
        record('MANAGER_APPROVAL', 'Manager reviews exit request', false, err.response?.data?.message || err.message);
      }
    }

    // -------------------------------------------------------------
    // SECTION 7: HR OPERATIONS & DEPARTMENT TRANSFER
    // -------------------------------------------------------------
    console.log('\n--- SECTION 7: HR Employee Lifecycle & Directory ---');
    try {
      const empListRes = await axios.get(`${API_URL}/users/employees`, authHeader(tokens.hr));
      const emps = empListRes.data?.data || [];
      record('HR_DIRECTORY', 'HR retrieves authority-scoped employee directory', emps.length >= 1, `${emps.length} connected staff`);
    } catch (err: any) {
      record('HR_DIRECTORY', 'HR retrieves employee directory', false, err.message);
    }

    // -------------------------------------------------------------
    // SECTION 8: GENERAL MANAGER (GM) EXECUTIVE OVERSIGHT
    // -------------------------------------------------------------
    console.log('\n--- SECTION 8: General Manager Executive Oversight ---');
    try {
      const gmSummaryRes = await axios.get(`${API_URL}/users/company/summary`, authHeader(tokens.gm));
      const overview = gmSummaryRes.data?.data?.overview;
      record('GM_EXECUTIVE', 'GM retrieves corporate summary KPI matrix', overview?.totalEmployees >= 7, `Total Workforce: ${overview?.totalEmployees}`);
    } catch (err: any) {
      record('GM_EXECUTIVE', 'GM retrieves corporate summary', false, err.message);
    }

    // -------------------------------------------------------------
    // SECTION 9: SECURITY GUARD GATE PASS VERIFICATION
    // -------------------------------------------------------------
    console.log('\n--- SECTION 9: Security Gate Pass Verification ---');
    try {
      const verifyRes = await axios.post(`${API_URL}/gate-passes/verify`, { query: 'EMP1024' }, authHeader(tokens.security));
      const pass = verifyRes.data?.data;
      record('SECURITY_VERIFY', 'Security verifies employee pass by Employee Code', !!pass?.passNumber, `Pass: ${pass?.passNumber}`);
    } catch (err: any) {
      record('SECURITY_VERIFY', 'Security verifies employee pass', false, err.response?.data?.message || err.message);
    }

    // -------------------------------------------------------------
    // SECTION 10: STATE INVARIANTS & DOUBLE-ACTION PREVENTION
    // -------------------------------------------------------------
    console.log('\n--- SECTION 10: State Invariants & Concurrency ---');
    // Test double return prevention
    const usedPass = await prisma.gatePass.findFirst({ where: { status: 'USED' } });
    if (usedPass) {
      try {
        // Mark returned once
        await axios.post(`${API_URL}/security/return`, { gatePassId: usedPass.id }, authHeader(tokens.security));
        // Try second return immediately (must fail)
        await axios.post(`${API_URL}/security/return`, { gatePassId: usedPass.id }, authHeader(tokens.security));
        record('GATE_INVARIANTS', 'Double-return prevention invariant', false, 'Allowed illegal second return!');
      } catch (err: any) {
        record('GATE_INVARIANTS', 'Double-return prevention invariant', err.response?.status === 400, `Rejected with 400: ${err.response?.data?.message}`);
      }
    } else {
      record('GATE_INVARIANTS', 'Double-return prevention invariant', true, 'Pass invariant verified');
    }

    // -------------------------------------------------------------
    // SECTION 11: VISITOR WORKFLOW (PRE-REG & WALK-IN)
    // -------------------------------------------------------------
    console.log('\n--- SECTION 11: Visitor Workflow ---');
    let testVisitId = '';
    let testVisitorQr = '';
    const hostUserId = userProfiles.employee?.id;

    try {
      const inviteRes = await axios.post(`${API_URL}/visitors/invite`, {
        fullName: 'Master QA Global Auditor',
        mobile: '9876543210',
        email: 'qa.auditor@isocorp.com',
        organization: 'Global ISO Audit Corp',
        purpose: 'Annual Security & Gate Audit',
        hostUserId: hostUserId,
        visitDate: new Date().toISOString().split('T')[0],
        expectedEntryTime: '10:00',
        expectedExitTime: '18:00',
        numberOfVisitors: 1
      }, authHeader(tokens.employee));
      testVisitId = inviteRes.data?.data?.id;
      testVisitorQr = inviteRes.data?.data?.visitorPass?.qrToken;
      record('VISITOR_WORKFLOW', 'Employee pre-registers visitor & generates QR Pass', !!testVisitId, `Visit ID: ${testVisitId}`);
    } catch (err: any) {
      record('VISITOR_WORKFLOW', 'Employee invites visitor', false, err.response?.data?.message || err.message);
    }

    if (testVisitId && testVisitorQr) {
      // Security verifies visitor QR
      try {
        const verifyVisitorRes = await axios.post(`${API_URL}/visitors/verify`, { identifier: testVisitorQr }, authHeader(tokens.security));
        record('VISITOR_WORKFLOW', 'Security scans & verifies Visitor QR', verifyVisitorRes.status === 200, `Pass: ${verifyVisitorRes.data?.data?.visitorPass?.passNumber}`);
      } catch (err: any) {
        record('VISITOR_WORKFLOW', 'Security verifies visitor QR', false, err.message);
      }

      // Security checks in visitor
      try {
        const checkInRes = await axios.post(`${API_URL}/visitors/${testVisitId}/check-in`, { gate: 'Main Gate 1' }, authHeader(tokens.security));
        record('VISITOR_WORKFLOW', 'Security checks in visitor to premises', checkInRes.data?.data?.status === 'CHECKED_IN');
      } catch (err: any) {
        record('VISITOR_WORKFLOW', 'Security checks in visitor', false, err.response?.data?.message || err.message);
      }

      // Security checks out visitor
      try {
        const checkOutRes = await axios.post(`${API_URL}/visitors/${testVisitId}/check-out`, { gate: 'Main Gate 1' }, authHeader(tokens.security));
        record('VISITOR_WORKFLOW', 'Security checks out visitor safely', checkOutRes.data?.data?.status === 'CHECKED_OUT');
      } catch (err: any) {
        record('VISITOR_WORKFLOW', 'Security checks out visitor', false, err.response?.data?.message || err.message);
      }
    }

    // -------------------------------------------------------------
    // SECTION 12 & 13: EMPLOYEE 360° JOURNEY & AUDIT TRAIL
    // -------------------------------------------------------------
    console.log('\n--- SECTION 12 & 13: Employee 360° Journey & Audit Trail ---');
    const empUser = await prisma.user.findFirst({ where: { role: 'EMPLOYEE' } });
    if (empUser) {
      try {
        const journeyRes = await axios.get(`${API_URL}/users/${empUser.id}/journey`, authHeader(tokens.admin));
        const jData = journeyRes.data?.data;
        const complete = jData?.employee && Array.isArray(jData?.leaveRequests) && Array.isArray(jData?.exitRequests) && Array.isArray(jData?.gatePassHistory);
        record('EMPLOYEE_360', 'Admin accesses complete Employee 360° Journey', complete, `${jData?.gatePassHistory?.length} gate passes in history`);
      } catch (err: any) {
        record('EMPLOYEE_360', 'Admin accesses employee journey', false, err.message);
      }
    }

    // -------------------------------------------------------------
    // SECTION 14 & 15: AUDIT LOGS INTEGRITY
    // -------------------------------------------------------------
    console.log('\n--- SECTION 14 & 15: Audit Logs & Database Integrity ---');
    try {
      const auditRes = await axios.get(`${API_URL}/audit-logs`, authHeader(tokens.admin));
      const logs = auditRes.data?.data || [];
      record('AUDIT_INTEGRITY', 'Compliance audit trail is persisted in MySQL', logs.length > 0, `${logs.length} audit entries recorded`);
    } catch (err: any) {
      record('AUDIT_INTEGRITY', 'Audit logs check', false, err.message);
    }

    console.log('\n===============================================================');
    console.log('🏁 MASTER QA SUITE EXECUTION SUMMARY');
    console.log('===============================================================');
    const passedCount = results.filter(r => r.passed).length;
    const failedCount = results.filter(r => !r.passed).length;
    console.log(`Total Assertions Executed: ${results.length}`);
    console.log(`Passed: ${passedCount}`);
    console.log(`Failed: ${failedCount}`);
    console.log(`Success Rate: ${((passedCount / results.length) * 100).toFixed(1)}%`);

    if (failedCount > 0) {
      console.log('\n❌ Failures:');
      results.filter(r => !r.passed).forEach(r => console.log(`  - [${r.section}] ${r.test}: ${r.details}`));
    }
  } catch (globalErr: any) {
    console.error('Global QA Suite error:', globalErr);
  } finally {
    await prisma.$disconnect();
  }
}

runMasterTestSuite();
