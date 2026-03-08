interface ChampionCardProps {
  club: {
    name: string;
    shortName?: string;
    logo?: string;
  };
  tournament: string;
  year: number;
  sinceDate: string;
  accentColor: 'gold' | 'burgundy';
  href: string;
}

export function ChampionCard({
  club,
  tournament,
  year,
  sinceDate,
  accentColor,
  href,
}: ChampionCardProps) {
  const isGold = accentColor === 'gold';
  const borderColor = isGold ? 'var(--color-liga-primera)' : 'var(--color-liga-ascenso)';
  const accentText = isGold ? 'var(--color-liga-primera)' : 'var(--color-liga-ascenso)';

  return (
    <a href={href} style={{ textDecoration: 'none', border: 'none', display: 'block' }}>
      <div style={{
        background: 'var(--color-bg-secondary)',
        border: `3px solid ${borderColor}`,
        position: 'relative',
      }}>
        {/* Championship banner */}
        <div style={{
          background: borderColor,
          padding: '0.5rem 1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.8rem',
            fontWeight: 700,
            letterSpacing: '0.1em',
            color: isGold ? 'var(--color-bg-primary)' : 'var(--color-text-primary)',
            textTransform: 'uppercase',
          }}>
            {tournament}
          </span>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.8rem',
            fontWeight: 700,
            color: isGold ? 'var(--color-bg-primary)' : 'var(--color-text-primary)',
          }}>
            {year}
          </span>
        </div>

        {/* Current holder badge */}
        <div style={{
          position: 'absolute',
          top: '-10px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--color-holder)',
          color: 'var(--color-bg-primary)',
          padding: '0.25rem 0.75rem',
          fontFamily: 'var(--font-display)',
          fontSize: '0.65rem',
          fontWeight: 700,
          letterSpacing: '0.1em',
        }}>
          CAMPEON ACTUAL
        </div>

        {/* Main content - scoreboard style */}
        <div style={{
          padding: '1.5rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
        }}>
          {/* Club logo */}
          <div style={{
            width: '64px',
            height: '64px',
            background: 'var(--color-bg-primary)',
            border: `2px solid ${borderColor}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            {club.logo ? (
              <img
                src={club.logo}
                alt={club.name}
                style={{ width: '44px', height: '44px', objectFit: 'contain' }}
              />
            ) : (
              <span style={{ fontSize: '1.5rem', color: borderColor }}>?</span>
            )}
          </div>

          {/* Club info */}
          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.4rem',
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              lineHeight: 1.2,
              textTransform: 'uppercase',
            }}>
              {club.name}
            </div>
            <div style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.7rem',
              color: accentText,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              fontWeight: 600,
            }}>
              Desde {sinceDate}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          borderTop: `2px solid ${borderColor}`,
          padding: '0.5rem 1rem',
          background: 'var(--color-bg-primary)',
        }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.65rem',
            color: 'var(--color-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            textAlign: 'center',
          }}>
            Ver historial completo →
          </div>
        </div>
      </div>
    </a>
  );
}
