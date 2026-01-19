const fs = require('fs');
const path = require('path');
const { initializeDatabase } = require('./db');

const DB_PATH = path.join(__dirname, '../music.db');

async function backupAndMigrate() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const bak = DB_PATH + '.bak.' + Date.now();
      fs.copyFileSync(DB_PATH, bak);
      console.log('Backup created at', bak);
    } else {
      console.log('No existing DB file found; creating new DB.');
    }

    await initializeDatabase();
    console.log('Database initialization/migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

backupAndMigrate();