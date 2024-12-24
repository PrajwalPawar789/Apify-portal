export const ensureAuthenticated = (req, res, next) => {
    if (req.session && req.session.user) {
        // User is logged in
        next();
    } else {
        // Redirect to login page if not authenticated
        res.redirect('/login');
    }
};
