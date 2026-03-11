import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import Database from "better-sqlite3";
import crypto from "crypto";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("attendance.db");
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    roll_number TEXT UNIQUE NOT NULL,
    department TEXT NOT NULL,
    semester TEXT NOT NULL,
    password_hash TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS faculty (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    department TEXT NOT NULL,
    password_hash TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject TEXT NOT NULL,
    course_code TEXT NOT NULL,
    section TEXT NOT NULL,
    room_number TEXT NOT NULL,
    faculty_id INTEGER NOT NULL,
    start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    end_time DATETIME,
    qr_token TEXT NOT NULL,
    token_expiry DATETIME NOT NULL,
    FOREIGN KEY (faculty_id) REFERENCES faculty(id)
  );

  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    session_id INTEGER NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    device_id TEXT,
    latitude REAL,
    longitude REAL,
    UNIQUE(student_id, session_id),
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (session_id) REFERENCES sessions(id)
  );
`);

// Seed Admin if not exists
const adminCheck = db.prepare("SELECT * FROM admins WHERE username = ?").get("admin");
if (!adminCheck) {
  const hash = bcrypt.hashSync("admin123", 10);
  db.prepare("INSERT INTO admins (username, password_hash) VALUES (?, ?)").run("admin", hash);
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Auth Middleware
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  };

  // --- Auth Routes ---
  app.post("/api/auth/register/student", (req, res) => {
    const { name, rollNumber, department, semester, password } = req.body;
    try {
      const hash = bcrypt.hashSync(password, 10);
      db.prepare("INSERT INTO students (name, roll_number, department, semester, password_hash) VALUES (?, ?, ?, ?, ?)")
        .run(name, rollNumber, department, semester, hash);
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ error: "Roll number already exists" });
    }
  });

  app.post("/api/auth/register/faculty", (req, res) => {
    const { name, email, department, password } = req.body;
    try {
      const hash = bcrypt.hashSync(password, 10);
      db.prepare("INSERT INTO faculty (name, email, department, password_hash) VALUES (?, ?, ?, ?)")
        .run(name, email, department, hash);
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ error: "Email already exists" });
    }
  });

  app.post("/api/auth/login/:role", (req, res) => {
    const { role } = req.params;
    const { identifier, password } = req.body; // identifier is rollNumber, email, or username

    let user: any;
    if (role === "student") {
      user = db.prepare("SELECT * FROM students WHERE roll_number = ?").get(identifier);
    } else if (role === "faculty") {
      user = db.prepare("SELECT * FROM faculty WHERE email = ?").get(identifier);
    } else if (role === "admin") {
      user = db.prepare("SELECT * FROM admins WHERE username = ?").get(identifier);
    }

    if (user && bcrypt.compareSync(password, user.password_hash)) {
      const token = jwt.sign({ id: user.id, role, name: user.name || user.username }, JWT_SECRET, { expiresIn: '24h' });
      res.json({ token, user: { id: user.id, role, name: user.name || user.username, ...user, password_hash: undefined } });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  // --- Faculty Routes ---
  app.post("/api/sessions", authenticateToken, (req: any, res) => {
    if (req.user.role !== "faculty") return res.sendStatus(403);
    const { subject, courseCode, section, roomNumber } = req.body;
    const qrToken = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 3 * 60 * 1000).toISOString(); // 3 mins

    const result = db.prepare(`
      INSERT INTO sessions (subject, course_code, section, room_number, faculty_id, qr_token, token_expiry)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(subject, courseCode, section, roomNumber, req.user.id, qrToken, expiry);

    res.json({ sessionId: result.lastInsertRowid, qrToken });
  });

  app.get("/api/sessions/:id/refresh", authenticateToken, (req: any, res) => {
    if (req.user.role !== "faculty") return res.sendStatus(403);
    const qrToken = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 3 * 60 * 1000).toISOString();
    db.prepare("UPDATE sessions SET qr_token = ?, token_expiry = ? WHERE id = ? AND faculty_id = ?")
      .run(qrToken, expiry, req.params.id, req.user.id);
    res.json({ qrToken });
  });

  app.get("/api/sessions/:id/attendance", authenticateToken, (req: any, res) => {
    const attendance = db.prepare(`
      SELECT a.*, s.name, s.roll_number 
      FROM attendance a 
      JOIN students s ON a.student_id = s.id 
      WHERE a.session_id = ?
    `).all(req.params.id);
    res.json(attendance);
  });

  // --- Student Routes ---
  app.post("/api/attendance/mark", authenticateToken, (req: any, res) => {
    if (req.user.role !== "student") return res.sendStatus(403);
    const { qrToken, deviceId, latitude, longitude } = req.body;

    const session = db.prepare("SELECT * FROM sessions WHERE qr_token = ?").get(qrToken);
    if (!session) return res.status(400).json({ error: "Invalid or expired QR code" });

    if (new Date(session.token_expiry) < new Date()) {
      return res.status(400).json({ error: "QR code expired" });
    }

    try {
      db.prepare("INSERT INTO attendance (student_id, session_id, device_id, latitude, longitude) VALUES (?, ?, ?, ?, ?)")
        .run(req.user.id, session.id, deviceId, latitude, longitude);
      res.json({ success: true, message: "Attendance marked successfully" });
    } catch (e) {
      res.status(400).json({ error: "Attendance already marked for this session" });
    }
  });

  app.get("/api/student/stats", authenticateToken, (req: any, res) => {
    if (req.user.role !== "student") return res.sendStatus(403);
    const attendance = db.prepare(`
      SELECT a.*, s.subject, s.course_code, s.start_time 
      FROM attendance a 
      JOIN sessions s ON a.session_id = s.id 
      WHERE a.student_id = ?
      ORDER BY a.timestamp DESC
    `).all(req.user.id);
    res.json(attendance);
  });

  // --- Admin Routes ---
  app.get("/api/admin/stats", authenticateToken, (req: any, res) => {
    if (req.user.role !== "admin") return res.sendStatus(403);
    const totalStudents = db.prepare("SELECT COUNT(*) as count FROM students").get().count;
    const totalFaculty = db.prepare("SELECT COUNT(*) as count FROM faculty").get().count;
    const totalSessions = db.prepare("SELECT COUNT(*) as count FROM sessions").get().count;
    
    const attendanceBySubject = db.prepare(`
      SELECT subject, COUNT(*) as count 
      FROM attendance a 
      JOIN sessions s ON a.session_id = s.id 
      GROUP BY subject
    `).all();

    res.json({ totalStudents, totalFaculty, totalSessions, attendanceBySubject });
  });

  app.get("/api/admin/all-attendance", authenticateToken, (req: any, res) => {
    if (req.user.role !== "admin") return res.sendStatus(403);
    const data = db.prepare(`
      SELECT a.*, s.name as student_name, s.roll_number, sess.subject, sess.course_code, f.name as faculty_name
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      JOIN sessions sess ON a.session_id = sess.id
      JOIN faculty f ON sess.faculty_id = f.id
    `).all();
    res.json(data);
  });

  // Health check
  app.get("/api/health", (req, res) => res.json({ status: "ok" }));

  // Vite middleware / Static files
  const distPath = path.join(__dirname, "dist");
  const isProd = process.env.NODE_ENV === "production";

  if (!isProd) {
    console.log("Starting in development mode with Vite...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);

    app.get("*", async (req, res, next) => {
      const url = req.originalUrl;
      if (url.startsWith('/api')) return next();
      
      try {
        const templatePath = path.resolve(__dirname, "index.html");
        let template = fs.readFileSync(templatePath, "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    console.log("Starting in production mode serving from dist...");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      if (req.originalUrl.startsWith('/api')) {
        return res.status(404).json({ error: "API route not found" });
      }
      const indexPath = path.join(distPath, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send("Build not found. Please run npm run build.");
      }
    });
  }

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
