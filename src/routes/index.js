"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const routes_1 = __importDefault(require("./user/routes"));
const routes_2 = __importDefault(require("./appointment/routes"));
const apiRouter = (0, express_1.Router)();
apiRouter.use("/auth", routes_1.default);
apiRouter.use("/users", routes_1.default);
apiRouter.use("/appointment", routes_2.default);
exports.default = apiRouter;
