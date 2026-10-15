import type { Session } from '@supabase/supabase-js';
import { createContext, use, useEffect, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { supabase } from './supabase';

type SessionState = {
  session: Session | null;
  isLoading: boolean;
};

const SessionContext = createContext<SessionState>({ session: null, isLoading: true });

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({ session: null, isLoading: true });

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ session, isLoading: false });
    });

    const appState = AppState.addEventListener('change', (status) => {
      if (status === 'active') {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    });

    return () => {
      data.subscription.unsubscribe();
      appState.remove();
    };
  }, []);

  return <SessionContext value={state}>{children}</SessionContext>;
}

export function useSession() {
  return use(SessionContext);
}
