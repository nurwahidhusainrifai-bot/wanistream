import bcrypt from 'bcrypt';
import { dbRun, dbGet } from '../config/db.js';

const createDefaultAdmin = async () => {
    try {
        console.log('Creating default admin account...');

        // Check if admin exists
        const existing = await dbGet('SELECT id FROM users WHERE username = ?', ['admin']);
        if (existing) {
            console.log('Admin account already exists');
            process.exit(0);
        }

        // Create admin with password "admin123"
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await dbRun(
            'INSERT INTO users (username, password, email) VALUES (?, ?, ?)',
            ['admin', hashedPassword, 'admin@wanistream.local']
        );

        console.log('✅ Admin account created!');
        console.log('Username: admin');
        console.log('Password: admin123');

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

createDefaultAdmin();
