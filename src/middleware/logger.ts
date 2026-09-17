import { Request, Response, NextFunction } from "express";

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const { method, originalUrl } = req;

  res.on("finish", () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    console.log(`[${new Date().toLocaleTimeString()}] ${method} ${originalUrl} ${status} - ${duration}ms`);
  });

  next();
}
