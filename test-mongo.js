import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI;

console.log('Testing MongoDB connection...');
console.log('URI:', uri?.replace(/:[^:@]+@/, ':****@')); // Hide password

const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000
});

try {
    await client.connect();
    console.log('✓ Connected successfully!');

    const db = client.db();
    const collections = await db.listCollections().toArray();
    console.log('✓ Available collections:', collections.map(c => c.name));

    await client.close();
    console.log('✓ Connection closed');
} catch (error) {
    console.error('✗ Connection failed:', error.message);
    process.exit(1);
}
