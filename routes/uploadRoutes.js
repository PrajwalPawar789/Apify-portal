// routes/uploadRoutes.js
import express from 'express';
import { processFileController } from '../controllers/fileController.js';

const router = express.Router();

// Route to render the upload form
router.get('/', (req, res) => {
    res.render('uploadForm');
});

// Route to handle file upload and processing
router.post('/process-file', processFileController);

export default router;