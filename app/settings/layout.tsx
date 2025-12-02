import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "設定 - まとめるん",
  description: "まとめるんの各種設定を行います。",
};

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
