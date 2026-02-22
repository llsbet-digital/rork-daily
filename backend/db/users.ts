export interface DbUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  interests: string[];
  isPremium: boolean;
  isOnboarded: boolean;
  streak: number;
  totalArticlesRead: number;
  savedArticlesCount: number;
  createdAt: string;
}

const users = new Map<string, DbUser>();
const emailIndex = new Map<string, string>();

function generateId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

async function simpleHash(password: string): Promise<string> {
  let hash = 0;
  const salt = "daily_app_salt_2024";
  const salted = salt + password + salt;
  for (let i = 0; i < salted.length; i++) {
    const char = salted.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `hashed_${Math.abs(hash).toString(36)}`;
}

export async function createUser(email: string, password: string, name: string): Promise<DbUser> {
  const normalizedEmail = email.toLowerCase().trim();

  if (emailIndex.has(normalizedEmail)) {
    throw new Error("An account with this email already exists");
  }

  const id = generateId();
  const passwordHash = await simpleHash(password);

  const user: DbUser = {
    id,
    email: normalizedEmail,
    name: name || normalizedEmail.split("@")[0],
    passwordHash,
    interests: [],
    isPremium: false,
    isOnboarded: false,
    streak: 0,
    totalArticlesRead: 0,
    savedArticlesCount: 0,
    createdAt: new Date().toISOString(),
  };

  users.set(id, user);
  emailIndex.set(normalizedEmail, id);

  console.log(`[DB] User created: ${id} (${normalizedEmail})`);
  return user;
}

export async function findUserByEmail(email: string): Promise<DbUser | null> {
  const normalizedEmail = email.toLowerCase().trim();
  const userId = emailIndex.get(normalizedEmail);
  if (!userId) return null;
  return users.get(userId) || null;
}

export async function findUserById(id: string): Promise<DbUser | null> {
  return users.get(id) || null;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const computed = await simpleHash(password);
  return computed === hash;
}

export async function updateUser(id: string, updates: Partial<Omit<DbUser, "id" | "email" | "passwordHash" | "createdAt">>): Promise<DbUser> {
  const user = users.get(id);
  if (!user) throw new Error("User not found");

  const updated: DbUser = { ...user, ...updates };
  users.set(id, updated);

  console.log(`[DB] User updated: ${id}`);
  return updated;
}
