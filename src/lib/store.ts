"use client";

import { useSyncExternalStore } from "react";
import { baseTenant } from "@/tenants";
import type { TenantData } from "./types";

/* The site's data on the client: the built-in tenant data, or the copy edited in the admin panel and saved in this
   browser. Pages render the built-in data on the server, then switch to the saved copy (if any) after hydration.
   Other tabs follow along through the "storage" event, so the site updates while the admin panel is open in
   another tab. */

const KEY = `cantiere-live:${baseTenant.id}:data`;
const listeners = new Set<() => void>();
let cache: { raw: string | null; data: TenantData } = { raw: null, data: baseTenant };

function readSaved(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function snapshot(): TenantData {
  const raw = readSaved();
  if (raw === cache.raw) return cache.data;
  let data = baseTenant;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as TenantData;
      if (parsed?.version === baseTenant.version && parsed.id === baseTenant.id && Array.isArray(parsed.projects)) data = parsed;
    } catch {
      /* a broken copy falls back to the built-in data */
    }
  }
  cache = { raw, data };
  return data;
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

const emit = () => listeners.forEach((l) => l());

export function useTenant(): TenantData {
  return useSyncExternalStore(subscribe, snapshot, () => baseTenant);
}

/** Saves the edited data; false when this browser refuses storage (private mode, blocked site data). */
export function saveTenant(data: TenantData): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    emit();
    return true;
  } catch {
    return false;
  }
}

export function resetTenant() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing saved, nothing to reset */
  }
  emit();
}

export function useProject(slug: string) {
  return useTenant().projects.find((p) => p.slug === slug);
}
