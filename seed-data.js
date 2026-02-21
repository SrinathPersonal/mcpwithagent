import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('testdb');
    const users = db.collection('users');

    // Clear existing data
    await users.deleteMany({});

    // Insert sample users
    const sampleUsers = [
        { name: 'John Doe', email: 'john@example.com', age: 30, role: 'admin' },
        { name: 'Jane Smith', email: 'jane@example.com', age: 25, role: 'user' },
        { name: 'Bob Johnson', email: 'bob@example.com', age: 35, role: 'user' },
        { name: 'Alice Williams', email: 'alice@example.com', age: 28, role: 'moderator' }
    ];

    const result = await users.insertMany(sampleUsers);
    console.log(`✓ Inserted ${result.insertedCount} users`);

    // Verify
    const count = await users.countDocuments();
    console.log(`✓ Total users in database: ${count}`);

    await client.close();
    console.log('✓ Done!');
} catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
}
