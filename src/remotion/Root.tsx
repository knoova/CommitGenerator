import { Composition } from "remotion";
import { CommitKaraokeComposition } from "@/remotion/Composition";
import type { VideoProps } from "@/remotion/types";

// Inline values to keep this file browser-safe (no process.env / Node.js deps).
// Must stay in sync with the "video" block in src/config.ts.
const COMPOSITION_ID = "CommitKaraoke";
const VIDEO = { width: 1080, height: 1920, fps: 30, durationInFrames: 540 } as const;

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
      id={COMPOSITION_ID}
      component={CommitKaraokeComposition}
      durationInFrames={VIDEO.durationInFrames}
      fps={VIDEO.fps}
      width={VIDEO.width}
      height={VIDEO.height}
      defaultProps={defaultProps}
    />
  );
};
