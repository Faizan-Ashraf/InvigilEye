const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const dbPath = path.join(__dirname, '../../db/invigleye.db');
const backupPath = path.join(__dirname, '../../db/invigleye_backup.db');

console.log('🔄 Starting database migration...\n');

// Step 1: Backup existing database if it exists
if (fs.existsSync(dbPath)) {
  console.log('📦 Creating backup of existing database...');
  fs.copyFileSync(dbPath, backupPath);
  console.log(`✅ Backup created at: ${backupPath}\n`);
}

// Step 2: Check if we need to add new columns
const runMigration = async () => {
  try {
    let SQL = await initSqlJs();
    let db;
    
    // Load or create database
    if (fs.existsSync(dbPath)) {
      const data = fs.readFileSync(dbPath);
      db = new SQL.Database(data);
    } else {
      db = new SQL.Database();
    }
  
    // Get current table schema
    let existingColumns = [];
    try {
      const stmt = db.prepare("PRAGMA table_info(exams)");
      while (stmt.step()) {
        const row = stmt.getAsObject();
        existingColumns.push(row.name);
      }
      stmt.free();
    } catch (e) {
      // Table might not exist yet
    }
    
    console.log('📊 Current exams table columns:', existingColumns.join(', ') || 'none');
    
    // Check which columns need to be added
    const requiredColumns = {
      'department': 'TEXT',
      'end_time': 'TEXT',
      'section': 'TEXT',
      'invigilator_email': 'TEXT'
    };
    
    let needsMigration = false;
    const missingColumns = [];
    
    for (const [column, type] of Object.entries(requiredColumns)) {
      if (!existingColumns.includes(column)) {
        needsMigration = true;
        missingColumns.push(column);
      }
    }
    
    if (needsMigration) {
      console.log('\n⚠️  Missing columns detected:', missingColumns.join(', '));
      console.log('🔧 Adding missing columns...\n');
      
      // Add missing columns
      for (const [column, type] of Object.entries(requiredColumns)) {
        if (!existingColumns.includes(column)) {
          try {
            db.run(`ALTER TABLE exams ADD COLUMN ${column} ${type}`);
            console.log(`✅ Added column: ${column}`);
          } catch (error) {
            console.error(`❌ Error adding column ${column}:`, error.message);
          }
        }
      }
      
      console.log('\n✅ Migration completed successfully!');
    } else {
      console.log('\n✅ Database schema is up to date. No migration needed.');
    }
    
    // Save database
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
    console.log('✅ Database saved');
    
  } catch (error) {
    console.error('\n❌ Migration error:', error.message);
    console.log('\n💡 If the exams table doesn\'t exist, it will be created when you start the server.');
  }
};

// Run migration
runMigration().then(() => {
  console.log('\n🎉 Migration process finished!');
  console.log('\n📝 Note: If you encounter any issues, restore the backup from:');
  console.log(`   ${backupPath}\n`);
  process.exit(0);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

