//backend
// 1. IMPORT NECESSARY MODULES
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const http = require('http');
const socketIo = require('socket.io');
const bcrypt = require('bcrypt'); // Import bcrypt for password hashing

const app = express();
const port = 3001;

// 2. CREATE AN HTTP SERVER AND INITIALIZE SOCKET.IO
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "http://127.0.0.1:5500", // IMPORTANT: Adjust if your frontend's Live Server URL is different
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Database connection
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Harini#123', // Double-check this is your correct MySQL root password
    database: 'connect_pulse'
});

connection.connect(err => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
    } else {
        console.log('Connected to MySQL database.');
    }
});

// === HTTP ENDPOINTS ===

// Registration endpoint
app.post('/register', async (req, res) => { // Made async for bcrypt
    const { username, email, password, gender, userType, affiliatedCompany } = req.body;

    if (!username || !email || !password || !gender || !userType) {
        return res.status(400).send('All required fields (username, email, password, gender, userType) must be provided.');
    }

    // Validate affiliatedCompany for 'startup' userType
    if (userType === 'startup' && !affiliatedCompany) {
        return res.status(400).send('Affiliated company is required for startup users.');
    }
    // If not a startup, ensure affiliatedCompany is null
    const finalAffiliatedCompany = userType === 'startup' ? affiliatedCompany : null;

    try {
        // Check if user already exists
        const [existingUsers] = await connection.promise().query('SELECT COUNT(*) AS count FROM users WHERE email = ?', [email]);
        if (existingUsers[0].count > 0) {
            return res.status(409).send('Email already registered. Please log in.');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10); // 10 is the salt rounds

        // Insert user into database
        const query = `INSERT INTO users (username, email, password, gender, user_type, affiliated_company) VALUES (?, ?, ?, ?, ?, ?)`;
        const values = [username, email, hashedPassword, gender, userType, finalAffiliatedCompany];

        await connection.promise().query(query, values);
        res.status(201).send('User registered successfully!');

    } catch (err) {
        console.error('Error during registration:', err);
        res.status(500).send('Server error during registration.');
    }
});

// Login endpoint
app.post('/login', async (req, res) => { // Made async for bcrypt
    const { email, password } = req.body;

    try {
        const [users] = await connection.promise().query('SELECT id, username, email, password, user_type, affiliated_company FROM users WHERE email = ?', [email]);

        if (users.length === 0) {
            return res.status(401).send('Invalid email or password.');
        }

        const user = users[0];
        // Compare provided password with hashed password from DB
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).send('Invalid email or password.');
        }

        // Login successful! Send back necessary user data including email and affiliated_company
        res.status(200).send({
            message: 'Login successful!',
            username: user.username,
            email: user.email, // Include email for frontend storage
            user_type: user.user_type,
            affiliated_company: user.affiliated_company // Include affiliated_company
        });

    } catch (err) {
        console.error('Error during login:', err);
        res.status(500).send('Server error during login.');
    }
});

// Profile endpoint
app.get('/profile', async (req, res) => { // Made async
    const email = req.query.email;

    if (!email) {
        return res.status(400).send('Email is required.');
    }

    try {
        // Corrected query to select affiliated_company
        const [results] = await connection.promise().query('SELECT username, email, gender, user_type, affiliated_company FROM users WHERE email = ?', [email]);

        if (results.length === 0) {
            return res.status(404).send('User not found.');
        }

        res.status(200).json(results[0]);
    } catch (err) {
        console.error('Error fetching profile data:', err);
        res.status(500).send('Server error fetching profile.');
    }
});

// Endpoint to fetch historical messages for a specific company
app.get('/messages/:companyName', async (req, res) => { // Made async
    const { companyName } = req.params;

    try {
        // CORRECTED QUERY: Uses 'sender_email' and 'recipient_company'
        const query = `
            SELECT m.sender_email, m.message_content, m.timestamp, u.username AS sender_username, u.user_type AS sender_user_type
            FROM messages m
            JOIN users u ON m.sender_email = u.email
            WHERE m.recipient_company = ?
            ORDER BY m.timestamp ASC;
        `;
        const [results] = await connection.promise().query(query, [companyName]);
        res.status(200).json(results);
    } catch (err) {
        console.error('Error fetching messages:', err);
        res.status(500).send('Server error fetching messages.');
    }
});


// === SOCKET.IO LOGIC ===

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Store user data on the socket object once identified
    socket.userData = null;

    // NEW: 'setIdentity' event to identify the connected user
    socket.on('setIdentity', ({ email, userType, affiliatedCompany }) => {
        socket.userData = { email, userType, affiliatedCompany };
        console.log(`Socket ${socket.id} identified as: ${email} (${userType}) affiliated with ${affiliatedCompany}`);

        // If it's a startup user, make them join their company's room automatically
        if (userType === 'startup' && affiliatedCompany) {
            socket.join(affiliatedCompany);
            console.log(`Startup user ${email} joined their company room: ${affiliatedCompany}`);
        }
    });

    // 'joinCompanyRoom' event: A client wants to join a specific company's chat room
    socket.on('joinCompanyRoom', (companyName) => {
        // Ensure user is identified before joining a room (optional, but good practice)
        if (!socket.userData) {
            console.warn(`Socket ${socket.id} tried to join room ${companyName} before identification.`);
            return;
        }
        socket.join(companyName);
        console.log(`${socket.userData.email} joined room: ${companyName}`);
    });

    // 'sendMessage' event: A client sends a new message
    socket.on('sendMessage', async (data) => {
        const { company, message, sender_email } = data; // Data from frontend

        if (!socket.userData || socket.userData.email !== sender_email) {
            console.warn(`Unauthorized message attempt from ${sender_email} on socket ${socket.id}`);
            socket.emit('messageError', 'Authentication mismatch for sending message.');
            return;
        }

        try {
            // CORRECTED INSERT query: Uses 'sender_email' and 'recipient_company'
            const insertQuery = 'INSERT INTO messages (sender_email, recipient_company, message_content) VALUES (?, ?, ?)';
            await connection.promise().query(insertQuery, [sender_email, company, message]);
            console.log('Message saved to DB:', data);

            // Fetch sender's username and user_type for broadcast
            const [userResults] = await connection.promise().query('SELECT username, user_type FROM users WHERE email = ?', [sender_email]);
            const senderUsername = userResults[0] ? userResults[0].username : sender_email; // Fallback
            const senderUserType = userResults[0] ? userResults[0].user_type : 'unknown'; // Fallback

            // Broadcast the message to all clients in the specific company room
            io.to(company).emit('newMessage', {
                company: company,
                message: message,
                sender_email: sender_email,
                sender_username: senderUsername, // Include username
                sender_user_type: senderUserType, // Include user type
                timestamp: new Date().toISOString() // Send current time
            });
        } catch (err) {
            console.error('Error saving message or broadcasting:', err);
            socket.emit('messageError', 'Failed to send message.');
        }
    });

    // 'disconnect' event
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Start the server (using 'server.listen')
server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`Socket.IO listening on port ${port}`);
});
