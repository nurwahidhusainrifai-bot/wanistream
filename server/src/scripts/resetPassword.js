import bcrypt from 'bcrypt';
import { dbRun } from '../config/db.js';

const resetAdminPassword = async () => {
    try {
        const username = 'admin';
        const password = 'admin123';
        const hashedPassword = await bcrypt.hash(password, 10);

        await dbRun('UPDATE users SET password = ? WHERE username = ?', [hashedPassword, username]);

        console.log(`Password for user '${username}' has been reset to '${password}'`);
    } catch (error) {
        console.error('Error resetting password:', error);
    }
};

resetAdminPassword();
