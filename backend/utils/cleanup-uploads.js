#!/usr/bin/env node

/**
 * Cleanup Orphaned Upload Files
 * 
 * This script removes old CSV files that weren't properly cleaned up
 * Run with: node backend/utils/cleanup-uploads.js
 */

const fs = require('fs');
const path = require('path');

const uploadsDir = path.join(__dirname, '../uploads');
const logger = require('../logger');

logger.info('🧹 Cleaning up orphaned upload files...\n');

// Check if uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  logger.info('✅ No uploads directory found. Nothing to clean.');
  process.exit(0);
}

// Get all files in uploads directory
const files = fs.readdirSync(uploadsDir);

if (files.length === 0) {
  logger.info('✅ Uploads directory is already clean.');
  process.exit(0);
}

logger.info(`Found ${files.length} file(s) in uploads directory:\n`);

let deletedCount = 0;

files.forEach(file => {
  const filePath = path.join(uploadsDir, file);
  const stats = fs.statSync(filePath);
  
  logger.info(`📄 ${file}`);
  logger.info(`   Size: ${(stats.size / 1024).toFixed(2)} KB`);
  logger.info(`   Created: ${stats.birthtime.toLocaleString()}`);
  
  // Delete the file
  fs.unlinkSync(filePath);
  logger.info(`   ✅ Deleted\n`);
  
  deletedCount++;
});

logger.info(`\n🎉 Cleanup complete! Deleted ${deletedCount} file(s).`);

