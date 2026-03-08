import { SITE_TITLE } from '../consts';

export function Navigation({ currentPath = '/' }: { currentPath?: string }) {
  const isActive = (path: string) => {
    if (path === '/') return currentPath === '/';
    return currentPath.startsWith(path);
  };

  return (
    <header style={{
      background: '#000000',
      borderBottom: '3px solid var(--color-liga-primera)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
        padding: '0.75rem 1rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        {/* Logo */}
        <a href="/" style={{ textDecoration: 'none', border: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px',
            }}>
              <img
                src="/favicon.png"
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>
            <div>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.5rem',
                fontWeight: 700,
                color: 'var(--color-liga-primera)',
                letterSpacing: '0.05em',
                lineHeight: 1,
              }}>
                {SITE_TITLE}
              </div>
              <div style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.6rem',
                color: '#888888',
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
              }}>
                Campeonato No Oficial
              </div>
            </div>
          </div>
        </a>

        {/* Nav */}
        <nav style={{
          display: 'flex',
          gap: '0.25rem',
        }} className="nav-desktop">
          {[
            { path: '/', label: 'Inicio' },
            { path: '/falopa-cup', label: 'Falopa Cup' },
            { path: '/copa-pablo-milad', label: 'Copa Milad' },
            { path: '/blog', label: 'Blog' },
            { path: '/about', label: 'Acerca' },
          ].map((item) => {
            const active = isActive(item.path);
            return (
              <a
                key={item.path}
                href={item.path}
                style={{
                  color: active ? '#000000' : '#ffffff',
                  background: active ? 'var(--color-liga-primera)' : 'transparent',
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  textDecoration: 'none',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0',
                  transition: 'none',
                }}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        {/* Mobile */}
        <div className="nav-mobile" style={{ display: 'none' }}>
          <span style={{
            color: 'var(--color-liga-primera)',
            fontFamily: 'var(--font-display)',
            fontSize: '0.85rem',
            fontWeight: 600,
          }}>
            MENU
          </span>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .nav-desktop { display: none !important; }
          .nav-mobile { display: block !important; }
        }
      `}</style>
    </header>
  );
}
