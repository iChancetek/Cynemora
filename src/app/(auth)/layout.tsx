import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In — Cynemora",
  description: "Sign in to your Cynemora production workspace.",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
