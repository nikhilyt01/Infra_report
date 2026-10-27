import { validateStatusTransition, isTerminalStatus } from '../lib/reportLifecycle';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${message}`);
}

console.log('--- Testing Phase 1 Report Lifecycle State Machine ---');

// 1. Pending -> In Progress (note optional)
const t1 = validateStatusTransition('submitted', 'in_progress');
assert(t1.valid === true, 'submitted -> in_progress without note is valid');

const t2 = validateStatusTransition('under_review', 'in_progress', { note: 'Crew assigned' });
assert(t2.valid === true, 'under_review -> in_progress with note is valid');

// 2. In Progress -> Resolved (Requires at least 1 image)
const t3 = validateStatusTransition('in_progress', 'resolved', { resolutionImages: [] });
assert(t3.valid === false && t3.statusCode === 400, 'in_progress -> resolved without image is rejected with 400');

const t4 = validateStatusTransition('in_progress', 'resolved', { resolutionImages: [''] });
assert(t4.valid === false && t4.statusCode === 400, 'in_progress -> resolved with empty image string is rejected with 400');

const t5 = validateStatusTransition('in_progress', 'resolved', { resolutionImages: ['not-a-valid-url'] });
assert(t5.valid === false && t5.statusCode === 400, 'in_progress -> resolved with invalid image URL is rejected with 400');

const t6 = validateStatusTransition('in_progress', 'resolved', {
  resolutionImages: ['https://res.cloudinary.com/demo/image/upload/sample.jpg'],
  note: 'Pothole filled with fresh asphalt',
});
assert(t6.valid === true, 'in_progress -> resolved with valid image URL is permitted');

// 3. Direct transition bypassing in_progress (e.g. submitted -> resolved) must fail
const t7 = validateStatusTransition('submitted', 'resolved', {
  resolutionImages: ['https://res.cloudinary.com/demo/image/upload/sample.jpg'],
});
assert(t7.valid === false && t7.statusCode === 400, 'submitted -> resolved directly is rejected (must be In Progress first)');

// 4. Pending / In Progress -> Rejected (Requires reason text)
const t8 = validateStatusTransition('submitted', 'rejected');
assert(t8.valid === false && t8.statusCode === 400, 'submitted -> rejected without reason is rejected with 400');

const t9 = validateStatusTransition('in_progress', 'rejected', { reason: '   ' });
assert(t9.valid === false && t9.statusCode === 400, 'in_progress -> rejected with whitespace reason is rejected with 400');

const t10 = validateStatusTransition('in_progress', 'rejected', { reason: 'Duplicate report of ticket #1029' });
assert(t10.valid === true, 'in_progress -> rejected with valid reason is permitted');

const t11 = validateStatusTransition('submitted', 'rejected', { note: 'Out of municipal jurisdiction' });
assert(t11.valid === true, 'submitted -> rejected with valid note is permitted');

// 5. Terminal States (resolved, rejected, closed)
assert(isTerminalStatus('resolved') === true, 'resolved is terminal');
assert(isTerminalStatus('rejected') === true, 'rejected is terminal');
assert(isTerminalStatus('closed') === true, 'closed is terminal');
assert(isTerminalStatus('submitted') === false, 'submitted is not terminal');
assert(isTerminalStatus('in_progress') === false, 'in_progress is not terminal');

// Non-admin attempting reopen
const t12 = validateStatusTransition('resolved', 'in_progress', {
  userRole: 'manager',
  reason: 'Pothole has caved in again',
});
assert(t12.valid === false && t12.statusCode === 403, 'non-admin cannot reopen resolved report (returns 403)');

const t13 = validateStatusTransition('rejected', 'in_progress', {
  userRole: 'user',
  reason: 'Citizen appealed',
});
assert(t13.valid === false && t13.statusCode === 403, 'regular user cannot reopen rejected report (returns 403)');

// Admin attempting reopen without reason
const t14 = validateStatusTransition('resolved', 'in_progress', {
  userRole: 'admin',
  reason: '',
});
assert(t14.valid === false && t14.statusCode === 400, 'admin reopening without reason is rejected with 400');

// Admin attempting reopen with reason
const t15 = validateStatusTransition('resolved', 'in_progress', {
  userRole: 'admin',
  reason: 'Quality audit failed, needs repaving',
});
assert(t15.valid === true && t15.isReopen === true, 'admin reopening with reason is permitted (isReopen: true)');

const t16 = validateStatusTransition('rejected', 'under_review', {
  userRole: 'admin',
  reason: 'Citizen provided additional proof',
});
assert(t16.valid === true && t16.isReopen === true, 'admin reopening rejected report with reason is permitted');

// 6. Same status (no change)
const t17 = validateStatusTransition('in_progress', 'in_progress');
assert(t17.valid === true, 'in_progress -> in_progress (no status change) is valid');

console.log('\n🎉 ALL 17 STATE MACHINE LIFECYCLE TESTS PASSED PERFECTLY!');
