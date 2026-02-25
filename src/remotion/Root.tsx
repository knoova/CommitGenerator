import { Composition } from "remotion";
import { config } from "@/config";
import { CommitKaraokeComposition } from "@/remotion/Composition";
import type { VideoProps } from "@/remotion/types";

const defaultProps: VideoProps = {
  commitMessage: "fix: remove haunted semicolon",
  authorName: "octocat",
  authorAvatarUrl: "https://github.com/octocat.png",
  generatedText: "Ho fixato un bug\nma ne ho creati tre\nla CI canta forte\nshippiamo anche se no",
  genre: "pop",
  myFaceUrl: "/my_face.png",
  companyLogoUrl: "/company_logo.png",
  audioUrl: "/placeholder_music.mp3",
};

export const RemotionRoot = () => {
  return (
    <Composition
      id={config.remotionCompositionId}
      component={CommitKaraokeComposition}
      durationInFrames={config.video.durationInFrames}
      fps={config.video.fps}
      width={config.video.width}
      height={config.video.height}
      defaultProps={defaultProps}
    />
  );
};
