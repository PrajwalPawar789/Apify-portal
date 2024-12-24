import express from 'express';
import http from 'http'; // Add http server
import { Server } from 'socket.io';
import session from 'express-session';
import fileUpload from 'express-fileupload';
import path from 'path';
import { fileURLToPath } from 'url';
import routes from './routes/uploadRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 2789;

// Create HTTP server and attach Socket.IO
const server = http.createServer(app);
const io = new Server(server);

// Middleware
app.use(fileUpload());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
}));

// Socket.IO Connection
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Handle window close or refresh event
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        // Add cleanup logic or logging if needed
    });

    socket.on('userAction', (data) => {
        console.log('User performed an action:', data);
        // Perform related server actions (e.g., updating database)
    });
});

// Set up view engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Use routes
app.use('/', routes);

// Start server
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
