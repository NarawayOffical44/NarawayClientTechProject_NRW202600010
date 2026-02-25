const { MongoClient } = require('mongodb');

let db;
let client;

async function connectDB() {
  const url = process.env.MONGO_URL || 'mongodb://localhost:27017';
  const dbName = process.env.DB_NAME || 'test_database';
  client = new MongoClient(url);
  await client.connect();
  db = client.db(dbName);
  console.log(`[MongoDB] Connected to ${dbName}`);
  return db;
}

function getDB() {
  if (!db) throw new Error('Database not initialized. Call connectDB() first.');
  return db;
}

module.exports = { connectDB, getDB };
