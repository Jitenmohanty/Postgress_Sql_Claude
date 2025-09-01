//env.d.ts

declare namespace NodeJS {
  interface ProcessEnv {
    JWT_SECRET: string;
    JWT_REFRESH_SECRET: string;
    JWT_EXPIRE?: string;
    JWT_REFRESH_EXPIRE?: string;
  }
}
