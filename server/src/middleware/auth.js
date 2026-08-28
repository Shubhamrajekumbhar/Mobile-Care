const jwt = require('jsonwebtoken');

const authenticateAdmin = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            message: 'Authentication token missing.'
        });
    }

    const token = authHeader.split(' ')[1];

    if (!process.env.JWT_SECRET) {
        console.error('JWT_SECRET is not configured.');
        return res.status(500).json({
            message: 'Server authentication is not configured.'
        });
    }

    try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        req.admin = decoded;

        return next();

    } catch (error) {
        return res.status(401).json({
            message: 'Invalid or expired token.'
        });
    }
};

module.exports = {
    authenticateAdmin
};


