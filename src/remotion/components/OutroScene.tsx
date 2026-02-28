import { AbsoluteFill, Img, interpolate, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { THINKPINK_LINKS } from "@/lib/links";
import { QRCodeSVG } from "qrcode.react";

interface OutroSceneProps {
  variant?: 'professional' | 'minimal' | 'clean';
}

// Professional Business Card variant - MIGLIORATO
const ProfessionalOutro = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40
    }}>
          {/* Titolo principale */}
          <Sequence from={0} durationInFrames={60}>
        <div style={{
          opacity: interpolate(frame, [0, 30], [0, 1], { extrapolateLeft: 'clamp' }),
          transform: `translateY(${interpolate(frame, [0, 30], [20, 0], { extrapolateLeft: 'clamp' })}px)`
        }}>
          <h1 style={{
            fontSize: 48,
            color: '#ffffff',
            fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif',
            fontWeight: 700,
            margin: 0,
            textAlign: 'center',
            textShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
          }}>
            CONTATTACI ORA
          </h1>
          <p style={{
            fontSize: 20,
            color: 'rgba(255, 255, 255, 0.9)',
            fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif',
            margin: '10px 0 0 0',
            textAlign: 'center'
          }}>
            Scansiona il QR Code o visita i nostri siti
          </p>
        </div>
      </Sequence>

          {/* Contatti principali - URL completi */}
          <Sequence from={60}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
          marginTop: 40,
          width: '100%',
          maxWidth: 600
        }}>
          {THINKPINK_LINKS.map((link, index) => (
            <div key={link.url} style={{
              opacity: interpolate(frame - 60 - (index * 20), [0, 40], [0, 1], { extrapolateLeft: 'clamp' }),
              transform: `translateY(${interpolate(frame - 60 - (index * 20), [0, 40], [10, 0], { extrapolateLeft: 'clamp' })}px)`
            }}>
              {/* Call-to-action testuale */}
              <div style={{
                fontSize: 20,
                color: '#ffffff',
                fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif',
                marginBottom: 8,
                fontWeight: 600
              }}>
                {link.label === 'Facebook' && 'Seguici su Facebook'}
                {link.label === 'sito Italia' && 'Visita il nostro sito'}
                {link.label === 'sito Uganda' && 'Visit our website'}
                {link.label === 'LinkedIn' && 'Connettiti su LinkedIn'}
              </div>
              
              {/* URL completo grande e leggibile */}
              <a 
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'block',
                  fontSize: 24,
                  color: '#ffffff',
                  fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif',
                  textDecoration: 'none',
                  padding: '16px 24px',
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  borderRadius: '12px',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  backdropFilter: 'blur(4px)',
                  transition: 'all 0.3s ease',
                  textAlign: 'center',
                  wordBreak: 'break-all'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.25)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.3)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {link.url}
              </a>
            </div>
          ))}
        </div>
      </Sequence>

          {/* QR Code GRANDE e visibile */}
          <Sequence from={140}>
        <div style={{
          opacity: interpolate(frame - 140, [0, 60], [0, 1], { extrapolateLeft: 'clamp' }),
          transform: `scale(${interpolate(frame - 140, [0, 60], [0.5, 1], { extrapolateLeft: 'clamp' })})`,
          marginTop: 40,
          padding: 20,
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
        }}>
          <QRCodeSVG
            value="https://www.thinkpinkstudio.it" 
            size={500}
            bgColor="#ffffff"
            fgColor="#667eea"
          />
          <div style={{
            marginTop: 16,
            fontSize: 18,
            color: '#667eea',
            fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif',
            fontWeight: 600,
            textAlign: 'center'
          }}>
            thinkpinkstudio.it
          </div>
        </div>
      </Sequence>

          {/* Footer con logo */}
          <Sequence from={200}>
        <div style={{
          position: 'absolute',
          bottom: 40,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          opacity: interpolate(frame - 200, [0, 40], [0, 1], { extrapolateLeft: 'clamp' })
        }}>
          <div style={{
            width: 40,
            height: 40,
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <span style={{ fontSize: 24, fontWeight: 'bold', color: '#667eea' }}>TP</span>
          </div>
          <div style={{
            fontSize: 16,
            color: 'rgba(255, 255, 255, 0.8)',
            fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif'
          }}>
            Think Pink Studio - Web & Mobile Development
          </div>
        </div>
      </Sequence>
    </AbsoluteFill>
  );
};

// Minimal Clean variant - MIGLIORATO
const MinimalOutro = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{
      background: 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40
    }}>
          {/* Titolo */}
          <Sequence from={0} durationInFrames={40}>
        <div style={{
          opacity: interpolate(frame, [0, 30], [0, 1], { extrapolateLeft: 'clamp' }),
          transform: `translateY(${interpolate(frame, [0, 30], [20, 0], { extrapolateLeft: 'clamp' })}px)`
        }}>
          <h1 style={{
            fontSize: 42,
            color: '#333333',
            fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif',
            fontWeight: 700,
            margin: 0,
            textAlign: 'center'
          }}>
            CONTATTI
          </h1>
          <p style={{
            fontSize: 18,
            color: '#666666',
            fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif',
            margin: '8px 0 0 0',
            textAlign: 'center'
          }}>
            Restiamo in contatto
          </p>
        </div>
      </Sequence>

          {/* Contatti con URL completi */}
          <Sequence from={40}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          marginTop: 30,
          width: '100%',
          maxWidth: 500
        }}>
          {THINKPINK_LINKS.map((link, index) => (
            <div key={link.url} style={{
              opacity: interpolate(frame - 40 - (index * 15), [0, 30], [0, 1], { extrapolateLeft: 'clamp' }),
              transform: `translateY(${interpolate(frame - 40 - (index * 15), [0, 30], [10, 0], { extrapolateLeft: 'clamp' })}px)`
            }}>
              {/* Label descrittiva */}
              <div style={{
                fontSize: 16,
                color: '#333333',
                fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif',
                marginBottom: 6,
                fontWeight: 600
              }}>
                {link.label === 'Facebook' && 'Facebook'}
                {link.label === 'sito Italia' && 'Sito Web'}
                {link.label === 'sito Uganda' && 'Website'}
                {link.label === 'LinkedIn' && 'LinkedIn'}
              </div>
              
              {/* URL completo */}
              <a 
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'block',
                  fontSize: 20,
                  color: '#667eea',
                  fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif',
                  textDecoration: 'none',
                  padding: '12px 16px',
                  backgroundColor: 'rgba(102, 126, 234, 0.1)',
                  borderRadius: '8px',
                  border: '1px solid rgba(102, 126, 234, 0.2)',
                  transition: 'all 0.3s ease',
                  textAlign: 'center',
                  wordBreak: 'break-all'
                }}
              >
                {link.url}
              </a>
            </div>
          ))}
        </div>
      </Sequence>

          {/* QR Code grande */}
          <Sequence from={100}>
        <div style={{
          opacity: interpolate(frame - 100, [0, 50], [0, 1], { extrapolateLeft: 'clamp' }),
          transform: `scale(${interpolate(frame - 100, [0, 50], [0.5, 1], { extrapolateLeft: 'clamp' })})`,
          marginTop: 30,
          padding: 16,
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)'
        }}>
          <QRCodeSVG
            value="https://www.thinkpinkstudio.it" 
            size={400}
            bgColor="#ffffff"
            fgColor="#667eea"
          />
          <div style={{
            marginTop: 12,
            fontSize: 16,
            color: '#667eea',
            fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif',
            fontWeight: 600,
            textAlign: 'center'
          }}>
            thinkpinkstudio.it
          </div>
        </div>
      </Sequence>
    </AbsoluteFill>
  );
};

// Clean Business variant - MIGLIORATO
const CleanOutro = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{
      background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40
    }}>
          {/* Header */}
          <Sequence from={0} durationInFrames={40}>
        <div style={{
          opacity: interpolate(frame, [0, 30], [0, 1], { extrapolateLeft: 'clamp' }),
          transform: `translateY(${interpolate(frame, [0, 30], [20, 0], { extrapolateLeft: 'clamp' })}px)`
        }}>
          <div style={{
            fontSize: 36,
            color: '#2c3e50',
            fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif',
            fontWeight: 700,
            margin: 0,
            textAlign: 'center'
          }}>
            PUNTI DI CONTATTO
          </div>
          <div style={{
            fontSize: 16,
            color: '#6c757d',
            fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif',
            margin: '8px 0 0 0',
            textAlign: 'center'
          }}>
            Scegli il canale che preferisci
          </div>
        </div>
      </Sequence>

          {/* Contatti strutturati */}
          <Sequence from={40}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
          marginTop: 30,
          width: '100%',
          maxWidth: 700
        }}>
          {THINKPINK_LINKS.map((link, index) => (
            <div key={link.url} style={{
              opacity: interpolate(frame - 40 - (index * 12), [0, 30], [0, 1], { extrapolateLeft: 'clamp' }),
              transform: `translateY(${interpolate(frame - 40 - (index * 12), [0, 30], [10, 0], { extrapolateLeft: 'clamp' })}px)`
            }}>
              <div style={{
                backgroundColor: '#ffffff',
                padding: '16px',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                border: '1px solid #dee2e6',
                transition: 'all 0.3s ease'
              }}>
                {/* Icona e label */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  marginBottom: 8
                }}>
                  <span style={{
                    width: 10,
                    height: 10,
                    backgroundColor: '#667eea',
                    borderRadius: '50%'
                  }}></span>
                  <span style={{
                    fontSize: 14,
                    color: '#495057',
                    fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    {link.label === 'Facebook' && 'Facebook'}
                    {link.label === 'sito Italia' && 'Sito Web'}
                    {link.label === 'sito Uganda' && 'Website'}
                    {link.label === 'LinkedIn' && 'LinkedIn'}
                  </span>
                </div>
                
                {/* URL completo */}
                <a 
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: 16,
                    color: '#667eea',
                    fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif',
                    textDecoration: 'none',
                    display: 'block',
                    padding: '8px 0',
                    borderBottom: '1px solid #e9ecef',
                    transition: 'color 0.3s ease'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.color = '#5a67d8'}
                  onMouseOut={(e) => e.currentTarget.style.color = '#667eea'}
                >
                  {link.url}
                </a>
              </div>
            </div>
          ))}
        </div>
      </Sequence>

          {/* QR Code centrale grande */}
          <Sequence from={120}>
        <div style={{
          opacity: interpolate(frame - 120, [0, 50], [0, 1], { extrapolateLeft: 'clamp' }),
          transform: `scale(${interpolate(frame - 120, [0, 50], [0.5, 1], { extrapolateLeft: 'clamp' })})`,
          marginTop: 40,
          padding: 20,
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
          border: '2px solid #dee2e6'
        }}>
          <QRCodeSVG
            value="https://www.thinkpinkstudio.it" 
            size={450}
            bgColor="#ffffff"
            fgColor="#2c3e50"
          />
          <div style={{
            marginTop: 16,
            fontSize: 18,
            color: '#2c3e50',
            fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif',
            fontWeight: 600,
            textAlign: 'center'
          }}>
            thinkpinkstudio.it
          </div>
          <div style={{
            fontSize: 14,
            color: '#6c757d',
            fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif',
            textAlign: 'center',
            marginTop: 4
          }}>
            Scansiona per visitare il sito
          </div>
        </div>
      </Sequence>
    </AbsoluteFill>
  );
};

export const OutroScene: React.FC<OutroSceneProps> = ({ variant = 'professional' }) => {
  switch (variant) {
    case 'minimal':
      return <MinimalOutro />;
    case 'clean':
      return <CleanOutro />;
    default:
      return <ProfessionalOutro />;
  }
};
