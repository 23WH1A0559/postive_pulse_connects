const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const port = 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Database connection
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Harini#123',
    database: 'connect_pulse'
});

connection.connect(err => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
    } else {
        console.log('Connected to MySQL database.');
    }
});

// Registration endpoint
app.post('/register', (req, res) => {
    const { username, email, password, gender, userType } = req.body;

    const query = 'INSERT INTO users (username, email, password, gender, user_type) VALUES (?, ?, ?, ?, ?)';
    connection.query(query, [username, email, password, gender, userType], (err, results) => {
        if (err) {
            console.error('Error inserting data:', err);
            return res.status(500).send('Error inserting data.');
        } else {
            return res.status(200).send('User registered successfully!');
        }
    });
});

// Login endpoint
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    const query = 'SELECT username, user_type FROM users WHERE email = ? AND password = ?';
    connection.query(query, [email, password], (err, results) => {
        if (err) {
            console.error('Error during login:', err);
            return res.status(500).send('Server error.');
        } else if (results.length === 0) {
            return res.status(401).send('Invalid email or password.');
        } else {
            const { username, user_type } = results[0];
            return res.status(200).send({ message: 'Login successful!', username, user_type });
        }
    });
});

// Profile endpoint (CORRECTED)
app.get('/profile', (req, res) => {
    const email = req.query.email; // Get the email from the query parameter

    if (!email) {
        return res.status(400).send('Email is required.');
    }

    const query = 'SELECT username, email, gender, user_type FROM users WHERE email = ?';
    connection.query(query, [email], (err, results) => {
        if (err) {
            console.error('Error fetching profile data:', err);
            return res.status(500).send('Server error.');
        } else if (results.length === 0) {
            return res.status(404).send('User not found.');
        } else {
            return res.status(200).json(results[0]);
        }
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});