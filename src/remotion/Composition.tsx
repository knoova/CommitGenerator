import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { AuthorAvatar } from "@/remotion/components/AuthorAvatar";
import { Background } from "@/remotion/components/Background";
import { CompanyLogo } from "@/remotion/components/CompanyLogo";
import { IntroScene } from "@/remotion/components/IntroScene";
import { KaraokeText } from "@/remotion/components/KaraokeText";
import { MyFace } from "@/remotion/components/MyFace";
import { OutroScene } from "@/remotion/components/OutroScene";
import type { VideoProps } from "@/remotion/types";

const resolveAsset = (url: string) =>
  url.startsWith("http") ? url : staticFile(url.replace(/^\//, ""));

export const CommitKaraokeComposition = (props: VideoProps) => {
  const audioSource = resolveAsset(props.audioUrl);
  const logoSource = resolveAsset(props.companyLogoUrl);
  const faceSource = resolveAsset(props.myFaceUrl);
  const avatarSource = resolveAsset(props.authorAvatarUrl);

  return (
    <>
      <Sequence durationInFrames={120} name="Intro">
        <IntroScene companyLogoUrl={logoSource} myFaceUrl={faceSource} />
      </Sequence>
      <Sequence from={120} durationInFrames={300} name="Main">
        <AbsoluteFill>
          <Background genre={props.genre} />
          <CompanyLogo logoUrl={logoSource} />
          <AuthorAvatar
            authorAvatarUrl={avatarSource}
            authorName={props.authorName}
            genre={props.genre}
          />
          <KaraokeText 
            text={props.generatedText} 
            genre={props.genre}
            durationInFrames={300}
          />
          <MyFace faceUrl={faceSource} />
          <Audio src={audioSource} />
        </AbsoluteFill>
      </Sequence>
      <Sequence from={420} durationInFrames={120} name="Outro">
        <OutroScene />
      </Sequence>
    </>
  );
};
