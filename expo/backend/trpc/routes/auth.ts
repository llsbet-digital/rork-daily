import * as z from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";
import { createUser, findUserByEmail, findUserById, verifyPassword, updateUser } from "../../db/users";

const tokenStore = new Map<string, string>();

function generateToken(): string {
  return `tok_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

function getUserIdFromToken(token: string | null): string | null {
  if (!token) return null;
  return tokenStore.get(token) || null;
}

export const authRouter = createTRPCRouter({
  signUp: publicProcedure
    .input(
      z.object({
        email: z.string().email("Invalid email address"),
        password: z.string().min(6, "Password must be at least 6 characters"),
        name: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      console.log(`[Auth] Sign up attempt: ${input.email}`);
      const user = await createUser(input.email, input.password, input.name || "");
      const token = generateToken();
      tokenStore.set(token, user.id);
      console.log(`[Auth] Sign up success: ${user.id}`);
      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          isPremium: user.isPremium,
          isOnboarded: user.isOnboarded,
          interests: user.interests,
          streak: user.streak,
          totalArticlesRead: user.totalArticlesRead,
          savedArticlesCount: user.savedArticlesCount,
          memberSince: user.createdAt,
        },
      };
    }),

  signIn: publicProcedure
    .input(
      z.object({
        email: z.string().email("Invalid email address"),
        password: z.string().min(1, "Password is required"),
      })
    )
    .mutation(async ({ input }) => {
      console.log(`[Auth] Sign in attempt: ${input.email}`);
      const user = await findUserByEmail(input.email);
      if (!user) {
        throw new Error("Invalid email or password");
      }

      const valid = await verifyPassword(input.password, user.passwordHash);
      if (!valid) {
        throw new Error("Invalid email or password");
      }

      const token = generateToken();
      tokenStore.set(token, user.id);
      console.log(`[Auth] Sign in success: ${user.id}`);
      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          isPremium: user.isPremium,
          isOnboarded: user.isOnboarded,
          interests: user.interests,
          streak: user.streak,
          totalArticlesRead: user.totalArticlesRead,
          savedArticlesCount: user.savedArticlesCount,
          memberSince: user.createdAt,
        },
      };
    }),

  me: publicProcedure.query(async ({ ctx }) => {
    const userId = getUserIdFromToken(ctx.token);
    if (!userId) {
      return null;
    }

    const user = await findUserById(userId);
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      isPremium: user.isPremium,
      isOnboarded: user.isOnboarded,
      interests: user.interests,
      streak: user.streak,
      totalArticlesRead: user.totalArticlesRead,
      savedArticlesCount: user.savedArticlesCount,
      memberSince: user.createdAt,
    };
  }),

  completeOnboarding: publicProcedure
    .input(
      z.object({
        interests: z.array(z.string()).min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = getUserIdFromToken(ctx.token);
      if (!userId) throw new Error("Not authenticated");

      const updated = await updateUser(userId, {
        interests: input.interests,
        isOnboarded: true,
      });

      console.log(`[Auth] Onboarding completed for: ${userId}`);
      return {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        isPremium: updated.isPremium,
        isOnboarded: updated.isOnboarded,
        interests: updated.interests,
        streak: updated.streak,
        totalArticlesRead: updated.totalArticlesRead,
        savedArticlesCount: updated.savedArticlesCount,
        memberSince: updated.createdAt,
      };
    }),

  updateProfile: publicProcedure
    .input(
      z.object({
        name: z.string().optional(),
        interests: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = getUserIdFromToken(ctx.token);
      if (!userId) throw new Error("Not authenticated");

      const updates: Record<string, unknown> = {};
      if (input.name !== undefined) updates.name = input.name;
      if (input.interests !== undefined) updates.interests = input.interests;

      const updated = await updateUser(userId, updates);
      return {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        isPremium: updated.isPremium,
        isOnboarded: updated.isOnboarded,
        interests: updated.interests,
        streak: updated.streak,
        totalArticlesRead: updated.totalArticlesRead,
        savedArticlesCount: updated.savedArticlesCount,
        memberSince: updated.createdAt,
      };
    }),
});
