import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In — CyneMora",
  description: "Sign in to your CyneMora production workspace.",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
