import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

export async function seedDatabase(prismaClient: PrismaClient, cleanExisting: boolean = true) {
  console.log('🌱 Seeding Smart Gate Pass & Leave Management System database...');

  if (cleanExisting) {
    // 1. Clean existing records in safe dependency order
    await prismaClient.auditLog.deleteMany();
    await prismaClient.notification.deleteMany();
    await prismaClient.gateLog.deleteMany();
    await prismaClient.gatePass.deleteMany();
    await prismaClient.approval.deleteMany();
    await prismaClient.exitRequest.deleteMany();
    await prismaClient.leaveRequest.deleteMany();
    await prismaClient.leaveBalance.deleteMany();
    await prismaClient.attendance.deleteMany();
    await prismaClient.leaveType.deleteMany();
    await prismaClient.employee.deleteMany();
    await prismaClient.department.deleteMany();
    await prismaClient.user.deleteMany();
  }

  const defaultPasswordHash = await bcrypt.hash('Password123!', 10);

  // 2. Create Departments
  const deptEngineering = await prismaClient.department.upsert({
    where: { code: 'ENG-IT' },
    update: {},
    create: { name: 'Engineering & IT', code: 'ENG-IT' }
  });
  const deptHR = await prismaClient.department.upsert({
    where: { code: 'HR-DEPT' },
    update: {},
    create: { name: 'Human Resources', code: 'HR-DEPT' }
  });
  const deptOperations = await prismaClient.department.upsert({
    where: { code: 'OPS-LOG' },
    update: {},
    create: { name: 'Operations & Logistics', code: 'OPS-LOG' }
  });
  const deptSecurity = await prismaClient.department.upsert({
    where: { code: 'SEC-FAC' },
    update: {},
    create: { name: 'Security & Facilities', code: 'SEC-FAC' }
  });
  const deptFinance = await prismaClient.department.upsert({
    where: { code: 'FIN-ACC' },
    update: {},
    create: { name: 'Finance & Accounts', code: 'FIN-ACC' }
  });

  // 3. Create Leave Types
  const leaveCL = await prismaClient.leaveType.upsert({
    where: { code: 'CL' },
    update: {},
    create: {
      name: 'Casual Leave',
      code: 'CL',
      defaultDaysPerYear: 12,
      requiresHrApproval: false,
      color: '#3B82F6'
    }
  });
  const leaveSL = await prismaClient.leaveType.upsert({
    where: { code: 'SL' },
    update: {},
    create: {
      name: 'Sick Leave',
      code: 'SL',
      defaultDaysPerYear: 10,
      requiresHrApproval: false,
      color: '#10B981'
    }
  });
  const leavePL = await prismaClient.leaveType.upsert({
    where: { code: 'PL' },
    update: {},
    create: {
      name: 'Privilege / Earned Leave',
      code: 'PL',
      defaultDaysPerYear: 18,
      requiresHrApproval: true,
      color: '#8B5CF6'
    }
  });
  const leaveEmergency = await prismaClient.leaveType.upsert({
    where: { code: 'EMG' },
    update: {},
    create: {
      name: 'Emergency Leave',
      code: 'EMG',
      defaultDaysPerYear: 5,
      requiresHrApproval: true,
      color: '#EF4444'
    }
  });

  // 4. Create Users and Employees
  // Super Admin
  const adminUser = await prismaClient.user.create({
    data: {
      email: 'admin@enterprise.com',
      passwordHash: defaultPasswordHash,
      role: 'SUPER_ADMIN',
      isActive: true,
      employee: {
        create: {
          employeeCode: 'EMP1001',
          firstName: 'Alexander',
          lastName: 'Wright',
          departmentId: deptEngineering.id,
          designation: 'VP of Technology & Admin',
          phone: '+1 (555) 019-1001',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
        }
      }
    },
    include: { employee: true }
  });

  // HR Manager
  const hrUser = await prismaClient.user.create({
    data: {
      email: 'hr@enterprise.com',
      passwordHash: defaultPasswordHash,
      role: 'HR',
      isActive: true,
      employee: {
        create: {
          employeeCode: 'EMP1002',
          firstName: 'Sarah',
          lastName: 'Jenkins',
          departmentId: deptHR.id,
          designation: 'Senior HR Director',
          phone: '+1 (555) 019-1002',
          avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
        }
      }
    },
    include: { employee: true }
  });

  // Team Manager
  const managerUser = await prismaClient.user.create({
    data: {
      email: 'manager@enterprise.com',
      passwordHash: defaultPasswordHash,
      role: 'MANAGER',
      isActive: true,
      employee: {
        create: {
          employeeCode: 'EMP1003',
          firstName: 'David',
          lastName: 'Chen',
          departmentId: deptEngineering.id,
          designation: 'Engineering Team Lead',
          phone: '+1 (555) 019-1003',
          avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
        }
      }
    },
    include: { employee: true }
  });

  // Update department manager
  await prismaClient.department.update({
    where: { id: deptEngineering.id },
    data: { managerId: managerUser.id }
  });

  // Primary Employee: Om Gaikwad
  const employeeUser = await prismaClient.user.create({
    data: {
      email: 'employee@enterprise.com',
      passwordHash: defaultPasswordHash,
      role: 'EMPLOYEE',
      isActive: true,
      employee: {
        create: {
          employeeCode: 'EMP1024',
          firstName: 'Om',
          lastName: 'Gaikwad',
          departmentId: deptEngineering.id,
          designation: 'Senior Software Engineer',
          phone: '+91 98765 43210',
          avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'
        }
      }
    },
    include: { employee: true }
  });

  // Employee 2: Priya Sharma
  const employeeUser2 = await prismaClient.user.create({
    data: {
      email: 'priya@enterprise.com',
      passwordHash: defaultPasswordHash,
      role: 'EMPLOYEE',
      isActive: true,
      employee: {
        create: {
          employeeCode: 'EMP1025',
          firstName: 'Priya',
          lastName: 'Sharma',
          departmentId: deptEngineering.id,
          designation: 'QA Automation Engineer',
          phone: '+91 98765 43211',
          avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80'
        }
      }
    },
    include: { employee: true }
  });

  // Security Guard
  const securityUser = await prismaClient.user.create({
    data: {
      email: 'security@enterprise.com',
      passwordHash: defaultPasswordHash,
      role: 'SECURITY_GUARD',
      isActive: true,
      employee: {
        create: {
          employeeCode: 'EMP1099',
          firstName: 'Rajesh',
          lastName: 'Kumar',
          departmentId: deptSecurity.id,
          designation: 'Chief Gate Security Officer',
          phone: '+91 98765 43299',
          avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80'
        }
      }
    },
    include: { employee: true }
  });

  // General Manager (GM)
  const gmUser = await prismaClient.user.create({
    data: {
      email: 'gm@enterprise.com',
      passwordHash: defaultPasswordHash,
      role: 'GM',
      isActive: true,
      employee: {
        create: {
          employeeCode: 'EMP1000',
          firstName: 'Vikram',
          lastName: 'Malhotra',
          departmentId: deptEngineering.id,
          designation: 'General Manager (Operations & Strategy)',
          phone: '+91 98765 43000',
          avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80'
        }
      }
    },
    include: { employee: true }
  });

  // Create Authority Connections
  await prismaClient.authorityConnection.create({
    data: {
      userId: employeeUser.id,
      authorityUserId: managerUser.id,
      connectionType: 'REPORTING_MANAGER',
      status: 'ACTIVE',
      startDate: new Date()
    }
  });

  await prismaClient.authorityConnection.create({
    data: {
      userId: employeeUser.id,
      authorityUserId: hrUser.id,
      connectionType: 'HR_AUTHORITY',
      status: 'ACTIVE',
      startDate: new Date()
    }
  });

  await prismaClient.authorityConnection.create({
    data: {
      userId: employeeUser2.id,
      authorityUserId: managerUser.id,
      connectionType: 'REPORTING_MANAGER',
      status: 'ACTIVE',
      startDate: new Date()
    }
  });

  await prismaClient.authorityConnection.create({
    data: {
      userId: managerUser.id,
      authorityUserId: gmUser.id,
      connectionType: 'GM_AUTHORITY',
      status: 'ACTIVE',
      startDate: new Date()
    }
  });

  // 5. Initialize Leave Balances for all employees
  const allEmployees = [
    adminUser.employee!,
    gmUser.employee!,
    hrUser.employee!,
    managerUser.employee!,
    employeeUser.employee!,
    employeeUser2.employee!,
    securityUser.employee!
  ];

  const allLeaveTypes = [leaveCL, leaveSL, leavePL, leaveEmergency];

  for (const emp of allEmployees) {
    for (const lt of allLeaveTypes) {
      await prismaClient.leaveBalance.create({
        data: {
          employeeId: emp.id,
          leaveTypeId: lt.id,
          totalDays: lt.defaultDaysPerYear,
          usedDays: emp.employeeCode === 'EMP1024' ? 2 : 0,
          pendingDays: 0
        }
      });
    }
  }

  // 6. Create Leave Requests for testing
  const pastLeave = await prismaClient.leaveRequest.create({
    data: {
      employeeId: employeeUser.employee!.id,
      leaveTypeId: leaveCL.id,
      fromDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      toDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      totalDays: 2,
      reason: 'Personal family event',
      status: 'APPROVED'
    }
  });

  await prismaClient.approval.create({
    data: {
      requestType: 'LEAVE',
      requestId: pastLeave.id,
      leaveRequestId: pastLeave.id,
      approverId: managerUser.id,
      approverRole: 'MANAGER',
      status: 'APPROVED',
      comments: 'Approved. Enjoy the family time.',
      approvedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
    }
  });

  // Pending Leave Request from Priya
  await prismaClient.leaveRequest.create({
    data: {
      employeeId: employeeUser2.employee!.id,
      leaveTypeId: leaveSL.id,
      fromDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      toDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      totalDays: 1,
      reason: 'Dental appointment & recovery',
      status: 'PENDING_MANAGER'
    }
  });

  // 7. Create Exit Requests & Gate Passes
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const approvedExit = await prismaClient.exitRequest.create({
    data: {
      employeeId: employeeUser.employee!.id,
      exitDate: today,
      exitTime: '14:00',
      expectedReturnTime: '17:00',
      destination: 'Tech Convention Center (Hall B)',
      reason: 'Client Architecture Presentation & Tech Conference',
      description: 'Meeting external partners regarding Q3 system integration blueprint.',
      requiresHrApproval: true,
      status: 'APPROVED'
    }
  });

  await prismaClient.approval.create({
    data: {
      requestType: 'EXIT',
      requestId: approvedExit.id,
      exitRequestId: approvedExit.id,
      approverId: managerUser.id,
      approverRole: 'MANAGER',
      status: 'APPROVED',
      comments: 'Approved. Good luck with the presentation.',
      approvedAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
    }
  });

  await prismaClient.approval.create({
    data: {
      requestType: 'EXIT',
      requestId: approvedExit.id,
      exitRequestId: approvedExit.id,
      approverId: hrUser.id,
      approverRole: 'HR',
      status: 'APPROVED',
      comments: 'HR approved for official client visit.',
      approvedAt: new Date(Date.now() - 1 * 60 * 60 * 1000)
    }
  });

  const passNumber = 'GP-2026-00125';
  const qrPayload = JSON.stringify({
    passNumber,
    employeeCode: 'EMP1024',
    employeeName: 'Om Gaikwad',
    department: 'Engineering & IT',
    date: todayStr,
    exitTime: '14:00',
    expectedReturnTime: '17:00',
    validUntil: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
    status: 'ACTIVE'
  });

  const gatePass = await prismaClient.gatePass.create({
    data: {
      passNumber,
      exitRequestId: approvedExit.id,
      employeeId: employeeUser.employee!.id,
      qrPayload,
      validFrom: new Date(Date.now() - 1 * 60 * 60 * 1000),
      validUntil: new Date(Date.now() + 8 * 60 * 60 * 1000),
      status: 'ACTIVE'
    }
  });

  // Create initial GateLog entry
  await prismaClient.gateLog.create({
    data: {
      gatePassId: gatePass.id,
      employeeId: employeeUser.employee!.id,
      approvedExitTime: new Date(Date.now() - 1 * 60 * 60 * 1000),
      expectedReturnTime: new Date(Date.now() + 4 * 60 * 60 * 1000),
      exitStatus: 'PENDING',
      returnStatus: 'PENDING'
    }
  });

  // Pending Exit Request from Priya for Manager Review
  await prismaClient.exitRequest.create({
    data: {
      employeeId: employeeUser2.employee!.id,
      exitDate: today,
      exitTime: '15:30',
      expectedReturnTime: '16:45',
      destination: 'City Health Clinic',
      reason: 'Routine Medical Checkup',
      description: 'Scheduled medical follow-up test.',
      requiresHrApproval: false,
      status: 'PENDING_MANAGER'
    }
  });

  // 8. Create Attendance Records
  for (const emp of allEmployees) {
    await prismaClient.attendance.create({
      data: {
        employeeId: emp.id,
        date: today,
        checkInTime: new Date(Date.now() - 5 * 60 * 60 * 1000),
        status: 'PRESENT',
        notes: 'Punctual biometric check-in'
      }
    });
  }

  // 9. Create Notifications
  await prismaClient.notification.create({
    data: {
      userId: employeeUser.id,
      title: 'Gate Pass Issued',
      message: `Your Digital Gate Pass ${passNumber} is ready for QR scanning at security gate.`,
      type: 'GATE_PASS_GENERATED',
      read: false,
      metadata: JSON.stringify({ passNumber, gatePassId: gatePass.id })
    }
  });

  await prismaClient.notification.create({
    data: {
      userId: managerUser.id,
      title: 'Pending Exit Permission Request',
      message: 'Priya Sharma (EMP1025) submitted an Exit Request for today at 15:30.',
      type: 'APPROVAL_REQUEST',
      read: false,
      metadata: JSON.stringify({ employeeCode: 'EMP1025' })
    }
  });

  // 10. Audit Log
  await prismaClient.auditLog.create({
    data: {
      userId: adminUser.id,
      userEmail: adminUser.email,
      action: 'SYSTEM_INITIALIZATION',
      entity: 'System',
      entityId: 'SYSTEM-ROOT',
      newValues: JSON.stringify({ message: 'Smart Gate & Leave System seeded successfully with 5 role accounts' }),
      ipAddress: '127.0.0.1',
      userAgent: 'SeedScript/2.0'
    }
  });

  console.log('✅ Database seeded successfully!');
  return {
    departmentsCount: 5,
    leaveTypesCount: 4,
    usersCount: 6,
    activeGatePass: passNumber,
    defaultPassword: 'Password123!'
  };
}
