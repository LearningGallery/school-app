import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";

export type Role = "admin" | "teacher";
export interface Claims {
  sub: string;
  role: Role;
}

export const hashPassword = (plain: string) => bcrypt.hash(plain, 10);
export const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);

export function signToken(claims: Claims, secret: string, ttlSeconds: number): string {
  return jwt.sign(claims, secret, { expiresIn: ttlSeconds, algorithm: "HS256" });
}

export function requireAuth(secret: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    try {
      res.locals.claims = jwt.verify(token, secret, { algorithms: ["HS256"] }) as Claims;
      next();
    } catch {
      res.status(401).json({ error: "unauthorized" });
    }
  };
}

export function requireRole(...roles: Role[]) {
  return (_req: Request, res: Response, next: NextFunction) => {
    const claims = res.locals.claims as Claims | undefined;
    if (claims && roles.includes(claims.role)) return next();
    res.status(403).json({ error: "forbidden" });
  };
}
