import { dbAll } from '../config/db.js';

const checkStreams = async () => {
    try {
        const streams = await dbAll('SELECT * FROM streams ORDER BY id DESC LIMIT 5');
        console.log('Recent streams:');
        console.table(streams);
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkStreams();
