'use client';

/** Appel API côté navigateur : renvoie { ok, data, error }. */
export async function api<T = Record<string, unknown>>(url: string, method = 'POST', payload?: unknown) {
  try {
    const res = await fetch(url, {
      method,
      headers: payload ? { 'Content-Type': 'application/json' } : undefined,
      body: payload ? JSON.stringify(payload) : undefined,
    });
    const data = (await res.json().catch(() => ({}))) as T & { error?: string };
    return { ok: res.ok, data, error: res.ok ? '' : data.error || 'Une erreur est survenue.' };
  } catch {
    return { ok: false, data: {} as T, error: 'Pas de connexion. Vérifiez votre réseau et réessayez.' };
  }
}

export async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
