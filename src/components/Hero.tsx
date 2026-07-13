import styles from "./Hero.module.css";
import { ButtonLink } from "./ui/ButtonLink";

interface HeroProps {
  title: string;
  subtitle: string;
  description: string;
  year: number;
  bulletinLabel?: string;
  bulletinTitle?: string;
  bulletinMeta?: string;
  tickerItems?: string[];
}

export function Hero({
  title,
  subtitle,
  description,
  year,
  bulletinLabel = "Última edición",
  bulletinTitle = "Campeonato itinerante activo",
  bulletinMeta = "Datos al día",
  tickerItems = [],
}: HeroProps) {
  const tickerText = tickerItems.filter(Boolean).join(" · ");

  return (
    <section className={styles.hero}>
      <div className={styles.paperLabel}>Diario no oficial del fútbol chileno</div>

      <div className={styles.heroGrid}>
        <div className={styles.content}>
          <div className={styles.seasonBadge}>TEMPORADA {year}</div>
          <p className={styles.kicker}>Especial títulos cursed</p>
          <h1 className={styles.title}>{title}</h1>
          <div className={styles.subtitle}>{subtitle}</div>

          <div className={styles.descriptionPanel}>
            <p className={styles.description}>{description}</p>
          </div>

          <div className={styles.actions}>
            <ButtonLink href="/falopa-cup">Ver Historial</ButtonLink>
            <a className={styles.secondaryLink} href="/conference-league-sudamericana">
              Especial Conference →
            </a>
          </div>
        </div>

        <aside className={styles.bulletin} aria-label="Última noticia">
          <div className={styles.bulletinHeader}>
            <span>{bulletinLabel}</span>
            <strong>{year}</strong>
          </div>
          <p className={styles.bulletinTitle}>{bulletinTitle}</p>
          <p className={styles.bulletinMeta}>{bulletinMeta}</p>
          <div className={styles.signalBar} aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </div>
        </aside>
      </div>

      {tickerText && (
        <div className={styles.ticker} aria-label="Resumen de actualidad">
          <span className={styles.tickerLabel}>Último minuto</span>
          <span className={styles.tickerText}>{tickerText}</span>
        </div>
      )}
    </section>
  );
}
