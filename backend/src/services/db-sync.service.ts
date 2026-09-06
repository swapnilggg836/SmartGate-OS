import { PrismaClient } from '@prisma/client';

export async function syncDatabaseTables(prismaClient: PrismaClient): Promise<{ success: boolean; results: string[] }> {
  const results: string[] = [];

  const tableDefinitions = [
    {
      name: 'ContactSubmission',
      sql: `
        CREATE TABLE IF NOT EXISTS \`ContactSubmission\` (
          \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
          \`name\` VARCHAR(191) NOT NULL,
          \`email\` VARCHAR(191) NOT NULL,
          \`phone\` VARCHAR(50) NULL,
          \`subject\` VARCHAR(255) NOT NULL,
          \`message\` TEXT NOT NULL,
          \`isRead\` BOOLEAN NOT NULL DEFAULT FALSE,
          \`repliedAt\` DATETIME(3) NULL,
          \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          INDEX \`ContactSubmission_isRead_idx\` (\`isRead\`),
          INDEX \`ContactSubmission_createdAt_idx\` (\`createdAt\`)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
      `
    },
    {
      name: 'PasswordResetOtp',
      sql: `
        CREATE TABLE IF NOT EXISTS \`PasswordResetOtp\` (
          \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
          \`email\` VARCHAR(191) NOT NULL,
          \`otp\` VARCHAR(10) NOT NULL,
          \`expiresAt\` DATETIME(3) NOT NULL,
          \`used\` BOOLEAN NOT NULL DEFAULT FALSE,
          \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          INDEX \`PasswordResetOtp_email_idx\` (\`email\`),
          INDEX \`PasswordResetOtp_otp_idx\` (\`otp\`)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
      `
    },
    {
      name: 'Visitor',
      sql: `
        CREATE TABLE IF NOT EXISTS \`Visitor\` (
          \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
          \`fullName\` VARCHAR(200) NOT NULL,
          \`gender\` VARCHAR(30) NULL,
          \`mobile\` VARCHAR(30) NOT NULL,
          \`email\` VARCHAR(191) NULL,
          \`organization\` VARCHAR(200) NULL,
          \`idType\` VARCHAR(50) NULL,
          \`idVerified\` BOOLEAN NOT NULL DEFAULT FALSE,
          \`photoUrl\` LONGTEXT NULL,
          \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
          INDEX \`Visitor_mobile_idx\` (\`mobile\`),
          INDEX \`Visitor_email_idx\` (\`email\`)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
      `
    },
    {
      name: 'VisitorVisit',
      sql: `
        CREATE TABLE IF NOT EXISTS \`VisitorVisit\` (
          \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
          \`visitId\` VARCHAR(50) NOT NULL UNIQUE,
          \`visitorId\` VARCHAR(191) NOT NULL,
          \`hostUserId\` VARCHAR(191) NOT NULL,
          \`departmentId\` VARCHAR(191) NULL,
          \`purpose\` VARCHAR(255) NOT NULL,
          \`description\` TEXT NULL,
          \`visitDate\` DATETIME(3) NOT NULL,
          \`expectedEntryTime\` VARCHAR(10) NOT NULL,
          \`expectedExitTime\` VARCHAR(10) NOT NULL,
          \`numberOfVisitors\` INT NOT NULL DEFAULT 1,
          \`vehicleNumber\` VARCHAR(50) NULL,
          \`vehicleType\` VARCHAR(50) NULL,
          \`photoUrl\` LONGTEXT NULL,
          \`requiresParkingSlot\` BOOLEAN NOT NULL DEFAULT FALSE,
          \`requiresHostApproval\` BOOLEAN NOT NULL DEFAULT TRUE,
          \`requiresHrApproval\` BOOLEAN NOT NULL DEFAULT FALSE,
          \`visitType\` VARCHAR(20) NOT NULL DEFAULT 'WALK_IN',
          \`status\` VARCHAR(50) NOT NULL DEFAULT 'PENDING_HOST',
          \`createdByUserId\` VARCHAR(191) NOT NULL,
          \`rejectionReason\` TEXT NULL,
          \`hostNotes\` TEXT NULL,
          \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
          INDEX \`VisitorVisit_visitId_idx\` (\`visitId\`),
          INDEX \`VisitorVisit_visitorId_idx\` (\`visitorId\`),
          INDEX \`VisitorVisit_hostUserId_idx\` (\`hostUserId\`),
          INDEX \`VisitorVisit_status_idx\` (\`status\`),
          INDEX \`VisitorVisit_visitDate_idx\` (\`visitDate\`),
          INDEX \`VisitorVisit_createdByUserId_idx\` (\`createdByUserId\`)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
      `
    },
    {
      name: 'VisitorGroupMember',
      sql: `
        CREATE TABLE IF NOT EXISTS \`VisitorGroupMember\` (
          \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
          \`visitId\` VARCHAR(191) NOT NULL,
          \`visitorId\` VARCHAR(191) NOT NULL,
          \`status\` VARCHAR(50) NOT NULL DEFAULT 'PENDING',
          \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          INDEX \`VisitorGroupMember_visitId_idx\` (\`visitId\`),
          INDEX \`VisitorGroupMember_visitorId_idx\` (\`visitorId\`)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
      `
    },
    {
      name: 'VisitorPass',
      sql: `
        CREATE TABLE IF NOT EXISTS \`VisitorPass\` (
          \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
          \`passNumber\` VARCHAR(50) NOT NULL UNIQUE,
          \`visitId\` VARCHAR(191) NOT NULL UNIQUE,
          \`qrToken\` VARCHAR(191) NOT NULL UNIQUE,
          \`validFrom\` DATETIME(3) NOT NULL,
          \`validUntil\` DATETIME(3) NOT NULL,
          \`status\` VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
          \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
          INDEX \`VisitorPass_qrToken_idx\` (\`qrToken\`),
          INDEX \`VisitorPass_passNumber_idx\` (\`passNumber\`),
          INDEX \`VisitorPass_status_idx\` (\`status\`)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
      `
    },
    {
      name: 'VisitorCheckIn',
      sql: `
        CREATE TABLE IF NOT EXISTS \`VisitorCheckIn\` (
          \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
          \`visitId\` VARCHAR(191) NOT NULL,
          \`passId\` VARCHAR(191) NULL,
          \`actualEntryTime\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          \`securityUserId\` VARCHAR(191) NOT NULL,
          \`gate\` VARCHAR(100) NULL,
          \`idVerified\` BOOLEAN NOT NULL DEFAULT FALSE,
          \`notes\` TEXT NULL,
          \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          INDEX \`VisitorCheckIn_visitId_idx\` (\`visitId\`),
          INDEX \`VisitorCheckIn_securityUserId_idx\` (\`securityUserId\`)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
      `
    },
    {
      name: 'VisitorCheckOut',
      sql: `
        CREATE TABLE IF NOT EXISTS \`VisitorCheckOut\` (
          \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
          \`visitId\` VARCHAR(191) NOT NULL,
          \`passId\` VARCHAR(191) NULL,
          \`actualExitTime\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          \`securityUserId\` VARCHAR(191) NOT NULL,
          \`gate\` VARCHAR(100) NULL,
          \`notes\` TEXT NULL,
          \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          INDEX \`VisitorCheckOut_visitId_idx\` (\`visitId\`),
          INDEX \`VisitorCheckOut_securityUserId_idx\` (\`securityUserId\`)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
      `
    },
    {
      name: 'VisitorAuditLog',
      sql: `
        CREATE TABLE IF NOT EXISTS \`VisitorAuditLog\` (
          \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
          \`visitId\` VARCHAR(191) NOT NULL,
          \`userId\` VARCHAR(191) NULL,
          \`action\` VARCHAR(100) NOT NULL,
          \`details\` TEXT NULL,
          \`ipAddress\` VARCHAR(100) NULL,
          \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          INDEX \`VisitorAuditLog_visitId_idx\` (\`visitId\`),
          INDEX \`VisitorAuditLog_action_idx\` (\`action\`)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
      `
    },
    {
      name: 'EmployeeStatusHistory',
      sql: `
        CREATE TABLE IF NOT EXISTS \`EmployeeStatusHistory\` (
          \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
          \`employeeId\` VARCHAR(191) NOT NULL,
          \`changeType\` VARCHAR(50) NOT NULL,
          \`oldValue\` TEXT NULL,
          \`newValue\` TEXT NULL,
          \`changedBy\` VARCHAR(191) NULL,
          \`notes\` TEXT NULL,
          \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          INDEX \`EmployeeStatusHistory_employeeId_idx\` (\`employeeId\`),
          INDEX \`EmployeeStatusHistory_changeType_idx\` (\`changeType\`)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
      `
    },
    {
      name: 'AuthorityConnection',
      sql: `
        CREATE TABLE IF NOT EXISTS \`AuthorityConnection\` (
          \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
          \`userId\` VARCHAR(191) NOT NULL,
          \`authorityUserId\` VARCHAR(191) NOT NULL,
          \`connectionType\` VARCHAR(50) NOT NULL,
          \`status\` VARCHAR(50) NOT NULL DEFAULT 'PENDING',
          \`startDate\` DATETIME(3) NULL,
          \`endDate\` DATETIME(3) NULL,
          \`isTemporary\` BOOLEAN NOT NULL DEFAULT FALSE,
          \`reason\` TEXT NULL,
          \`rejectionReason\` TEXT NULL,
          \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
          INDEX \`AuthorityConnection_userId_idx\` (\`userId\`),
          INDEX \`AuthorityConnection_authorityUserId_idx\` (\`authorityUserId\`),
          INDEX \`AuthorityConnection_status_idx\` (\`status\`),
          INDEX \`AuthorityConnection_connectionType_idx\` (\`connectionType\`)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
      `
    },
    {
      name: 'TemporaryDelegation',
      sql: `
        CREATE TABLE IF NOT EXISTS \`TemporaryDelegation\` (
          \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
          \`fromUserId\` VARCHAR(191) NOT NULL,
          \`toUserId\` VARCHAR(191) NOT NULL,
          \`connectionType\` VARCHAR(50) NOT NULL,
          \`startDate\` DATETIME(3) NOT NULL,
          \`endDate\` DATETIME(3) NOT NULL,
          \`reason\` TEXT NULL,
          \`isActive\` BOOLEAN NOT NULL DEFAULT TRUE,
          \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
          INDEX \`TemporaryDelegation_fromUserId_idx\` (\`fromUserId\`),
          INDEX \`TemporaryDelegation_toUserId_idx\` (\`toUserId\`),
          INDEX \`TemporaryDelegation_isActive_idx\` (\`isActive\`)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
      `
    }
  ];

  for (const table of tableDefinitions) {
    try {
      await prismaClient.$executeRawUnsafe(table.sql);
      results.push(`✅ Table ${table.name} verified / created`);
    } catch (err: any) {
      console.warn(`⚠️ Warning syncing table ${table.name}:`, err.message);
      results.push(`⚠️ Table ${table.name} notice: ${err.message}`);
    }
  }

  // Also ensure photoUrl column in Visitor and VisitorVisit is LONGTEXT if table already existed
  try {
    await prismaClient.$executeRawUnsafe(`ALTER TABLE \`Visitor\` MODIFY COLUMN \`photoUrl\` LONGTEXT NULL;`);
    results.push(`✅ Visitor.photoUrl verified LONGTEXT`);
  } catch {}

  try {
    await prismaClient.$executeRawUnsafe(`ALTER TABLE \`VisitorVisit\` MODIFY COLUMN \`photoUrl\` LONGTEXT NULL;`);
    results.push(`✅ VisitorVisit.photoUrl verified LONGTEXT`);
  } catch {}

  return { success: true, results };
}
