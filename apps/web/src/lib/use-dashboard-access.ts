"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { getCachedUser, type User } from "@/lib/auth";

interface UseDashboardAccessOptions {
  allowedRoles?: User["role"][];
  fallbackPath?: string;
}

export function useDashboardAccess(options: UseDashboardAccessOptions = {}) {
  const { allowedRoles, fallbackPath = "/dashboard" } = options;
  const router = useRouter();
  const user = useMemo(() => getCachedUser(), []);

  const isAllowed = Boolean(
    user && (!allowedRoles || allowedRoles.includes(user.role))
  );

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }

    if (!isAllowed) {
      router.replace(fallbackPath);
    }
  }, [fallbackPath, isAllowed, router, user]);

  return {
    user,
    isAllowed,
    isReady: Boolean(user) && isAllowed,
  };
}
