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
  }
}

export function GoogleAuthButton({ registration }: { registration: boolean }) {
  const router = useRouter();
  const { refresh } = useAuth();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

  useEffect(() => {
    if (!clientId) return;
    const initialize = () => {
      window.google?.accounts.id.initialize({
        client_id: clientId,
        callback: async ({ credential }) => {
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
        },
      });
      setReady(true);
    };
    if (window.google) initialize();
    else {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.onload = initialize;
      document.head.appendChild(script);
      return () => script.remove();
    }
  }, [clientId, refresh, router]);

  return (
    <>
      <button
        type="button"
        disabled={!ready}
        onClick={() => window.google?.accounts.id.prompt()}
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
