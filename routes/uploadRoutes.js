// routes/uploadRoutes.js
import express from 'express';
import { processFileController } from '../controllers/fileController.js';
import { renderLoginPage, loginUser, logoutUser } from '../controllers/authController.js';
import { ensureAuthenticated } from '../middleware/authMiddleware.js';

const router = express.Router();

// Route to render the upload form
router.get('/', ensureAuthenticated, (req, res) => {
    res.render('uploadForm');
});

// Login routes
router.get('/login', renderLoginPage);
router.post('/login', loginUser);

// Logout route
router.get('/logout', logoutUser);

// Protected route to handle file upload and processing
router.post('/process-file', ensureAuthenticated, processFileController);

export default router;
