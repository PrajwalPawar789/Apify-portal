import { ApifyClient } from 'apify-client';
import ExcelJS from 'exceljs';
import pkg from 'pg';
const { Client } = pkg;

// Initialize PostgreSQL client
const dbClient = new Client({
    user: 'prajwal.pawar',
    host: '192.168.1.39',
    database: 'LeadDB',
    password: 'PPIndia@098',
    port: 5432,
});

dbClient.connect();

export const renderLoginPage = (req, res) => {
    res.render('login', { errorMessage: null });
};

export const loginUser = async (req, res) => {
    const { username, password } = req.body;

    try {
        const query = 'SELECT * FROM public.users WHERE username = $1 AND password = $2';
        const result = await dbClient.query(query, [username, password]);

        if (result.rows.length > 0) {
            // User authenticated successfully
            const user = result.rows[0];
            req.session.user = user; // Save user to session
            res.redirect('/');
        } else {
            // Invalid username or password
            res.render('login', { errorMessage: 'Invalid username or password' });
        }
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).send('Internal Server Error');
    }
};

export const logoutUser = (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
};