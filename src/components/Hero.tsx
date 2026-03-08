interface HeroProps {
  title: string;
  subtitle: string;
  description: string;
  year: number;
}

export function Hero({ title, subtitle, description, year }: HeroProps) {
  return (
    <section style={{
      padding: '4rem 1rem',
      background: 'var(--color-bg-primary)',
      borderBottom: '3px solid var(--color-bg-elevated)',
      position: 'relative',
    }}>
      {/* Scoreboard decoration */}
      <div style={{
        position: 'absolute',
        top: '1rem',
        left: '1rem',
        background: 'var(--color-liga-primera)',
        color: 'var(--color-bg-primary)',
        padding: '0.5rem 1rem',
        fontFamily: 'var(--font-scoreboard)',
        fontSize: '0.75rem',
        fontWeight: 700,
      }}>
        TEMPORADA {year}
      </div>

      <div style={{
        maxWidth: '700px',
        margin: '0 auto',
        textAlign: 'center',
        paddingTop: '1rem',
      }}>
        {/* Title */}
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(2.5rem, 8vw, 5rem)',
          fontWeight: 700,
          letterSpacing: '0.05em',
          lineHeight: 1,
          marginBottom: '0.5rem',
          color: 'var(--color-text-primary)',
        }}>
          {title}
        </h1>

        {/* Subtitle */}
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1rem',
          color: 'var(--color-text-muted)',
          marginBottom: '1.5rem',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
        }}>
          {subtitle}
        </div>

        {/* Description - newspaper style */}
        <div style={{
          background: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-bg-elevated)',
          padding: '1.25rem',
          marginBottom: '2rem',
          textAlign: 'left',
        }}>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: '1rem',
            color: 'var(--color-text-secondary)',
            margin: 0,
            lineHeight: 1.7,
          }}>
            {description}
          </p>
        </div>

        {/* CTA */}
        <a
          href="/falopa-cup"
          style={{
            display: 'inline-block',
            padding: '0.875rem 2rem',
            background: 'var(--color-liga-primera)',
            color: 'var(--color-bg-primary)',
            fontFamily: 'var(--font-display)',
            fontSize: '1rem',
            fontWeight: 700,
            letterSpacing: '0.1em)',
            textTransform: 'uppercase',
            textDecoration: 'none',
            borderRadius: '0',
          }}
        >
          Ver Historial
        </a>
      </div>

      {/* Right decoration - match result style */}
      <div style={{
        position: 'absolute',
        top: '1rem',
        right: '1rem',
        background: 'var(--color-bg-secondary)',
        border: '2px solid var(--color-liga-ascenso)',
        padding: '0.5rem 0.75rem',
        fontFamily: 'var(--font-scoreboard)',
        fontSize: '0.7rem',
        color: 'var(--color-liga-ascenso)',
        textAlign: 'center',
      }}>
        <div style={{ fontWeight: 700 }}>LIGA</div>
        <div style={{ fontWeight: 700 }}>ASCENSO</div>
      </div>
    </section>
  );
}
