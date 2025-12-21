import bcrypt from 'bcrypt';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Hardcoded path to ensure we hit the right DB
const DB_PATH = path.join(__dirname, '../../database/wanistream.db');

console.log(`Target Database: ${DB_PATH}`);

const db = new sqlite3.Database(DB_PATH);

const runQuery = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
};

const getQuery = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

const emergencyReset = async () => {
    try {
        const username = 'admin';
        const password = 'admin123';
        const hashedPassword = await bcrypt.hash(password, 10);

        // Check if user exists
        const user = await getQuery('SELECT * FROM users WHERE username = ?', [username]);

        if (user) {
            console.log(`User ${username} found. Updating password...`);
            await runQuery('UPDATE users SET password = ? WHERE username = ?', [hashedPassword, username]);
        } else {
            console.log(`User ${username} not found. Creating...`);
            await runQuery(
                'INSERT INTO users (username, password, email) VALUES (?, ?, ?)',
                [username, hashedPassword, 'admin@wanistream.local']
            );
        }

        console.log('SUCCESS: Password reset to "admin123"');

    } catch (error) {
        console.error('FAILED:', error);
    } finally {
        db.close();
    }
};

emergencyReset();
