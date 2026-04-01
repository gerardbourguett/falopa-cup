import styles from "./Hero.module.css";
import { ButtonLink } from "./ui/ButtonLink";

interface HeroProps {
  title: string;
  subtitle: string;
  description: string;
  year: number;
}

export function Hero({ title, subtitle, description, year }: HeroProps) {
  return (
    <section className={styles.hero}>
      <div className={styles.seasonBadge}>
        TEMPORADA {year}
      </div>

      <div className={styles.content}>
        <h1 className={styles.title}>{title}</h1>

        <div className={styles.subtitle}>{subtitle}</div>

        <div className={styles.descriptionPanel}>
          <p className={styles.description}>{description}</p>
        </div>

        <ButtonLink href="/falopa-cup">
          Ver Historial
        </ButtonLink>
      </div>

      <div className={styles.leagueBadge}>
        <div>LIGA</div>
        <div>ASCENSO</div>
      </div>
    </section>
  );
}
