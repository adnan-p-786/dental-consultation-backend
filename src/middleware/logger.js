"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = requestLogger;
function requestLogger(req, res, next) {
    const start = Date.now();
    const { method, originalUrl } = req;
    res.on("finish", () => {
        const duration = Date.now() - start;
        const status = res.statusCode;
        console.log(`[${new Date().toLocaleTimeString()}] ${method} ${originalUrl} ${status} - ${duration}ms`);
    });
    next();
}
