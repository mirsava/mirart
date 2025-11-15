import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initializeDatabase() {
  let connection;
  
  try {
    // Connect without database first
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
    });
    
    console.log('Connected to MySQL server');
    
    // Read schema
    const schemaPath = path.join(__dirname, 'schema.sql');
    let schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Remove all comments (both line comments and inline comments)
    schema = schema.split('\n')
      .map(line => {
        // Remove inline comments (-- comment)
        const commentIndex = line.indexOf('--');
        if (commentIndex !== -1) {
          return line.substring(0, commentIndex);
        }
        return line;
      })
      .filter(line => line.trim().length > 0) // Remove empty lines
      .join('\n');
    
    // Split by semicolons, preserving multi-line statements
    const rawStatements = schema.split(';');
    const statements = rawStatements
      .map(stmt => stmt.trim().replace(/\s+/g, ' '))
      .filter(stmt => stmt.length > 0);
    
    console.log(`Found ${statements.length} statements`);
    if (statements.length > 0) {
      console.log('First statement:', statements[0].substring(0, 80));
    }
    
    // First, execute CREATE DATABASE statement only
    let dbCreated = false;
    for (const statement of statements) {
      const upperStatement = statement.toUpperCase();
      if (upperStatement.includes('CREATE DATABASE')) {
        try {
          await connection.query(statement);
          console.log('Created database: mirart');
          dbCreated = true;
          break;
        } catch (err) {
          if (err.code === 'ER_DB_CREATE_EXISTS') {
            console.log('Database already exists');
            dbCreated = true;
          } else {
            throw err;
          }
        }
      }
    }
    
    if (!dbCreated) {
      throw new Error('CREATE DATABASE statement not found in schema');
    }
    
    // Close initial connection and reconnect to the database
    await connection.end();
    
    // Wait a brief moment for database to be fully ready
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const dbName = process.env.DB_NAME || 'mirart';
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: dbName,
    });
    
    console.log(`Connected to database: ${dbName}`);
    
    // Now execute all remaining statements (CREATE TABLE, etc.)
    // Skip CREATE DATABASE and USE statements
    for (const statement of statements) {
      if (!statement.toUpperCase().includes('CREATE DATABASE') && 
          !statement.toUpperCase().includes('USE ')) {
        if (statement) {
          try {
            await connection.query(statement);
          } catch (err) {
            // Ignore "table already exists" errors
            if (err.code !== 'ER_TABLE_EXISTS_ERROR') {
              console.error('Error executing statement:', statement.substring(0, 50));
              throw err;
            }
          }
        }
      }
    }
    
    console.log('Database schema initialized successfully!');
    
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

initializeDatabase();

