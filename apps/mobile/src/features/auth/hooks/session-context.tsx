import {
  createContext, useContext, useEffect, useSyncExternalStore,
} from 'react';
import type {
  Session, SessionState,
} from '../api/session';

const SessionContext = createContext<Session | null>(null);

/** Provides the session and resumes it once at launch. */
export function SessionProvider ({ session, children }: { session: Session;
  children: React.ReactNode }): React.JSX.Element {
  useEffect(() => {
    if (session.getState().status === 'restoring') {
      void session.restore();
    }
  }, [session]);

  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}

export function useSessionManager (): Session {
  const session = useContext(SessionContext);

  if (!session) {
    throw new Error('useSession must be used inside SessionProvider');
  }

  return session;
}

/** The current session state, re-rendering on every change. */
export function useSession (): SessionState {
  const session = useSessionManager();

  return useSyncExternalStore(
    (listener) => session.subscribe(listener),
    () => session.getState(),
  );
}
