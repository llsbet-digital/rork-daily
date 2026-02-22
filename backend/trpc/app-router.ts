import { createTRPCRouter } from "./create-context";
import { authRouter } from "./routes/auth";

export const appRouter = createTRPCRouter({
  auth: authRouter,
});

export type AppRouter = typeof appRouter;
