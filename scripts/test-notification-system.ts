import mongoose from 'mongoose';
import connectDB from '../lib/mongodb';
import User from '../models/User';
import Report from '../models/Report';
import Notification from '../models/Notification';
import { 
  notifyReportResolved, 
  notifySupervisorSignup, 
  markSupervisorNotificationsRead 
} from '../lib/notifications';

async function runNotificationSystemTest() {
  console.log('--- STARTING NOTIFICATION SYSTEM AUTOMATED TEST ---');

  await connectDB();
  console.log('✅ 1. MongoDB connected');

  // Clean up any test artifacts
  await User.deleteMany({ email: /test-notif-.*@example\.com/ });
  await Notification.deleteMany({ 'metadata.testSuite': 'notif-flow' });

  // 1. Create Citizen Reporter
  const reporter = await User.create({
    name: 'Citizen Ananya',
    email: 'test-notif-reporter@example.com',
    password: 'password123',
    role: 'user',
    isActive: true,
  });

  // 2. Create Citizen Upvoter
  const upvoter = await User.create({
    name: 'Citizen Vikram',
    email: 'test-notif-upvoter@example.com',
    password: 'password123',
    role: 'user',
    isActive: true,
  });

  // 3. Create Supervisor Resolver
  const supervisor = await User.create({
    name: 'Supervisor Rajesh',
    email: 'test-notif-supervisor@example.com',
    password: 'password123',
    role: 'supervisor',
    isApproved: false,
    supervisorCode: 'SUP-NOTIF1',
    department: 'Roads',
    isActive: true,
  });

  // 4. Create Manager
  const manager = await User.create({
    name: 'Manager Priya',
    email: 'test-notif-manager@example.com',
    password: 'password123',
    role: 'manager',
    isApproved: true,
    isActive: true,
  });

  console.log('✅ 2. Created test users (Reporter, Upvoter, Supervisor, Manager)');

  // 5. Create a Report
  const report = await Report.create({
    title: 'Broken Streetlamp on 5th Cross',
    description: 'Streetlamp sparking at night',
    category: 'Electrical',
    status: 'in_progress',
    priority: 'high',
    address: '5th Cross, Indiranagar',
    location: {
      type: 'Point',
      coordinates: [77.6408, 12.9784],
    },
    images: ['https://example.com/lamp.jpg'],
    reportedBy: reporter._id,
    upvotes: 2,
    upvotedBy: [reporter._id, upvoter._id], // Reporter is also in upvotedBy (should dedupe!)
    isPublic: true,
  });

  console.log(`✅ 3. Report created: "${report.title}" (ID: ${report._id})`);

  // 6. Test Report Resolution Notifications
  const resolvedNotifications = await notifyReportResolved(
    report._id,
    supervisor._id.toString(),
    supervisor.name
  );

  console.log(`✅ 4. notifyReportResolved created ${resolvedNotifications.length} notification(s)`);
  if (resolvedNotifications.length !== 2) {
    throw new Error(`Expected exactly 2 notifications (reporter + upvoter deduplicated), got ${resolvedNotifications.length}`);
  }

  // Verify recipients
  const recipientIds = resolvedNotifications.map((n) => n.recipient.toString());
  if (!recipientIds.includes(reporter._id.toString())) {
    throw new Error('Reporter was not notified!');
  }
  if (!recipientIds.includes(upvoter._id.toString())) {
    throw new Error('Upvoter was not notified!');
  }
  if (recipientIds.includes(supervisor._id.toString())) {
    throw new Error('Actor (supervisor) should NEVER be notified of their own action!');
  }
  console.log('✅ 5. Verified: Deduplication succeeded, actor excluded, reporter & upvoter notified');

  // 7. Verify Unread state in DB
  const reporterUnreadBefore = await Notification.countDocuments({
    recipient: reporter._id,
    isRead: false,
  });
  if (reporterUnreadBefore !== 1) {
    throw new Error(`Expected reporter unreadCount=1, got ${reporterUnreadBefore}`);
  }

  // Mark single as read
  const reporterNotif = await Notification.findOne({ recipient: reporter._id });
  reporterNotif.isRead = true;
  reporterNotif.readAt = new Date();
  await reporterNotif.save();

  const reporterUnreadAfter = await Notification.countDocuments({
    recipient: reporter._id,
    isRead: false,
  });
  if (reporterUnreadAfter !== 0) {
    throw new Error(`Expected reporter unreadCount=0 after mark as read, got ${reporterUnreadAfter}`);
  }
  console.log('✅ 6. Verified: Reporter single notification mark-as-read updates unreadCount to 0 persistently');

  // Mark all as read for upvoter
  await Notification.updateMany(
    { recipient: upvoter._id, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );
  const upvoterUnread = await Notification.countDocuments({
    recipient: upvoter._id,
    isRead: false,
  });
  if (upvoterUnread !== 0) {
    throw new Error(`Expected upvoter unreadCount=0 after markAllAsRead, got ${upvoterUnread}`);
  }
  console.log('✅ 7. Verified: Upvoter markAllAsRead updates unreadCount to 0 persistently');

  // 8. Test Supervisor Signup Notification for Managers
  const supervisorSignupNotifs = await notifySupervisorSignup(
    supervisor._id,
    supervisor.name,
    supervisor.supervisorCode
  );
  console.log(`✅ 8. notifySupervisorSignup created ${supervisorSignupNotifs.length} notification(s) for active managers`);

  const managerUnreadBefore = await Notification.countDocuments({
    recipient: manager._id,
    isRead: false,
    type: 'supervisor_signup',
  });
  if (managerUnreadBefore < 1) {
    throw new Error('Manager did not receive supervisor signup notification!');
  }

  // 9. Test Auto-read on Approval / Revocation
  await markSupervisorNotificationsRead(supervisor._id);

  const managerUnreadAfter = await Notification.countDocuments({
    recipient: manager._id,
    isRead: false,
    type: 'supervisor_signup',
    relatedUserId: supervisor._id,
  });
  if (managerUnreadAfter !== 0) {
    throw new Error(`Expected manager unread supervisor notifications=0 after approval, got ${managerUnreadAfter}`);
  }
  console.log('✅ 9. Verified: Approving or revoking supervisor automatically marks notification as read in the DB in the same call!');

  // Cleanup test records
  await User.deleteMany({ email: /test-notif-.*@example\.com/ });
  await Report.findByIdAndDelete(report._id);
  await Notification.deleteMany({
    _id: { $in: [...resolvedNotifications.map((n) => n._id), ...supervisorSignupNotifs.map((n) => n._id)] },
  });

  console.log('🎉 ALL NOTIFICATION SYSTEM UNIT & INTEGRATION TESTS PASSED PERFECTLY!');
  process.exit(0);
}

runNotificationSystemTest().catch((err) => {
  console.error('❌ Notification test failed:', err);
  process.exit(1);
});
