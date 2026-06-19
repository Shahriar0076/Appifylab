"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "./auth-provider";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(options: { client_id: string; callback: (response: { credential: string }) => void }): void;
          prompt(): void;
        };
      };
    };
    appifyGoogleAuth?: {
      currentHandler?: (response: { credential: string }) => void;
      handlers: Set<(response: { credential: string }) => void>;
      initializedClientId?: string;
      scriptPromise?: Promise<void>;
    };
  }
}

function googleAuthState() {
  window.appifyGoogleAuth ??= { handlers: new Set() };
  return window.appifyGoogleAuth;
}

function loadGoogleScript() {
  const state = googleAuthState();
  if (window.google) return Promise.resolve();
  state.scriptPromise ??= new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Unable to load Google sign-in.")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Unable to load Google sign-in."));
    document.head.appendChild(script);
  });
  return state.scriptPromise;
}

export function GoogleAuthButton({ registration }: { registration: boolean }) {
  const router = useRouter();
  const { refresh } = useAuth();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

  useEffect(() => {
    if (!clientId) return;
    let mounted = true;
    const state = googleAuthState();
    const handler = async ({ credential }: { credential: string }) => {
      try {
        setError("");
        await api("/auth/google", {
          method: "POST",
          body: JSON.stringify({ credential }),
        });
        await refresh();
        router.replace("/feed");
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Google authentication failed.");
      }
    };
    state.handlers.add(handler);
    state.currentHandler = handler;

    loadGoogleScript()
      .then(() => {
        if (!window.google) throw new Error("Unable to load Google sign-in.");
        if (!state.initializedClientId) {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: (response) => state.currentHandler?.(response),
          });
          state.initializedClientId = clientId;
        }
        if (mounted) setReady(true);
      })
      .catch((caught) => {
        if (mounted) setError(caught instanceof Error ? caught.message : "Unable to load Google sign-in.");
      });

    return () => {
      mounted = false;
      state.handlers.delete(handler);
      if (state.currentHandler === handler) state.currentHandler = state.handlers.values().next().value;
    };
  }, [clientId, refresh, router]);

  return (
    <>
      <button
        type="button"
        disabled={!ready}
        onClick={() => {
          googleAuthState().currentHandler = googleAuthState().handlers.values().next().value;
          window.google?.accounts.id.prompt();
        }}
        className={`${registration ? "_social_registration_content_btn" : "_social_login_content_btn"} _mar_b40`}
      >
        <img src="/assets/images/google.svg" alt="" className="_google_img" />
        <span>{registration ? "Register with google" : "Or sign-in with google"}</span>
      </button>
      {!clientId && <p className="appify-error">Google sign-in is not configured.</p>}
      {error && <p className="appify-error">{error}</p>}
    </>
  );
}
