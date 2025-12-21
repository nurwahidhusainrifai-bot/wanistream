import bcrypt from 'bcrypt';
import db, { dbRun, dbGet } from '../config/db.js';
import readline from 'readline';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

const createAdmin = async () => {
    try {
        console.log('\n=== Create Admin Account ===\n');

        const username = await question('Username: ');
        if (!username) {
            console.error('Username is required!');
            process.exit(1);
        }

        // Check if username exists
        const existing = await dbGet('SELECT id FROM users WHERE username = ?', [username]);
        if (existing) {
            console.error('Username already exists!');
            process.exit(1);
        }

        const password = await question('Password: ');
        if (!password || password.length < 6) {
            console.error('Password must be at least 6 characters!');
            process.exit(1);
        }

        const email = await question('Email (optional): ');

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert admin
        await dbRun(
            'INSERT INTO users (username, password, email) VALUES (?, ?, ?)',
            [username, hashedPassword, email || null]
        );

        console.log('\n✅ Admin account created successfully!');
        console.log(`Username: ${username}\n`);

        rl.close();
        db.close();
    } catch (error) {
        console.error('Error creating admin:', error);
        process.exit(1);
    }
};

createAdmin();
