"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const app_1 = __importDefault(require("./app"));
const db_1 = require("./config/db");
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5002;
const server = app_1.default.listen(PORT);
const shutdown = async (signal) => {
    console.log(`\n[${signal}] Shutting down gracefully...`);
    server.close(async () => {
        try {
            await db_1.pool.end();
            console.log("PostgreSQL connection pool closed.");
        }
        catch (err) {
            console.error("Error closing PostgreSQL pool:", err);
        }
        process.exit(0);
    });
};
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
