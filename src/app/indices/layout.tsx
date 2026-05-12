import { IndicesShell } from "@/components/indices/indices-shell";

export default function IndicesLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <IndicesShell>{children}</IndicesShell>;
}
