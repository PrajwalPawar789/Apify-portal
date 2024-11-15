import express from 'express';
import fileUpload from 'express-fileupload';
import path from 'path';
import { fileURLToPath } from 'url';
import routes from './routes/uploadRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Middleware
app.use(fileUpload());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set up view engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Use routes
app.use('/', routes);

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
