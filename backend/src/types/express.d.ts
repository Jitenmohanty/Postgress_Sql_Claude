// src/types/express.d.ts
declare global {
  namespace Express {
    interface User {
      id: number;
      email: string;
      username: string;
      role: string;
      firstName?: string | null;
      lastName?: string | null;
      avatar?: string | null;
      isActive: boolean;
    }

    interface Request {
      user?: User;
    }
  }
}

export {};
