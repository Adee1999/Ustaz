/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Lightweight, dependency-light authentication layer.
 *
 * Users are persisted to a local JSON file (data/users.json). This avoids
 * requiring a native database driver (e.g. better-sqlite3, pg) that may not
 * build on shared hosting like Hostinger. For a small number of teachers
 * per school this is perfectly adequate; if the platform grows, swap
 * `readUsers`/`writeUsers` for real database calls without touching the
 * route handlers below.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';

// ----------------------------------------------------
// Storage paths
// ----------------------------------------------------

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const JWT_SECRET_FILE = path.join(DATA_DIR, '.jwt_secret');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// ----------------------------------------------------
// JWT secret: prefer an explicit env var (recommended for production /
// multi-instance deployments). Otherwise generate one once and persist it
// locally so tokens survive server restarts.
// ----------------------------------------------------

function getJwtSecret(): string {
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.trim().length > 0) {
    return process.env.JWT_SECRET;
  }

  ensureDataDir();
  if (fs.existsSync(JWT_SECRET_FILE)) {
    return fs.readFileSync(JWT_SECRET_FILE, 'utf-8').trim();
  }

  const generated = crypto.randomBytes(48).toString('hex');
  fs.writeFileSync(JWT_SECRET_FILE, generated, { mode: 0o600 });
  console.warn(
    '[auth] JWT_SECRET env var орнатылмаған. Автоматты түрде data/.jwt_secret файлында тұрақты кілт жасалды. ' +
    'Production ортасында JWT_SECRET айнымалысын қолмен орнатуды ұсынамыз.'
  );
  return generated;
}

const JWT_SECRET = getJwtSecret();
const TOKEN_TTL = '30d';

// ----------------------------------------------------
// User model
// ----------------------------------------------------

export interface StoredUser {
  id: string;
  email: string; // normalized lowercase, unique
  passwordHash: string;
  fullName: string;
  schoolName: string;
  position: string;
  city: string;
  subjects: string[];
  grades: string[];
  standardConformity: string;
  autosave: boolean;
  theme: 'light' | 'dark';
  createdAt: string;
}

export type PublicUser = Omit<StoredUser, 'passwordHash'>;

function toPublicUser(user: StoredUser): PublicUser {
  const { passwordHash, ...publicUser } = user;
  return publicUser;
}

// ----------------------------------------------------
// Simple file-backed store with a write queue to avoid concurrent
// read-modify-write races when multiple requests land at once.
// ----------------------------------------------------

let writeQueue: Promise<void> = Promise.resolve();

function readUsers(): StoredUser[] {
  ensureDataDir();
  if (!fs.existsSync(USERS_FILE)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(USERS_FILE, 'utf-8');
    if (!raw.trim()) return [];
    return JSON.parse(raw) as StoredUser[];
  } catch (e) {
    console.error('[auth] users.json оқу қатесі, бос тізім қайтарылды:', e);
    return [];
  }
}

async function writeUsers(users: StoredUser[]): Promise<void> {
  ensureDataDir();
  writeQueue = writeQueue.then(() => {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  });
  return writeQueue;
}

// ----------------------------------------------------
// Public API
// ----------------------------------------------------

const DEFAULT_STANDARD = 'МЖББС (2026 жаңартылған мазмұны)';

export function findUserByEmail(email: string): StoredUser | undefined {
  const normalized = email.trim().toLowerCase();
  return readUsers().find((u) => u.email === normalized);
}

export function findUserById(id: string): StoredUser | undefined {
  return readUsers().find((u) => u.id === id);
}

export interface RegisterInput {
  fullName: string;
  email: string;
  password: string;
  schoolName?: string;
  position?: string;
  city?: string;
}

export async function registerUser(input: RegisterInput): Promise<PublicUser> {
  const email = input.email.trim().toLowerCase();
  const fullName = input.fullName.trim();

  if (!fullName) {
    throw new Error('Аты-жөніңізді енгізіңіз.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Email мекенжайы дұрыс емес.');
  }
  if (!input.password || input.password.length < 6) {
    throw new Error('Құпия сөз кемінде 6 таңбадан тұруы керек.');
  }
  if (findUserByEmail(email)) {
    throw new Error('Бұл email бойынша аккаунт бұрыннан тіркелген.');
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  const newUser: StoredUser = {
    id: crypto.randomUUID(),
    email,
    passwordHash,
    fullName,
    schoolName: input.schoolName?.trim() || '',
    position: input.position?.trim() || 'Мұғалім',
    city: input.city?.trim() || '',
    subjects: [],
    grades: [],
    standardConformity: DEFAULT_STANDARD,
    autosave: true,
    theme: 'light',
    createdAt: new Date().toISOString(),
  };

  const users = readUsers();
  users.push(newUser);
  await writeUsers(users);

  return toPublicUser(newUser);
}

export async function loginUser(email: string, password: string): Promise<PublicUser> {
  const user = findUserByEmail(email);
  if (!user) {
    throw new Error('Email немесе құпия сөз қате.');
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new Error('Email немесе құпия сөз қате.');
  }
  return toPublicUser(user);
}

export type ProfileUpdate = Partial<
  Pick<
    StoredUser,
    | 'fullName'
    | 'schoolName'
    | 'position'
    | 'city'
    | 'subjects'
    | 'grades'
    | 'standardConformity'
    | 'autosave'
    | 'theme'
  >
>;

export async function updateUserProfile(userId: string, update: ProfileUpdate): Promise<PublicUser> {
  const users = readUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx === -1) {
    throw new Error('Пайдаланушы табылмады.');
  }

  const current = users[idx];
  const merged: StoredUser = {
    ...current,
    ...(update.fullName !== undefined && { fullName: update.fullName.trim() || current.fullName }),
    ...(update.schoolName !== undefined && { schoolName: update.schoolName }),
    ...(update.position !== undefined && { position: update.position }),
    ...(update.city !== undefined && { city: update.city }),
    ...(update.subjects !== undefined && { subjects: update.subjects }),
    ...(update.grades !== undefined && { grades: update.grades }),
    ...(update.standardConformity !== undefined && { standardConformity: update.standardConformity }),
    ...(update.autosave !== undefined && { autosave: update.autosave }),
    ...(update.theme !== undefined && { theme: update.theme }),
  };

  users[idx] = merged;
  await writeUsers(users);
  return toPublicUser(merged);
}

export function signToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (typeof payload === 'object' && payload && 'userId' in payload) {
      return { userId: String((payload as any).userId) };
    }
    return null;
  } catch {
    return null;
  }
}

// Express augmentation so downstream handlers get typed req.userId
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    res.status(401).json({ error: 'Авторизация қажет. Жүйеге қайта кіріңіз.' });
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Сессия мерзімі аяқталған. Жүйеге қайта кіріңіз.' });
    return;
  }

  req.userId = payload.userId;
  next();
}

export { toPublicUser };
