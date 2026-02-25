import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { Genre } from "@/remotion/types";

const paletteByGenre: Record<Genre, [string, string, string]> = {
  rock: ["#1a1a1a", "#d7263d", "#ff570a"],
  pop: ["#17023d", "#ff2e93", "#00d4ff"],
  opera: ["#0d1524", "#4062bb", "#a06cd5"],
  reggaeton: ["#130f40", "#ff9f1c", "#2ec4b6"],
  "death-metal": ["#000000", "#7f1d1d", "#3a0404"],
};

export const Background = ({ genre }: { genre: Genre }) => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();
  const [a, b, c] = paletteByGenre[genre];

  const drift = interpolate(frame, [0, durationInFrames], [0, 1]);

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at ${20 + drift * 50}% ${20 + drift * 30}%, ${b}, ${a} 45%, ${c})`,
        overflow: "hidden",
      }}
    >
      {Array.from({ length: 40 }).map((_, idx) => {
        const seed = idx * 17;
        const x = (seed * 37) % width;
        const y = (seed * 53) % height;
        const bob = Math.sin((frame + idx * 7) / 16) * 20;
        const scale = 0.4 + ((idx % 5) + 1) * 0.18;

        return (
          <div
            key={idx}
            style={{
              position: "absolute",
              left: x,
              top: y + bob,
              width: 20,
              height: 20,
              borderRadius: idx % 2 ? "50%" : 4,
              background: idx % 2 ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.1)",
              transform: `scale(${scale}) rotate(${frame + idx * 5}deg)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
