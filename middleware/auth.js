module.exports = {
    isLoggedIn: (req, res, next) => {
        if (!req.session.userId) {
            return res.redirect('/login');
        }
        next();
    },
    isRole: (...roles) => {
        return (req, res, next) => {
            if (!req.session.userId || !roles.includes(req.session.role)) {
                return res.redirect('/login');
            }
            next();
        };
    }
};
