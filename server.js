const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const server = http.createServer(app);

// Configure CORS for both Express and Socket.IO
const corsOptions = {
    origin: '*', // In production, replace with your actual domain
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
};

app.use(cors(corsOptions));

const io = socketIo(server, {
    cors: corsOptions
});

// Middleware
app.use(express.json());
app.use(bodyParser.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: err.message });
});

// In-memory storage for tracking sessions (temporary, instead of MongoDB)
const sessions = new Map();

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('Client connected');

    socket.on('startTracking', async (sessionId) => {
        socket.join(sessionId);
        console.log('Joined session:', sessionId);
    });

    socket.on('locationUpdate', async (data) => {
        const { sessionId, location } = data;
        if (sessions.has(sessionId)) {
            const session = sessions.get(sessionId);
            session.locationHistory.push({
                ...location,
                timestamp: new Date()
            });
            io.to(sessionId).emit('locationUpdated', location);
        }
    });

    socket.on('emergency', async (sessionId) => {
        if (sessions.has(sessionId)) {
            console.log('Emergency triggered for session:', sessionId);
            io.to(sessionId).emit('emergencyDeclared', {
                sessionId,
                timestamp: new Date()
            });
        }
    });

    socket.on('endTracking', async (sessionId) => {
        if (sessions.has(sessionId)) {
            const session = sessions.get(sessionId);
            session.status = 'completed';
            session.endTime = new Date();
            console.log('Tracking ended for session:', sessionId);
            socket.leave(sessionId);
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// Routes
app.post('/api/tracking/start', async (req, res) => {
    try {
        console.log('Received tracking start request:', req.body);
        
        const sessionId = Math.random().toString(36).substring(2);
        const trackingCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        const session = {
            _id: sessionId,
            ...req.body,
            trackingCode,
            status: 'active',
            startTime: new Date(),
            locationHistory: []
        };
        
        sessions.set(sessionId, session);
        console.log('New tracking session started:', sessionId);
        res.json(session);
    } catch (error) {
        console.error('Error starting tracking:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/tracking/checkin', async (req, res) => {
    try {
        const { sessionId, code, location } = req.body;
        const session = sessions.get(sessionId);
        
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }
        
        if (session.trackingCode !== code) {
            return res.status(400).json({ error: 'Invalid code' });
        }

        session.lastCheckIn = {
            timestamp: new Date(),
            location
        };
        
        res.json({ message: 'Check-in successful' });
    } catch (error) {
        console.error('Error during check-in:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/tracking/end', async (req, res) => {
    try {
        const { sessionId } = req.body;
        const session = sessions.get(sessionId);
        
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }
        
        session.status = 'completed';
        session.endTime = new Date();
        console.log('Tracking ended for session:', sessionId);
        
        res.json({ message: 'Tracking session ended successfully' });
    } catch (error) {
        console.error('Error ending tracking session:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/start-tracking', (req, res) => {
    const { trackingCode, name, phone, travelMode, startPoint, destination } = req.body;

    // Validate the tracking code to ensure it's numeric
    if (typeof trackingCode !== 'number' || trackingCode < 100000 || trackingCode > 999999) {
        return res.status(400).json({ message: 'Invalid tracking code. It must be a 6-digit number.' });
    }

    // Here you would typically save the tracking information to a database
    console.log(`Tracking started for ${name} with code ${trackingCode}.`);

    // Respond with success
    res.status(200).json({ message: 'Tracking started successfully', trackingCode });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log('Available endpoints:');
    console.log('- GET  /health');
    console.log('- POST /api/tracking/start');
    console.log('- POST /api/tracking/checkin');
    console.log('- POST /api/tracking/end');
    console.log('- POST /start-tracking');
}); 