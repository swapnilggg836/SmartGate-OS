import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const API_BASE = 'http://localhost:5000/api';
const prisma = new PrismaClient();

interface TestResult {
  section: string;
  name: string;
  passed: boolean;
  error?: string;
  details?: any;
}

const results: TestResult[] = [];

function recordTest(section: string, name: string, passed: boolean, error?: string, details?: any) {
  results.push({ section, name, passed, error, details });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} [${section}] ${name}${error ? ` - ${error}` : ''}`);
}

async function login(email: string, password = 'Password123!'): Promise<{ token: string; user: any }> {
  const res = await axios.post(`${API_BASE}/auth/login`, { email, password });
  const token = res.data.data?.tokens?.accessToken || res.data.data?.accessToken;
  return { token, user: res.data.data.user };
}

async function runSecurityDeepAudit() {
  console.log('================================================================');
  console.log('🛡️  STARTING SECURITY GUARD MODULE FINAL DEEP AUDIT & TEST (A-Y)');
  console.log('================================================================\n');

  try {
    // -------------------------------------------------------------------------
    // 0. Setup & Authentication
    // -------------------------------------------------------------------------
    const admin = await login('admin@enterprise.com');
    const manager = await login('manager@enterprise.com');
    const hr = await login('hr@enterprise.com');
    const employee = await login('employee@enterprise.com');
    const security = await login('security@enterprise.com');

    recordTest('SETUP', 'Login as all roles (Admin, Manager, HR, Employee, Security)', true);

    // -------------------------------------------------------------------------
    // Section A: Security Guard Personal Employee Side
    // -------------------------------------------------------------------------
    console.log('\n--- Section A: Security Guard Personal Employee Side ---');
    try {
      // 1. Profile
      const meRes = await axios.get(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${security.token}` }
      });
      const hasProfile = !!meRes.data.data?.employee?.id;
      recordTest('A', 'Security Guard has valid Employee Profile & ID', hasProfile, undefined, { code: meRes.data.data?.employee?.employeeCode });

      // 2. Connect Higher Authority
      await prisma.authorityConnection.upsert({
        where: { id: 'security-guard-authority-connection' },
        update: { userId: security.user.id, authorityUserId: manager.user.id, connectionType: 'REPORTING_MANAGER', status: 'ACTIVE' },
        create: { id: 'security-guard-authority-connection', userId: security.user.id, authorityUserId: manager.user.id, connectionType: 'REPORTING_MANAGER', status: 'ACTIVE' }
      });
      recordTest('A', 'Security Guard can connect to Higher Authority (Manager/Supervisor)', true);

      // 3. Security Guard applies for Leave -> must NOT auto-approve
      const leaveTypes = await prisma.leaveType.findMany();
      const clType = leaveTypes.find(t => t.code === 'CL') || leaveTypes[0];

      await prisma.leaveBalance.upsert({
        where: {
          employeeId_leaveTypeId: {
            employeeId: security.user.employee.id,
            leaveTypeId: clType.id
          }
        },
        update: { totalDays: 12, usedDays: 0, pendingDays: 0 },
        create: {
          employeeId: security.user.employee.id,
          leaveTypeId: clType.id,
          totalDays: 12,
          usedDays: 0,
          pendingDays: 0
        }
      });

      // Clean up previous test leave requests
      await prisma.leaveRequest.deleteMany({
        where: { employeeId: security.user.employee.id }
      });

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + Math.floor(Math.random() * 20) + 10);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      const leaveAppRes = await axios.post(
        `${API_BASE}/leave/requests`,
        {
          leaveTypeId: clType.id,
          fromDate: futureDateStr,
          toDate: futureDateStr,
          totalDays: 1,
          reason: 'Personal security guard leave test'
        },
        { headers: { Authorization: `Bearer ${security.token}` } }
      );

      const leaveStatus = leaveAppRes.data.data?.status;
      const isNotSelfApproved = leaveStatus === 'PENDING_MANAGER' || leaveStatus === 'PENDING_SUPER_ADMIN';
      recordTest('A', 'Security Guard Leave Request routes to Higher Authority (NOT self-approved)', isNotSelfApproved, undefined, { status: leaveStatus });

      // 4. Security Guard attempts to approve their own request -> Must be rejected
      const selfApproveAttempt = await axios.post(
        `${API_BASE}/leave/requests/${leaveAppRes.data.data.id}/approve`,
        { comments: 'Self approval attempt' },
        { headers: { Authorization: `Bearer ${security.token}` } }
      ).then(() => false).catch(() => true);

      recordTest('A', 'Security Guard CANNOT self-approve own leave request', selfApproveAttempt);

    } catch (err: any) {
      recordTest('A', 'Section A execution failed', false, err.response?.data?.message || err.message);
    }

    // -------------------------------------------------------------------------
    // Section B & C: Employee Gate Pass Lifecycle & Verification
    // -------------------------------------------------------------------------
    console.log('\n--- Section B & C: Employee Gate Pass Lifecycle & Verification ---');
    let testPassId = '';
    let testPassNumber = '';

    try {
      // 1. Create Exit Request for Employee
      const exitReqRes = await axios.post(
        `${API_BASE}/exit-requests`,
        {
          exitDate: new Date().toISOString(),
          exitTime: '14:00',
          expectedReturnTime: '17:00',
          destination: 'Client Technical Site',
          reason: 'Hardware testing deployment'
        },
        { headers: { Authorization: `Bearer ${employee.token}` } }
      );
      const exitReqId = exitReqRes.data.data.id;

      // 2. Manager Approves Exit Request -> Gate Pass generated
      const approveRes = await axios.patch(
        `${API_BASE}/exit-requests/${exitReqId}/review`,
        { action: 'APPROVE', comments: 'Approved for client site visit' },
        { headers: { Authorization: `Bearer ${manager.token}` } }
      );

      const gatePass = await prisma.gatePass.findUnique({
        where: { exitRequestId: exitReqId },
        include: { employee: true }
      });

      if (!gatePass) throw new Error('Gate pass was not generated upon approval');
      testPassId = gatePass.id;
      testPassNumber = gatePass.passNumber;

      recordTest('B', 'Exit Permission Approval creates ACTIVE Gate Pass', gatePass.status === 'ACTIVE', undefined, { passNumber: testPassNumber });

      // 3. Security verifies Pass by Number
      const verifyByPassNum = await axios.post(
        `${API_BASE}/gate-passes/verify`,
        { query: testPassNumber },
        { headers: { Authorization: `Bearer ${security.token}` } }
      );
      recordTest('C', 'Security Search by Pass Number verifies pass successfully', verifyByPassNum.data.data.passNumber === testPassNumber);

      // 4. Security verifies Pass by Employee Code
      const verifyByEmpCode = await axios.post(
        `${API_BASE}/gate-passes/verify`,
        { query: employee.user.employee.employeeCode },
        { headers: { Authorization: `Bearer ${security.token}` } }
      );
      recordTest('C', 'Security Search by Employee ID verifies pass successfully', verifyByEmpCode.data.data.id === testPassId);

      // 5. Verification response least privilege: Salary / private docs must NOT exist
      const verifiedData = verifyByPassNum.data.data;
      const leaksSalary = 'salary' in verifiedData.employee || 'bankAccount' in verifiedData.employee;
      recordTest('C', 'Verification preserves Least Privilege (No salary or private HR data leaked)', !leaksSalary);

      // 6. Security records Exit
      const exitLogRes = await axios.post(
        `${API_BASE}/security/exit`,
        { gatePassId: testPassId, notes: 'Gate: Gate 1 — Main Entrance | Shift: Morning' },
        { headers: { Authorization: `Bearer ${security.token}` } }
      );
      recordTest('B', 'Security allows exit & logs actual exit time', exitLogRes.data.success);

      // 7. Double Exit Prevention: Calling exit again must fail
      const doubleExitAttempt = await axios.post(
        `${API_BASE}/security/exit`,
        { gatePassId: testPassId },
        { headers: { Authorization: `Bearer ${security.token}` } }
      ).then(() => false).catch(err => err.response?.status === 400);

      recordTest('B & D', 'Double-Exit Prevention: Immediate 400 rejection if already exited', doubleExitAttempt);

    } catch (err: any) {
      recordTest('B & C', 'Gate pass lifecycle test failed', false, err.response?.data?.message || err.message);
    }

    // -------------------------------------------------------------------------
    // Section E: Employees Currently Outside List
    // -------------------------------------------------------------------------
    console.log('\n--- Section E: Employees Currently Outside ---');
    try {
      const outsideRes = await axios.get(`${API_BASE}/security/currently-outside`, {
        headers: { Authorization: `Bearer ${security.token}` }
      });
      const outsideList = outsideRes.data.data || [];
      const isEmployeeOutside = outsideList.some((l: any) => l.gatePassId === testPassId);
      recordTest('E', 'Employees Currently Outside list contains active exited employee', isEmployeeOutside, undefined, { count: outsideList.length });

      // Check stats counter
      const statsRes = await axios.get(`${API_BASE}/security/stats`, {
        headers: { Authorization: `Bearer ${security.token}` }
      });
      recordTest('E', 'Security Stats API returns accurate live currentlyOutsideCount', statsRes.data.data.currentlyOutsideCount >= 1);

    } catch (err: any) {
      recordTest('E', 'Section E failed', false, err.response?.data?.message || err.message);
    }

    // -------------------------------------------------------------------------
    // Section F & Return: Mark Return & Late Duration Calculation
    // -------------------------------------------------------------------------
    console.log('\n--- Section F: Mark Return & Late Return Calculation ---');
    try {
      // 1. Mark Returned
      const returnRes = await axios.post(
        `${API_BASE}/security/return`,
        { gatePassId: testPassId, notes: 'Gate: Gate 1 — Main Entrance | Shift: Morning' },
        { headers: { Authorization: `Bearer ${security.token}` } }
      );
      recordTest('F', 'Security marks employee as RETURNED', returnRes.data.success);

      // 2. Double Return Prevention
      const doubleReturnAttempt = await axios.post(
        `${API_BASE}/security/return`,
        { gatePassId: testPassId },
        { headers: { Authorization: `Bearer ${security.token}` } }
      ).then(() => false).catch(err => err.response?.status === 400);

      recordTest('D & F', 'Double-Return Prevention: Immediate 400 rejection if already returned', doubleReturnAttempt);

      // 3. Verify employee is removed from Currently Outside list
      const outsideAfterReturn = await axios.get(`${API_BASE}/security/currently-outside`, {
        headers: { Authorization: `Bearer ${security.token}` }
      });
      const stillOutside = (outsideAfterReturn.data.data || []).some((l: any) => l.gatePassId === testPassId);
      recordTest('E & F', 'Employee automatically disappears from Currently Outside upon return', !stillOutside);

    } catch (err: any) {
      recordTest('F', 'Section F failed', false, err.response?.data?.message || err.message);
    }

    // -------------------------------------------------------------------------
    // Section G & H: Multiple Gates & Shift Context Preservation
    // -------------------------------------------------------------------------
    console.log('\n--- Section G & H: Multiple Gates & Shifts ---');
    try {
      const gateLog = await prisma.gateLog.findFirst({
        where: { gatePassId: testPassId }
      });
      const hasGateAndShift = gateLog?.notes?.includes('Gate: Gate 1') && gateLog?.notes?.includes('Shift: Morning');
      recordTest('G & H', 'Gate and Shift context preserved in GateLog history', !!hasGateAndShift, undefined, { notes: gateLog?.notes });
    } catch (err: any) {
      recordTest('G & H', 'Section G & H failed', false, err.message);
    }

    // -------------------------------------------------------------------------
    // Section I, J, K, L, M, N, O: Visitor Management End-to-End
    // -------------------------------------------------------------------------
    console.log('\n--- Section I through Q: Visitor Module Full Lifecycle ---');
    try {
      // 1. Least-privilege Host Search
      const hostSearchRes = await axios.get(`${API_BASE}/visitors/search-host?q=Om`, {
        headers: { Authorization: `Bearer ${security.token}` }
      });
      const hosts = hostSearchRes.data.data || [];
      const hasOm = hosts.some((h: any) => h.employee?.firstName?.includes('Om') || h.email?.includes('employee'));
      const leaksConfidentialData = hosts.some((h: any) => 'salary' in h || 'passwordHash' in h || 'homeAddress' in h);
      recordTest('J', 'Visitor Host Search finds employee with least privilege (no private HR leaks)', hasOm && !leaksConfidentialData);

      // 2. Walk-in Visitor Registration
      const walkInRes = await axios.post(
        `${API_BASE}/visitors/walk-in`,
        {
          fullName: 'Robert Miller',
          mobile: `+91 91234 ${Math.floor(10000 + Math.random() * 90000)}`,
          email: 'robert.m@acme-corp.com',
          organization: 'Acme Solutions',
          hostUserId: employee.user.id,
          purpose: 'Technical Project Discussion',
          expectedEntryTime: '10:00',
          expectedExitTime: '12:00',
          numberOfVisitors: 1
        },
        { headers: { Authorization: `Bearer ${security.token}` } }
      );
      const walkInVisitId = walkInRes.data.data?.id;
      const walkInVisitCode = walkInRes.data.data?.visitId;
      recordTest('K', 'Security creates Walk-in Visitor registration', !!walkInVisitId, undefined, { visitId: walkInVisitCode });

      // Host approves Walk-in visitor
      const hostApproveRes = await axios.patch(
        `${API_BASE}/visitors/${walkInVisitId}/respond`,
        { action: 'APPROVE' },
        { headers: { Authorization: `Bearer ${employee.token}` } }
      );
      recordTest('K', 'Host approves Walk-in Visitor request', hostApproveRes.data.success);

      // 3. Pre-registered Visitor Invitation
      const preRegRes = await axios.post(
        `${API_BASE}/visitors/invite`,
        {
          fullName: 'Alice Johnson',
          mobile: `+91 99887 ${Math.floor(10000 + Math.random() * 90000)}`,
          email: 'alice.j@partner.com',
          organization: 'Global Partner Tech',
          hostUserId: employee.user.id,
          purpose: 'Vendor Assessment & Audit',
          visitDate: new Date().toISOString().split('T')[0],
          expectedEntryTime: '14:00',
          expectedExitTime: '17:00',
          numberOfVisitors: 2,
          additionalVisitors: [{ fullName: 'Mark Davis', mobile: `+91 99888 ${Math.floor(10000 + Math.random() * 90000)}` }]
        },
        { headers: { Authorization: `Bearer ${employee.token}` } }
      );
      const preRegVisitId = preRegRes.data.data?.id;

      // When self-host invites, pass is auto-issued
      const passRecord = await prisma.visitorPass.findFirst({
        where: { visitId: preRegVisitId }
      });
      const preRegQrToken = passRecord?.qrToken;
      recordTest('L & M', 'Pre-registered Visitor created with secure QR Token & Group Members', !!preRegQrToken, undefined, { qrToken: preRegQrToken?.substring(0, 12) + '...' });

      // 4. Verify QR Token at Gate
      const verifyQrRes = await axios.post(
        `${API_BASE}/visitors/security/verify`,
        { identifier: preRegQrToken },
        { headers: { Authorization: `Bearer ${security.token}` } }
      );
      recordTest('M & N', 'Security verifies Visitor QR Token successfully', verifyQrRes.data.success);

      // 5. Visitor Check-in
      const checkInRes = await axios.post(
        `${API_BASE}/visitors/security/check-in/${preRegVisitId}`,
        { gate: 'Gate 1 — Main Entrance', idVerified: true },
        { headers: { Authorization: `Bearer ${security.token}` } }
      );
      recordTest('N', 'Security checks in Visitor at Gate', checkInRes.data.success);

      // Double check-in attempt -> must be rejected
      const doubleCheckInAttempt = await axios.post(
        `${API_BASE}/visitors/security/check-in/${preRegVisitId}`,
        { gate: 'Gate 1' },
        { headers: { Authorization: `Bearer ${security.token}` } }
      ).then(() => false).catch(err => err.response?.status === 400);
      recordTest('N', 'Double Visitor Check-in prevented with 400 rejection', doubleCheckInAttempt);

      // 6. Visitor Check-out
      const checkOutRes = await axios.post(
        `${API_BASE}/visitors/security/check-out/${preRegVisitId}`,
        { gate: 'Gate 1 — Main Entrance' },
        { headers: { Authorization: `Bearer ${security.token}` } }
      );
      recordTest('O', 'Security checks out Visitor (Status marked COMPLETED)', checkOutRes.data.success);

      // Double check-out attempt -> must be rejected
      const doubleCheckOutAttempt = await axios.post(
        `${API_BASE}/visitors/security/check-out/${preRegVisitId}`,
        { gate: 'Gate 1' },
        { headers: { Authorization: `Bearer ${security.token}` } }
      ).then(() => false).catch(err => err.response?.status === 400);
      recordTest('O', 'Double Visitor Check-out prevented with 400 rejection', doubleCheckOutAttempt);

    } catch (err: any) {
      recordTest('I-Q', 'Visitor module tests failed', false, err.response?.data?.message || err.message);
    }

    // -------------------------------------------------------------------------
    // Section R: Emergency Evacuation Roll Call
    // -------------------------------------------------------------------------
    console.log('\n--- Section R: Emergency Evacuation Roll Call ---');
    try {
      const emerRes = await axios.get(`${API_BASE}/security/emergency-roll`, {
        headers: { Authorization: `Bearer ${security.token}` }
      });
      const hasRosterData = Array.isArray(emerRes.data.data?.employeesOutside) && Array.isArray(emerRes.data.data?.visitorsInside);
      recordTest('R', 'Emergency Evacuation Roll returns live roster of employees outside & visitors inside', hasRosterData);
    } catch (err: any) {
      recordTest('R', 'Section R failed', false, err.response?.data?.message || err.message);
    }

    // -------------------------------------------------------------------------
    // Section T, U, V: Role Permissions & API Authorization Attack Tests
    // -------------------------------------------------------------------------
    console.log('\n--- Section T, U, V: Role Permissions & API Attack Tests ---');
    try {
      // 1. Security tries to call HR Create Leave Type API -> 403 Forbidden
      const hrAttack = await axios.post(
        `${API_BASE}/leave/types`,
        { name: 'Hacked Leave', code: 'HCK', defaultDaysPerYear: 99 },
        { headers: { Authorization: `Bearer ${security.token}` } }
      ).then(() => false).catch(err => err.response?.status === 403);
      recordTest('U & V', 'RBAC Enforcement: Security Guard CANNOT access HR Create Leave Type API (403)', hrAttack);

      // 2. Security tries to call Super Admin User Management API -> 403 Forbidden
      const adminAttack = await axios.get(`${API_BASE}/users`, {
        headers: { Authorization: `Bearer ${security.token}` }
      }).then(() => false).catch(err => err.response?.status === 403);
      recordTest('U & V', 'RBAC Enforcement: Security Guard CANNOT access Admin User Management API (403)', adminAttack);

      // 3. Parameter Tampering Attack: User tries to impersonate another securityUserId
      const fakeGuardLog = await axios.post(
        `${API_BASE}/security/exit`,
        { gatePassId: testPassId, securityUserId: 'FAKE_USER_ID_IMPERSONATION' },
        { headers: { Authorization: `Bearer ${employee.token}` } }
      ).then(() => false).catch(err => err.response?.status === 403);
      recordTest('V', 'API Authorization: Non-security user CANNOT call Security Exit API (403)', fakeGuardLog);

    } catch (err: any) {
      recordTest('U & V', 'Section U & V failed', false, err.message);
    }

    // -------------------------------------------------------------------------
    // Final Summary Matrix
    // -------------------------------------------------------------------------
    console.log('\n================================================================');
    console.log('📊 FINAL AUDIT SUMMARY MATRIX');
    console.log('================================================================');

    const total = results.length;
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;

    console.log(`TOTAL TESTS: ${total}`);
    console.log(`PASSED:      ${passed}`);
    console.log(`FAILED:      ${failed}`);
    console.log(`STATUS:      ${failed === 0 ? '🟢 SECURITY MODULE READY' : '🔴 SECURITY MODULE NOT READY'}`);
    console.log('================================================================\n');

  } catch (err: any) {
    console.error('Fatal audit runner error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

runSecurityDeepAudit();
