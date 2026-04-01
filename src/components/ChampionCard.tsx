import type { CSSProperties } from "react";

import styles from "./ChampionCard.module.css";

interface ChampionCardProps {
  club: {
    name: string;
    shortName?: string;
    logo?: string;
  };
  tournament: string;
  year: number;
  sinceDate: string;
  nextDuel?: string;
  accentColor: 'gold' | 'burgundy';
  href: string;
}

export function ChampionCard({
  club,
  tournament,
  year,
  sinceDate,
  nextDuel,
  accentColor,
  href,
}: ChampionCardProps) {
  const isGold = accentColor === 'gold';
  const borderColor = isGold ? 'var(--color-liga-primera)' : 'var(--color-liga-ascenso)';
  const accentText = isGold ? 'var(--color-liga-primera)' : 'var(--color-liga-ascenso)';
  const colorVars = {
    "--card-accent": borderColor,
    "--card-accent-contrast": isGold ? 'var(--color-bg-primary)' : 'var(--color-text-primary)',
    "--card-accent-text": accentText,
  } as CSSProperties;

  return (
    <a href={href} className={styles.link}>
      <div className={styles.card} style={colorVars}>
        <div className={styles.banner}>
          <span className={styles.bannerText}>
            {tournament}
          </span>
          <span className={styles.year}>{year}</span>
        </div>

        <div className={styles.badge}>
          CAMPEON ACTUAL
        </div>

        <div className={styles.content}>
          <div className={styles.logoFrame}>
            {club.logo ? (
              <img
                src={club.logo}
                alt={club.name}
                className={styles.logo}
              />
            ) : (
              <span className={styles.logoFallback}>?</span>
            )}
          </div>

          <div className={styles.clubInfo}>
            <div className={styles.clubName}>
              {club.name}
            </div>
            <div className={styles.sinceDate}>
              Desde {sinceDate}
            </div>
            {nextDuel && (
              <div className={styles.nextDuel}>
                Siguiente duelo: {nextDuel}
              </div>
            )}
          </div>
        </div>

        <div className={styles.footer}>
          <div className={styles.footerText}>
            Ver historial completo →
          </div>
        </div>
      </div>
    </a>
  );
}
