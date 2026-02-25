import { Img, interpolate, useCurrentFrame } from "remotion";
import type { Genre } from "@/remotion/types";

const filterByGenre: Record<Genre, string> = {
  rock: "contrast(1.2) saturate(1.2) hue-rotate(-10deg)",
  pop: "contrast(1.15) saturate(1.4) hue-rotate(20deg)",
  opera: "contrast(1.05) saturate(0.95) brightness(1.1)",
  reggaeton: "contrast(1.2) saturate(1.5) hue-rotate(35deg)",
  "death-metal": "grayscale(0.7) contrast(1.4) brightness(0.8)",
};

export const AuthorAvatar = ({
  authorAvatarUrl,
  authorName,
  genre,
}: {
  authorAvatarUrl: string;
  authorName: string;
  genre: Genre;
}) => {
  const frame = useCurrentFrame();
  const wobble = Math.sin(frame / 7) * 5;
  const pulse = interpolate(Math.sin(frame / 10), [-1, 1], [0.96, 1.06]);

  return (
    <div
      style={{
        position: "absolute",
        top: 190,
        left: "50%",
        transform: `translateX(-50%) rotate(${wobble}deg) scale(${pulse})`,
        width: 180,
        height: 180,
        borderRadius: "9999px",
        overflow: "hidden",
        border: "6px solid #ffe082",
        boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
      }}
    >
      <Img
        src={authorAvatarUrl}
        alt={authorName}
        style={{ width: "100%", height: "100%", objectFit: "cover", filter: filterByGenre[genre] }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -2,
          left: 0,
          right: 0,
          textAlign: "center",
          background: "rgba(0,0,0,0.65)",
          color: "#fff",
          fontSize: 20,
          fontWeight: 700,
          padding: "4px 8px",
        }}
      >
        @{authorName}
      </div>
    </div>
  );
};
