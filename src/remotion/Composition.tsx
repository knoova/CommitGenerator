import { AbsoluteFill, Audio, staticFile } from "remotion";
import { AuthorAvatar } from "@/remotion/components/AuthorAvatar";
import { Background } from "@/remotion/components/Background";
import { CompanyLogo } from "@/remotion/components/CompanyLogo";
import { KaraokeText } from "@/remotion/components/KaraokeText";
import { MyFace } from "@/remotion/components/MyFace";
import type { VideoProps } from "@/remotion/types";

const resolveAsset = (url: string) =>
  url.startsWith("http") ? url : staticFile(url.replace(/^\//, ""));

export const CommitKaraokeComposition = (props: VideoProps) => {
  const audioSource = resolveAsset(props.audioUrl);
  const logoSource = resolveAsset(props.companyLogoUrl);
  const faceSource = resolveAsset(props.myFaceUrl);
  const avatarSource = resolveAsset(props.authorAvatarUrl);

  return (
    <AbsoluteFill>
      <Background genre={props.genre} />
      <CompanyLogo logoUrl={logoSource} />
      <AuthorAvatar
        authorAvatarUrl={avatarSource}
        authorName={props.authorName}
        genre={props.genre}
      />
      <KaraokeText text={props.generatedText} genre={props.genre} />
      <MyFace faceUrl={faceSource} />

      <div
        style={{
          position: "absolute",
          left: 40,
          right: 40,
          bottom: 52,
          fontSize: 24,
          fontWeight: 600,
          opacity: 0.85,
          textAlign: "left",
        }}
      >
        Commit: {props.commitMessage}
      </div>

      <Audio src={audioSource} />
    </AbsoluteFill>
  );
};
