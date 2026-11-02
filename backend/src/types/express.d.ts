declare global {
  namespace Express {
    interface Locals {
      /** Set by `authenticate` when the request carries a valid bearer session. */
      userId?: string;
      sessionId?: string;
    }
  }
}

export {};
