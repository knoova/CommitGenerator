import { AbsoluteFill, Img } from "remotion";
import type { VideoProps } from "@/remotion/types";

type IntroSceneProps = Pick<VideoProps, 'companyLogoUrl' | 'myFaceUrl'>;

export const IntroScene = ({ companyLogoUrl, myFaceUrl }: IntroSceneProps) => {
  return (
    <AbsoluteFill style={{
      background: 'linear-gradient(to bottom, #ff0080, #000000)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <Img 
        src={companyLogoUrl} 
        style={{ 
          width: 200, 
          height: 200,
          marginBottom: 40 
        }} 
      />
      <Img 
        src={myFaceUrl} 
        style={{ 
          width: 400, 
          height: 400,
          borderRadius: '50%',
          marginBottom: 40
        }} 
      />
      <h1 style={{ 
        color: 'white', 
        fontSize: 60,
        fontFamily: 'sans-serif'
      }}>
        ThinkPink Studio
      </h1>
    </AbsoluteFill>
  );
};