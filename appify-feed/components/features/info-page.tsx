import { SocialShell } from "@/components/layout/social-shell";

export function InfoPage({ title, children }: { title: string; children: React.ReactNode }) {
  return <SocialShell><section className="appify-page-card"><h2>{title}</h2>{children}</section></SocialShell>;
}
