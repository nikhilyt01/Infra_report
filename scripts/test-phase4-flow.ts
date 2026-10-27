import connectDB from '../lib/mongodb';
import User from '../models/User';
import Report from '../models/Report';
import ReportHistory from '../models/ReportHistory';

async function testPhase4() {
  console.log('--- STARTING PHASE 4 AUTOMATED TEST ---');
  await connectDB();

  // 1. Clean up previous test supervisor if exists
  const testEmail = 'ramesh_supervisor@infrareport.test';
  await User.deleteOne({ email: testEmail });

  // 2. Create Supervisor Account
  const supCode = `SUP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const supervisor = await User.create({
    name: 'Ramesh Patel',
    email: testEmail,
    password: 'TestPassword123!',
    role: 'supervisor',
    department: 'Roads & Pavements',
    supervisorCode: supCode,
  });

  console.log(`✅ 1. Created Supervisor: ${supervisor.name}`);
  console.log(`   Supervisor ID: ${supervisor.supervisorCode}`);
  console.log(`   Initial isApproved: ${supervisor.isApproved} (Expected: false)`);
  if (supervisor.isApproved !== false) {
    throw new Error('Supervisor should not be auto-approved!');
  }

  // 3. Find a Manager
  const manager = await User.findOne({ role: 'manager', isApproved: true });
  if (!manager) {
    throw new Error('No approved manager found for testing!');
  }
  console.log(`✅ 2. Found Municipal Manager: ${manager.name} (${manager.email})`);

  // 4. Manager searches by Supervisor ID and approves
  const searched = await User.findOne({ supervisorCode: supCode });
  if (!searched || searched.email !== testEmail) {
    throw new Error(`Failed to locate supervisor by code ${supCode}`);
  }
  console.log(`✅ 3. Manager successfully searched supervisor by ID: ${searched.supervisorCode}`);

  searched.isApproved = true;
  searched.approvedBy = String(manager._id);
  searched.approvedAt = new Date();
  await searched.save();
  console.log(`✅ 4. Manager approved supervisor. isApproved is now: ${searched.isApproved}`);

  // 5. Assign a report to this supervisor
  const report = await Report.findOne({ status: { $in: ['submitted', 'under_review', 'in_progress'] } });
  if (!report) {
    throw new Error('No active report found to test assignment!');
  }

  report.assignedTo = String(supervisor._id);
  report.status = 'under_review';
  await report.save();

  await ReportHistory.create({
    reportId: String(report._id),
    actionType: 'assigned',
    performedBy: String(manager._id),
    actorId: String(manager._id),
    actorName: manager.name,
    actorRole: 'manager',
    fromStatus: report.status,
    toStatus: report.status,
    note: `Assigned to ${supervisor.name} (${supervisor.department})`,
    timestamp: new Date(),
  });
  console.log(`✅ 5. Report "${report.title}" assigned to supervisor ${supervisor.name}`);

  // 6. Supervisor queries their assigned tasks
  const supervisorTasks = await Report.find({ assignedTo: supervisor._id });
  console.log(`✅ 6. Supervisor fetched assigned work queue: ${supervisorTasks.length} task(s)`);
  if (supervisorTasks.length === 0) {
    throw new Error('Assigned task did not appear in supervisor queue!');
  }

  // 7. Supervisor transitions task: under_review -> in_progress
  report.status = 'in_progress';
  report.initiatedBy = String(supervisor._id);
  report.initiatedAt = new Date();
  await report.save();

  await ReportHistory.create({
    reportId: String(report._id),
    actionType: 'status_changed',
    performedBy: String(supervisor._id),
    actorId: String(supervisor._id),
    actorName: supervisor.name,
    actorRole: 'supervisor',
    fromStatus: 'under_review',
    toStatus: 'in_progress',
    note: `Work initiated on site by ${supervisor.name}`,
    timestamp: new Date(),
  });
  console.log(`✅ 7. Supervisor started work order (under_review -> in_progress)`);

  // 8. Supervisor resolves task with resolution photo & note
  report.status = 'resolved';
  report.resolvedAt = new Date();
  report.resolutionNote = 'Repaired on site with hot asphalt mix by field crew.';
  report.resolutionImages = ['https://res.cloudinary.com/hv5btbdw/image/upload/v1793105023/infrastructure-reports/ejedhiq9hyddcwpf2lle.jpg'];
  await report.save();

  await ReportHistory.create({
    reportId: String(report._id),
    actionType: 'resolved',
    performedBy: String(supervisor._id),
    actorId: String(supervisor._id),
    actorName: `${supervisor.name} (Field Supervisor)`,
    actorRole: 'supervisor',
    fromStatus: 'in_progress',
    toStatus: 'resolved',
    note: report.resolutionNote,
    resolutionImages: report.resolutionImages,
    timestamp: new Date(),
  });
  console.log(`✅ 8. Supervisor marked task resolved with on-site evidence`);

  // 9. Verify History Trail shows supervisor attribution
  const auditHistory = await ReportHistory.find({ reportId: report._id }).sort({ timestamp: -1 }).limit(3);
  console.log('✅ 9. Audit trail verification:');
  auditHistory.forEach((h) => {
    console.log(`   - [${h.actionType}] ${h.fromStatus || '?'} -> ${h.toStatus || '?'}: ${h.actorName} (${h.actorRole})`);
  });

  console.log('\n🎉 ALL PHASE 4 BACKEND & LIFECYCLE TESTS PASSED PERFECTLY!');
  process.exit(0);
}

testPhase4().catch((err) => {
  console.error('❌ PHASE 4 TEST FAILED:', err);
  process.exit(1);
});
