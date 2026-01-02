const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const os = require('os');

let db = null;
let SQL = null;

// Determine database path based on environment
let dbPath;
const isDev = process.env.NODE_ENV === 'development';
const dbPathEnv = process.env.DB_PATH; // Will be passed from main process

if (dbPathEnv) {
  // Use path provided by main process (production)
  dbPath = dbPathEnv;
  console.log(' Using provided DB path:', dbPath);
} else if (!isDev) {
  // Fallback for production if env var not set
  const userDataPath = process.platform === 'win32'
    ? path.join(process.env.APPDATA || os.homedir(), 'InvigilEye')
    : path.join(os.homedir(), 'Library', 'Application Support', 'InvigilEye');
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }
  
  dbPath = path.join(userDataPath, 'invigleye.db');
  console.log('Production DB path:', dbPath);
} else {
  // In development, use local db folder
  const devDbPath = path.join(__dirname, '../../db');
  if (!fs.existsSync(devDbPath)) {
    fs.mkdirSync(devDbPath, { recursive: true });
  }
  dbPath = path.join(devDbPath, 'invigleye.db');
  console.log(' Development DB path:', dbPath);
}

// Initialize SQL.js and load/create database
const initDb = async () => {
  if (!SQL) {
    SQL = await initSqlJs();
  }

  // Try to load existing database
  let data;
  try {
    if (fs.existsSync(dbPath)) {
      data = fs.readFileSync(dbPath);
      db = new SQL.Database(data);
      console.log(' Loaded existing database from:', dbPath);
    } else {
      db = new SQL.Database();
      console.log('Created new database');
    }
  } catch (err) {
    console.error('Error loading database:', err);
    db = new SQL.Database();
  }

  return db;
};

// Save database to file
const saveDb = () => {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
    console.log(' Database saved to:', dbPath);
  }
};

// Wrapper class to mimic better-sqlite3 behavior
class DbWrapper {
  exec(sql) {
    try {
      db.run(sql);
      saveDb();
    } catch (err) {
      console.error('SQL Error:', err, 'SQL:', sql);
      throw err;
    }
  }

  // Transaction helpers: begin/commit/rollback without forcing a save on begin/rollback
  beginTransaction() {
    try {
      db.run('BEGIN');
    } catch (err) {
      console.error('Begin transaction error:', err);
      throw err;
    }
  }

  commit() {
    try {
      db.run('COMMIT');
      saveDb();
    } catch (err) {
      console.error('Commit transaction error:', err);
      throw err;
    }
  }

  rollback() {
    try {
      db.run('ROLLBACK');
    } catch (err) {
      console.error('Rollback transaction error:', err);
      throw err;
    }
  }

  prepare(sql) {
    return {
      run: (...params) => {
        try {
          db.run(sql, params);

          // Attempt to read last insert id (if an INSERT was run). This mirrors better-sqlite3 behavior
          let lastInsertRowid = null;
          try {
            const res = db.exec("SELECT last_insert_rowid() AS id;");
            if (res && res[0] && res[0].values && res[0].values[0]) {
              lastInsertRowid = res[0].values[0][0];
            }
          } catch (e) {
            // ignore if not applicable
          }

          // Do not save on every row during a transaction; caller should commit when ready
          saveDb();
          return { changes: 1, lastInsertRowid };
        } catch (err) {
          console.error('Prepare Error:', err, 'SQL:', sql, 'Params:', params);
          throw err;
        }
      },
      all: (...params) => {
        try {
          const stmt = db.prepare(sql);
          stmt.bind(params);
          const results = [];
          while (stmt.step()) {
            results.push(stmt.getAsObject());
          }
          stmt.free();
          return results;
        } catch (err) {
          console.error('All Error:', err, 'SQL:', sql, 'Params:', params);
          return [];
        }
      },
      get: (...params) => {
        try {
          const stmt = db.prepare(sql);
          stmt.bind(params);
          let result = null;
          if (stmt.step()) {
            result = stmt.getAsObject();
          }
          stmt.free();
          return result;
        } catch (err) {
          console.error('Get Error:', err, 'SQL:', sql, 'Params:', params);
          return null;
        }
      }
    };
  }
}

const dbWrapper = new DbWrapper();

const init = async () => {
  // Initialize database first
  await initDb();

  // Execute all table creation and initial data as a transaction
  dbWrapper.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      full_name TEXT,
      email TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS exams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      department TEXT,
      venue TEXT NOT NULL,
      exam_date TEXT NOT NULL,
      exam_time TEXT NOT NULL,
      end_time TEXT,
      section TEXT,
      invigilator_email TEXT,
      status TEXT DEFAULT 'scheduled',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_id INTEGER,
      roll_number TEXT NOT NULL,
      name TEXT NOT NULL,
      image_url TEXT,
      FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_id INTEGER NOT NULL,
      roll_number TEXT NOT NULL,
      name TEXT NOT NULL,
      image_url TEXT,
      status TEXT DEFAULT 'absent',
      snapshot_url TEXT,
      marked_at DATETIME,
      FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_id INTEGER,
      type TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved_at DATETIME,
      FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_id INTEGER,
      student_id TEXT,
      exam_title TEXT,
      type TEXT NOT NULL,
      description TEXT,
      severity TEXT DEFAULT 'medium',
      snapshot_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      acknowledged BOOLEAN DEFAULT 0,
      FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_id INTEGER,
      file_path TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
    );
  `);

  // Insert default users
  const insertUsers = dbWrapper.prepare(`
    INSERT OR IGNORE INTO users (id, username, password, role, full_name, email) 
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertUsers.run(1, 'admin', 'admin123', 'admin', 'Admin User', 'admin@invigleye.com');
  insertUsers.run(2, 'invigilator', 'invig123', 'invigilator', 'John Doe', 'john@invigleye.com');
  insertUsers.run(3, 'invigilator2', 'invig123', 'invigilator', 'Jane Smith', 'jane@invigleye.com');

  console.log(' Database initialized successfully');
};

module.exports = { db: dbWrapper, init };
