import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, ClipboardList, History, Printer } from "lucide-react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Controle de Impressoras",
  description: "Relatorios mensais de impressao",
};

const menu = [
  { href: "/", label: "Dashboard", icon: BarChart3 },
  { href: "/impressoras", label: "Impressoras", icon: Printer },
  { href: "/relatorios", label: "Relatorios", icon: ClipboardList },
  { href: "/historico", label: "Historico", icon: History },
];

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <div className="app-shell">
          <aside className="sidebar">
            <div className="brand">
              <div className="brand-mark"><Printer size={20} /></div>
              <div><strong>Impressoras</strong><span>Controle e relatorios</span></div>
            </div>
            <nav className="main-nav" aria-label="Navegacao principal">
              {menu.map(({ href, label, icon: Icon }) => (
                <Link href={href} key={href} className="nav-link">
                  <Icon size={18} strokeWidth={1.8} /> {label}
                </Link>
              ))}
            </nav>
            <div className="sidebar-note">Banco local ou Turso<br />Pronto para Vercel</div>
          </aside>
          <main className="content">{children}</main>
        </div>
      </body>
    </html>
  );
}
