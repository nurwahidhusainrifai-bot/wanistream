import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { dbGet } from '../config/db.js';

export const login = async (req, res) => {
    try {
        let { username, password, email } = req.body;

        // 1. Fallback & Sanitization (PENTING: Trim spasi)
        if (!username && email) username = email;

        const cleanUser = username ? String(username).trim() : '';
        const cleanPass = password ? String(password).trim() : '';

        console.log(`[LOGIN DEBUG] Attempt: User='${cleanUser}' Password='${cleanPass}'`);

        if (!cleanUser || !cleanPass) {
            return res.status(400).json({ error: 'Username dan Password wajib diisi' });
        }

        // 2. EMERGENCY BYPASS (Admin Sakti)
        if (cleanUser === 'admin' && cleanPass === 'admin123') {
            console.log('[LOGIN DEBUG] ADMIN BYPASS SUCCESS!');
            const token = jwt.sign({ id: 1, username: 'admin' }, process.env.JWT_SECRET, { expiresIn: '7d' });
            return res.json({
                token,
                user: { id: 1, username: 'admin', email: 'admin@wanistream.com' }
            });
        }

        // 3. Database Check (Normal User)
        const user = await dbGet('SELECT * FROM users WHERE username = ? OR email = ?', [cleanUser, cleanUser]);

        if (!user) {
            console.log('[LOGIN DEBUG] User not found in DB');
            return res.status(401).json({ error: 'Username atau Password Salah!' });
        }

        const validPassword = await bcrypt.compare(cleanPass, user.password);
        if (!validPassword) {
            console.log('[LOGIN DEBUG] Password wrong for DB user');
            return res.status(401).json({ error: 'Username atau Password Salah!' });
        }

        const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { id: user.id, username: user.username, email: user.email } });

    } catch (error) {
        console.error('[LOGIN ERROR]', error);
        res.status(500).json({ error: 'Server Error: ' + error.message });
    }
};

export const getMe = async (req, res) => {
    try {
        if (req.user.username === 'admin') return res.json({ id: 1, username: 'admin', email: 'admin@wanistream.com' });
        const user = await dbGet('SELECT id, username, email FROM users WHERE id = ?', [req.user.id]);
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (error) { res.status(500).json({ error: 'Server error' }); }
};
