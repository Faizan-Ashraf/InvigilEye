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

console.log('🧹 Cleaning up orphaned upload files...\n');

// Check if uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  console.log('✅ No uploads directory found. Nothing to clean.');
  process.exit(0);
}

// Get all files in uploads directory
const files = fs.readdirSync(uploadsDir);

if (files.length === 0) {
  console.log('✅ Uploads directory is already clean.');
  process.exit(0);
}

console.log(`Found ${files.length} file(s) in uploads directory:\n`);

let deletedCount = 0;

files.forEach(file => {
  const filePath = path.join(uploadsDir, file);
  const stats = fs.statSync(filePath);
  
  console.log(`📄 ${file}`);
  console.log(`   Size: ${(stats.size / 1024).toFixed(2)} KB`);
  console.log(`   Created: ${stats.birthtime.toLocaleString()}`);
  
  // Delete the file
  fs.unlinkSync(filePath);
  console.log(`   ✅ Deleted\n`);
  
  deletedCount++;
});

console.log(`\n🎉 Cleanup complete! Deleted ${deletedCount} file(s).`);

