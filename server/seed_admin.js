import bcrypt from 'bcrypt';
import db, { dbRun, dbGet } from './src/config/db.js';

const seedAdmin = async () => {
    try {
        const username = 'admin';
        const password = 'admin123';

        const existing = await dbGet('SELECT id FROM users WHERE username = ?', [username]);
        if (existing) {
            console.log('Admin already exists.');
            db.close();
            return;
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await dbRun(
            'INSERT INTO users (username, password, email) VALUES (?, ?, ?)',
            [username, hashedPassword, 'admin@wanistream.com']
        );

        console.log('✅ Default Admin created: admin / admin123');
        db.close();
    } catch (error) {
        console.error('Error seeding admin:', error);
        process.exit(1);
    }
};

seedAdmin();
