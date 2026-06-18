"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  clearToken,
  fetchMe,
  getToken,
  login as apiLogin,
  setToken,
} from "@/lib/api";
import type { User } from "@/lib/types";

interface AuthState {
  user: User | null;
  loading: boolean;
}

/**
 * 클라이언트 인증 훅. 토큰 기반으로 현재 사용자를 로드하고
 * 로그인/로그아웃을 제공한다.
 */
export function useAuth() {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  useEffect(() => {
    let active = true;
    if (!getToken()) {
      setState({ user: null, loading: false });
      return;
    }
    fetchMe()
      .then((user) => {
        if (active) setState({ user, loading: false });
      })
      .catch(() => {
        clearToken();
        if (active) setState({ user: null, loading: false });
      });
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
      const token = await apiLogin(email, password);
      setToken(token.access_token);
      const user = await fetchMe();
      setState({ user, loading: false });
    },
    [],
  );

  const logout = useCallback((): void => {
    clearToken();
    setState({ user: null, loading: false });
    router.push("/login");
  }, [router]);

  /** 소셜 로그인 등에서 직접 토큰을 설정하고 사용자 정보 로드. */
  const setTokenAndFetchUser = useCallback(async (token: string): Promise<void> => {
    setToken(token);
    const user = await fetchMe();
    setState({ user, loading: false });
  }, []);

  return { ...state, login, logout, setToken: setTokenAndFetchUser };
}
