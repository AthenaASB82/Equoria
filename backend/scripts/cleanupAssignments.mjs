/**
 * Clean up test assignments for fresh testing
 */

import prisma from '../db/index.mjs';

async function cleanupAssignments() {
  try {
    console.log('🧹 Cleaning up test assignments...');

    // Delete all groom assignments
    const deletedAssignments = await prisma.groomAssignment.deleteMany({});
    console.log(`✅ Deleted ${deletedAssignments.count} assignments`);

    // Delete all groom interactions
    const deletedInteractions = await prisma.groomInteraction.deleteMany({});
    console.log(`✅ Deleted ${deletedInteractions.count} interactions`);

    console.log('🎯 Ready for fresh testing!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupAssignments();
