import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import bcrypt from "bcrypt";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

export function configureAuth(app: Express) {
  const PostgresStore = connectPgSimple(session);
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET ?? "dev-secret-change-in-prod",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
    store: new PostgresStore({
      pool,
      tableName: "session",
      createTableIfMissing: true,
    }),
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
          return done(null, false);
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    console.log(`[Auth] Serializing user: ${user.username} (id: ${user.id})`);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      console.log(`[Auth] Deserializing user id: ${id}`);
      const user = await storage.getUser(id);
      if (!user) {
        console.warn(`[Auth] Deserialization failed: User ${id} not found`);
      }
      done(null, user);
    } catch (err) {
      console.error(`[Auth] Deserialization error for user ${id}:`, err);
      done(err);
    }
  });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    console.log(`[Auth] Unauthenticated request to ${req.path}`);
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (!roles.includes(req.user!.role)) {
      console.log(`[Auth] Forbidden: User ${req.user!.username} (role: ${req.user!.role}) attempted to access ${req.path} which requires one of: ${roles.join(", ")}`);
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}

export async function seedAdminUser() {
  try {
    const adminUser = await storage.getUserByUsername("admin");
    if (!adminUser) {
      console.log("[Auth] Admin user NOT found. Seeding admin user...");
      const passwordHash = await bcrypt.hash("2Park", 10);
      await storage.createUser({
        username: "admin",
        passwordHash,
        role: "admin",
      });
      console.log("[Auth] Admin user seeded successfully (username: admin, role: admin, pass: 2Park)");
    } else {
      console.log(`[Auth] Admin user already exists. Username: ${adminUser.username}, Role: ${adminUser.role}, ID: ${adminUser.id}`);
      if (adminUser.role !== "admin") {
        console.warn(`[Auth] WARNING: User 'admin' exists but has role '${adminUser.role}' instead of 'admin'!`);
      }
    }
  } catch (err) {
    console.error("[Auth] Failed to seed admin user:", err);
  }
}
