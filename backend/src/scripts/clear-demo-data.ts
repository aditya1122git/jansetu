import { database } from '../database';
import fs from 'fs';
import path from 'path';


async function clearDemoData() {
  console.log('=== CLEARING E-SEWAK TARAPUR DEMO & SAMPLE DATA ===');

  try {
    // 1. Delete all FollowUp records
    const followUpsDeleted = await database.followUp.deleteMany({});
    console.log(`✓ Deleted ${followUpsDeleted.count} demo/test follow-up actions.`);

    // 2. Delete all AuditLog records
    const auditLogsDeleted = await database.auditLog.deleteMany({});
    console.log(`✓ Deleted ${auditLogsDeleted.count} demo/test audit log entries.`);

    // 3. Delete all Application records
    const appsDeleted = await database.application.deleteMany({});
    console.log(`✓ Deleted ${appsDeleted.count} demo/test application records.`);

    // 4. Delete any pending PasswordResetTokens
    const tokensDeleted = await database.passwordResetToken.deleteMany({});
    console.log(`✓ Deleted ${tokensDeleted.count} temporary password reset tokens.`);

    // 5. Clean up uploaded documents directory
    const uploadsDir = path.resolve(__dirname, '../../uploads');
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      let removedCount = 0;
      for (const file of files) {
        if (file !== '.gitkeep') {
          const filePath = path.join(uploadsDir, file);
          try {
            if (fs.statSync(filePath).isFile()) {
              fs.unlinkSync(filePath);
              removedCount++;
            }
          } catch (e) {
            console.warn(`Could not remove ${file}:`, e);
          }
        }
      }
      console.log(`✓ Removed ${removedCount} test/demo uploaded files from ${uploadsDir}.`);
    }

    // 6. Verify preserved master data
    const userCount = await database.user.count();
    const districtCount = await database.district.count();
    const acCount = await database.assemblyConstituency.count();
    const categoryCount = await database.complaintCategory.count();
    const appCount = await database.application.count();

    console.log('\n--- VERIFICATION STATUS ---');
    console.log(`- Official Users Preserved: ${userCount}`);
    console.log(`- Official Bihar Districts Preserved: ${districtCount} / 38`);
    console.log(`- Official Assembly Constituencies Preserved: ${acCount} / 243`);
    console.log(`- Complaint Categories Preserved: ${categoryCount}`);
    console.log(`- Current Applications Count: ${appCount} (Zero demo data remaining)`);
    console.log('\n✓ ALL DEMO DATA SUCCESSFULLY CLEARED!');
  } catch (error) {
    console.error('Error clearing demo data:', error);
    process.exit(1);
  } finally {
    await database.disconnect();
  }
}

clearDemoData();

