import bcrypt from 'bcrypt';
import { dbRun, dbGet } from '../config/db.js';

const fixLogin = async () => {
    try {
        console.log('🔧 Starting Login Fix...');

        const username = 'admin';
        const password = 'admin123';
        const email = 'admin@wanistream.local';

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Check if user exists
        const user = await dbGet('SELECT * FROM users WHERE username = ?', [username]);

        if (user) {
            console.log(`👤 User '${username}' found. Resetting password...`);
            await dbRun('UPDATE users SET password = ? WHERE username = ?', [hashedPassword, username]);
            console.log('✅ Password updated successfully.');
        } else {
            console.log(`👤 User '${username}' NOT found. Creating new account...`);
            await dbRun(
                'INSERT INTO users (username, password, email) VALUES (?, ?, ?)',
                [username, hashedPassword, email]
            );
            console.log('✅ New admin account created successfully.');
        }

        console.log('\n🎉 LOGIN FIXED!');
        console.log('=============================');
        console.log(`👉 Username: ${username}`);
        console.log(`👉 Password: ${password}`);
        console.log('=============================');

    } catch (error) {
        console.error('❌ Error fixing login:', error);
    }
};

fixLogin();
