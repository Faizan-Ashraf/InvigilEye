const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

(async () => {
  try {
    const SQL = await initSqlJs();
    const dbPath = path.join(__dirname, '..', 'db', 'invigleye.db');
    if (!fs.existsSync(dbPath)) {
      console.error('Database file not found at', dbPath);
      process.exit(1);
    }
    const data = fs.readFileSync(dbPath);
    const db = new SQL.Database(data);

    console.log('PRAGMA table_info(students):');
    const stmt = db.prepare("PRAGMA table_info(students)");
    while (stmt.step()) {
      console.log(stmt.getAsObject());
    }
    stmt.free();

    console.log('\nSample rows (first 5) from students:');
    const stmt2 = db.prepare('SELECT * FROM students LIMIT 5');
    while (stmt2.step()) {
      console.log(stmt2.getAsObject());
    }
    stmt2.free();

  } catch (err) {
    console.error('Error inspecting DB:', err);
    process.exit(1);
  }
})();
