import { dbGet } from '../config/db.js';

const checkAdmin = async () => {
    try {
        const user = await dbGet('SELECT * FROM users WHERE username = ?', ['admin']);
        if (user) {
            console.log('Admin user found:', {
                id: user.id,
                username: user.username,
                passwordHashPrefix: user.password.substring(0, 10) + '...'
            });
        } else {
            console.log('Admin user NOT found!');
        }
    } catch (error) {
        console.error('Error checking admin:', error);
    }
};

checkAdmin();
