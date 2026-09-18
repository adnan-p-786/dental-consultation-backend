"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const auth_1 = require("../utils/auth");
const authenticate = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            res.status(401).json({
                success: false,
                error: "Authorization header is required",
            });
            return;
        }
        if (!authHeader.startsWith("Bearer ")) {
            res.status(401).json({
                success: false,
                error: "Invalid authorization format",
            });
            return;
        }
        const token = authHeader.split(" ")[1];
        if (!token) {
            res.status(401).json({
                success: false,
                error: "Token is required",
            });
            return;
        }
        const decoded = (0, auth_1.verifyToken)(token);
        req.user = {
            id: decoded.id,
            email: decoded.email,
            role: decoded.role,
        };
        next();
    }
    catch (error) {
        res.status(401).json({
            success: false,
            error: "Invalid or expired token",
        });
    }
};
exports.authenticate = authenticate;
