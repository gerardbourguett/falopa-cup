import clsx from "clsx";

import { SITE_TITLE } from "../consts";
import styles from "./Navigation.module.css";

const NAV_ITEMS = [
  { path: "/", label: "Inicio" },
  { path: "/falopa-cup", label: "Falopa Cup" },
  { path: "/copa-pablo-milad", label: "Copa Milad" },
  { path: "/blog", label: "Blog" },
  { path: "/about", label: "Acerca" },
];

export function Navigation({ currentPath = "/" }: { currentPath?: string }) {
  const isActive = (path: string) => {
    if (path === "/") return currentPath === "/";
    return currentPath.startsWith(path);
  };

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <a href="/" className={styles.brandLink}>
          <div className={styles.brand}>
            <div className={styles.brandIcon}>
              <img src="/favicon.png" alt="" className={styles.brandLogo} />
            </div>
            <div className={styles.brandText}>
              <div className={styles.title}>{SITE_TITLE}</div>
              <div className={styles.subtitle}>Campeonato No Oficial</div>
            </div>
          </div>
        </a>

        <nav className={styles.nav}>
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.path);
            return (
              <a
                key={item.path}
                href={item.path}
                className={clsx(styles.navLink, active && styles.navLinkActive)}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        <div className={styles.mobileBadge}>Menu</div>
      </div>
    </header>
  );
}
