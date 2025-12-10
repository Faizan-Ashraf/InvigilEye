#!/usr/bin/env node

/**
 * PostgreSQL Connection Test Script
 * 
 * This script verifies the database connection and checks the setup.
 * Run with: node backend/database/test-connection.js
 */

require('dotenv').config();
const { Pool } = require('pg');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.cyan}${msg}${colors.reset}`)
};

async function testConnection() {
  log.section('='.repeat(60));
  log.section('PostgreSQL Connection Test for InvigilEye');
  log.section('='.repeat(60));

  // Check environment variables
  log.section('\n1. Checking Environment Variables...');
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'invigleye',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
  };

  log.info(`Database Host: ${config.host}`);
  log.info(`Database Port: ${config.port}`);
  log.info(`Database Name: ${config.database}`);
  log.info(`Database User: ${config.user}`);
  log.info(`Password: ${config.password ? '***' + config.password.slice(-3) : 'NOT SET'}`);

  if (!process.env.DB_PASSWORD) {
    log.warn('DB_PASSWORD not set in .env file!');
  }

  // Create connection pool
  log.section('\n2. Testing Database Connection...');
  const pool = new Pool(config);

  try {
    // Test connection
    const client = await pool.connect();
    log.success('Successfully connected to PostgreSQL!');
    client.release();

    // Check database version
    log.section('\n3. Checking PostgreSQL Version...');
    const versionResult = await pool.query('SELECT version()');
    const version = versionResult.rows[0].version.split(',')[0];
    log.info(version);

    // Check tables
    log.section('\n4. Checking Database Tables...');
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

    if (tablesResult.rows.length === 0) {
      log.warn('No tables found. Run the application to initialize tables.');
    } else {
      log.success(`Found ${tablesResult.rows.length} tables:`);
      tablesResult.rows.forEach(row => {
        log.info(`  • ${row.table_name}`);
      });
    }

    // Check users
    const usersCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      )
    `);

    if (usersCheck.rows[0].exists) {
      log.section('\n5. Checking Default Users...');
      const usersResult = await pool.query('SELECT username, role, full_name FROM users ORDER BY id');
      
      if (usersResult.rows.length === 0) {
        log.warn('No users found. Run the application to create default users.');
      } else {
        log.success(`Found ${usersResult.rows.length} users:`);
        usersResult.rows.forEach(user => {
          log.info(`  • ${user.username} (${user.role}) - ${user.full_name}`);
        });
      }

      // Check exams
      log.section('\n6. Checking Exam Records...');
      const examsResult = await pool.query('SELECT COUNT(*) as count FROM exams');
      const examCount = parseInt(examsResult.rows[0].count);
      
      if (examCount === 0) {
        log.info('No exams found. This is normal for a fresh installation.');
        log.info('You can load sample data with: psql -U postgres -d invigleye -f backend/database/seed.sql');
      } else {
        log.success(`Found ${examCount} exam(s) in the database.`);
      }

      // Check alerts
      log.section('\n7. Checking UMC Reports (Alerts)...');
      const alertsResult = await pool.query('SELECT COUNT(*) as count FROM alerts');
      const alertCount = parseInt(alertsResult.rows[0].count);
      log.info(`Found ${alertCount} UMC report(s).`);

      // Check requests
      log.section('\n8. Checking Requests...');
      const requestsResult = await pool.query('SELECT COUNT(*) as count FROM requests');
      const requestCount = parseInt(requestsResult.rows[0].count);
      log.info(`Found ${requestCount} request(s).`);
    }

    // Connection pool stats
    log.section('\n9. Connection Pool Status...');
    log.info(`Total connections: ${pool.totalCount}`);
    log.info(`Idle connections: ${pool.idleCount}`);
    log.info(`Waiting requests: ${pool.waitingCount}`);

    log.section('\n' + '='.repeat(60));
    log.success('Database connection test completed successfully!');
    log.section('='.repeat(60));
    
    log.info('\nYou can now start the application with:');
    log.info('  npm run dev         (full application)');
    log.info('  npm run backend     (backend only)');
    log.info('\nTo load sample data:');
    log.info('  psql -U postgres -d invigleye -f backend/database/seed.sql');

  } catch (error) {
    log.section('\n' + '='.repeat(60));
    log.error('Database connection test failed!');
    log.section('='.repeat(60));
    
    if (error.code === 'ECONNREFUSED') {
      log.error('\nPostgreSQL is not running or not accessible.');
      log.info('\nTroubleshooting steps:');
      log.info('1. Check if PostgreSQL is running:');
      log.info('   • macOS: brew services list | grep postgresql');
      log.info('   • Linux: sudo systemctl status postgresql');
      log.info('\n2. Start PostgreSQL:');
      log.info('   • macOS: brew services start postgresql@15');
      log.info('   • Linux: sudo systemctl start postgresql');
    } else if (error.code === '3D000') {
      log.error('\nDatabase does not exist.');
      log.info('\nCreate the database with:');
      log.info('  psql -U postgres -c "CREATE DATABASE invigleye;"');
    } else if (error.code === '28P01') {
      log.error('\nAuthentication failed. Check your password.');
      log.info('\nUpdate the DB_PASSWORD in .env file to match your PostgreSQL password.');
    } else {
      log.error(`\nError: ${error.message}`);
      log.error(`Code: ${error.code || 'N/A'}`);
    }

    log.info('\nFor more help, see: POSTGRESQL_SETUP.md');
  } finally {
    await pool.end();
    process.exit(0);
  }
}

// Run the test
testConnection().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});

