declare namespace NodeJS {
  interface ProcessEnv {
    OPENAI_API_KEY: string;
    DATABASE_URL: string;
    NEXT_PUBLIC_API_URL: string;
  }
} 