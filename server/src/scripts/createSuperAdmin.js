import bcrypt from 'bcrypt';
import { dbRun } from '../config/db.js';

const createSuperAdmin = async () => {
    try {
        const username = 'superadmin';
        const password = 'password123';
        const hashedPassword = await bcrypt.hash(password, 10);
        const email = 'superadmin@example.com';

        await dbRun(
            'INSERT INTO users (username, password, email) VALUES (?, ?, ?)',
            [username, hashedPassword, email]
        );

        console.log(`User '${username}' created with password '${password}'`);
    } catch (error) {
        console.error('Error creating superadmin:', error);
    }
};

createSuperAdmin();
