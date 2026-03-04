import { AbsoluteFill, Img } from "remotion";

type IntroSceneProps = {
  companyLogoUrl: string;
  myFaceUrl: string;
  bannerUrl: string;
};

export const IntroScene = ({ companyLogoUrl, myFaceUrl, bannerUrl}: IntroSceneProps) => {
  return (
    <AbsoluteFill style={{
      background: 'linear-gradient(to bottom, #ff0080, #000000)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 40,
        marginBottom: 40,
      }}>
        <div style={{
          width: '80%',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}>
          <Img 
            src={bannerUrl} 
            style={{ 
              width: '100%',
              height: 'auto',
              objectFit: 'contain'
            }} 
          />
        </div>
        <div style={{
          width: 120,
          height: 120,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Img 
            src={companyLogoUrl} 
            style={{ 
              width: 80, 
              height: 80,
              objectFit: 'contain'
            }} 
          />
        </div>
      </div>
      <h1 style={{ 
        color: 'white', 
        fontSize: 60,
        fontFamily: 'sans-serif'
      }}>
        Commit Karaoke
      </h1>
      <p style={{
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 24,
        fontFamily: 'sans-serif',
        marginTop: 10
      }}>
        La musica dei tuoi commit
      </p>
    </AbsoluteFill>
  );
};
