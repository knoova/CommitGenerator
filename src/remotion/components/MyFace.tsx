import { Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export const MyFace = ({ faceUrl }: { faceUrl: string }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bounce = spring({ frame, fps, config: { damping: 14, mass: 0.5 } });
  const talk = 1 + Math.sin(frame / 3) * 0.03;
  const rotate = interpolate(frame % 120, [0, 60, 120], [-3, 3, -3]);

  return (
    <div
      style={{
        position: "absolute",
        right: 38,
        bottom: 48,
        width: 260,
        height: 260,
        borderRadius: 9999,
        overflow: "hidden",
        border: "5px solid rgba(255,255,255,0.6)",
        transform: `translateY(${(1 - bounce) * 40}px) scale(${talk}) rotate(${rotate}deg)`,
        boxShadow: "0 20px 50px rgba(0,0,0,0.45)",
      }}
    >
      <Img src={faceUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </div>
  );
};
