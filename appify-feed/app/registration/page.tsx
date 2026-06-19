"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { useAuth } from "@/components/auth/auth-provider";
import { api } from "@/lib/api";

export default function RegistrationPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await api("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          firstName: form.get("firstName"),
          lastName: form.get("lastName"),
          email: form.get("email"),
          password: form.get("password"),
          confirmPassword: form.get("confirmPassword"),
          acceptedTerms: form.get("acceptedTerms") === "on",
        }),
      });
      await refresh();
      router.replace("/feed");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to register.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell mode="registration">
      <form className="_social_registration_form" onSubmit={submit}>
        <div className="appify-auth-name-row">
          <div className="_social_registration_form_input _mar_b14">
            <label className="_social_registration_label _mar_b8" htmlFor="firstName">First name</label>
            <input id="firstName" name="firstName" required className="form-control _social_registration_input" />
          </div>
          <div className="_social_registration_form_input _mar_b14">
            <label className="_social_registration_label _mar_b8" htmlFor="lastName">Last name</label>
            <input id="lastName" name="lastName" required className="form-control _social_registration_input" />
          </div>
        </div>
        <div className="_social_registration_form_input _mar_b14">
          <label className="_social_registration_label _mar_b8" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required className="form-control _social_registration_input" />
        </div>
        <div className="_social_registration_form_input _mar_b14">
          <label className="_social_registration_label _mar_b8" htmlFor="password">Password</label>
          <input id="password" name="password" type="password" minLength={8} required className="form-control _social_registration_input" />
        </div>
        <div className="_social_registration_form_input _mar_b14">
          <label className="_social_registration_label _mar_b8" htmlFor="confirmPassword">Repeat Password</label>
          <input id="confirmPassword" name="confirmPassword" type="password" minLength={8} required className="form-control _social_registration_input" />
        </div>
        <div className="form-check _social_registration_form_check">
          <input className="form-check-input _social_registration_form_check_input" type="checkbox" name="acceptedTerms" id="acceptedTerms" required />
          <label className="form-check-label _social_registration_form_check_label" htmlFor="acceptedTerms">I agree to terms &amp; conditions</label>
        </div>
        {error && <p className="appify-error">{error}</p>}
        <div className="_social_registration_form_btn _mar_t40 _mar_b60">
          <button disabled={submitting} type="submit" className="_social_registration_form_btn_link _btn1">{submitting ? "Creating account..." : "Register now"}</button>
        </div>
      </form>
    </AuthShell>
  );
}
