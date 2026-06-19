"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { useAuth } from "@/components/auth/auth-provider";
import { api } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, refresh } = useAuth();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/feed");
  }, [loading, user, router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
          remember: form.get("remember") === "on",
        }),
      });
      await refresh();
      router.replace("/feed");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to log in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell mode="login">
      <form className="_social_login_form" onSubmit={submit}>
        <div className="_social_login_form_input _mar_b14">
          <label className="_social_login_label _mar_b8" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required className="form-control _social_login_input" />
        </div>
        <div className="_social_login_form_input _mar_b14">
          <label className="_social_login_label _mar_b8" htmlFor="password">Password</label>
          <input id="password" name="password" type="password" required className="form-control _social_login_input" />
        </div>
        <div className="row">
          <div className="col-lg-6 col-xl-6 col-md-6 col-sm-12">
            <div className="form-check _social_login_form_check">
              <input className="form-check-input _social_login_form_check_input" type="checkbox" name="remember" id="remember" defaultChecked />
              <label className="form-check-label _social_login_form_check_label" htmlFor="remember">Remember me</label>
            </div>
          </div>
          <div className="col-lg-6 col-xl-6 col-md-6 col-sm-12">
            <div className="_social_login_form_left"><p className="_social_login_form_left_para">Forgot password?</p></div>
          </div>
        </div>
        {error && <p className="appify-error">{error}</p>}
        <div className="_social_login_form_btn _mar_t40 _mar_b60">
          <button disabled={submitting} type="submit" className="_social_login_form_btn_link _btn1">{submitting ? "Logging in..." : "Login now"}</button>
        </div>
      </form>
    </AuthShell>
  );
}
