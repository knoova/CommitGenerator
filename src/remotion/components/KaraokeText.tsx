import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { Genre } from "@/remotion/types";

const getLineStyle = (genre: Genre, frameOffset: number, active: boolean) => {
  switch (genre) {
    case "rock": {
      const shake = active ? Math.sin(frameOffset * 0.8) * 3 : 0;
      return { transform: `translateX(${shake}px)`, color: active ? "#fff176" : "#ffffff" };
    }
    case "pop": {
      const scale = active ? 1 + Math.sin(frameOffset * 0.25) * 0.05 : 1;
      return { transform: `scale(${scale})`, color: active ? "#ff9ad5" : "#ffffff" };
    }
    case "opera": {
      return {
        transform: "translateY(0px)",
        color: active ? "#c5cae9" : "#ffffff",
        fontStyle: "italic" as const,
      };
    }
    case "reggaeton": {
      const slide = active ? Math.sin(frameOffset * 0.2) * 4 : 0;
      return { transform: `translateX(${slide}px)`, color: active ? "#8dffcf" : "#ffffff" };
    }
    case "death-metal": {
      const glitch = active ? Math.sin(frameOffset * 1.6) * 2 : 0;
      return { transform: `translateX(${glitch}px)`, color: active ? "#ff5252" : "#f5f5f5" };
    }
  }
};

export const KaraokeText = ({
  text,
  genre,
  durationInFrames,
}: {
  text: string;
  genre: Genre;
  durationInFrames?: number;
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames: videoDuration } = useVideoConfig();
  const effectiveDuration = durationInFrames ?? videoDuration;

  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const segment = Math.max(20, Math.floor(effectiveDuration / Math.max(lines.length, 1)));

  return (
    <div
      style={{
        position: "absolute",
        left: 80,
        right: 80,
        top: 480,
        textAlign: "center",
        textShadow: "0 5px 18px rgba(0,0,0,0.7)",
        fontWeight: 900,
        letterSpacing: 0.5,
      }}
    >
      {lines.map((line, idx) => {
        const start = idx * segment;
        const end = start + segment;
        const visible = frame >= start && frame <= end;
        const opacity = interpolate(frame, [start - 6, start, end - 8, end + 6], [0, 1, 1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        return (
          <div
            key={`${idx}-${line}`}
            style={{
              fontSize: 56,
              lineHeight: 1.2,
              margin: "10px 0",
              opacity: visible ? opacity : 0.18,
              transition: "all 120ms linear",
              ...getLineStyle(genre, frame - start, visible),
            }}
          >
            {line}
          </div>
        );
      })}
    </div>
  );
};
