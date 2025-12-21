import { dbAll } from '../config/db.js';

const check = async () => {
    try {
        const videos = await dbAll('SELECT id, name, thumbnail_path FROM videos LIMIT 3');
        console.log('Videos in database:');
        console.table(videos);
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

check();
