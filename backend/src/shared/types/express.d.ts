import { AuthenticatedUser, AuthContext } from '../../modules/identity/domain/types.js';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      user?: AuthenticatedUser;
      authContext: AuthContext;
    }
  }
}

export {};
