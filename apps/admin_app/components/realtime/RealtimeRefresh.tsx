"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Props = {
  table: string;
  schema?: string;
  event?: "INSERT" | "UPDATE" | "DELETE" | "*";
  filter?: string;
  debounceMs?: number;
};

export function RealtimeRefresh({
  table,
  schema = "public",
  event = "*",
  filter,
  debounceMs = 500,
}: Props) {
  const router = useRouter();

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const channel = supabase
      .channel(`rr:${schema}:${table}:${filter ?? "all"}`)
      .on(
        "postgres_changes",
        { event, schema, table, filter },
        () => {
          if (timeout) clearTimeout(timeout);
          timeout = setTimeout(() => router.refresh(), debounceMs);
        },
      )
      .subscribe();

    return () => {
      if (timeout) clearTimeout(timeout);
      void supabase.removeChannel(channel);
    };
  }, [debounceMs, event, filter, router, schema, supabase, table]);

  return null;
}

