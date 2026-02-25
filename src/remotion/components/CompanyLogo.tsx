import { Img } from "remotion";

export const CompanyLogo = ({ logoUrl }: { logoUrl: string }) => (
  <div
    style={{
      position: "absolute",
      top: 32,
      left: 32,
      width: 130,
      height: 130,
      opacity: 0.7,
      borderRadius: 16,
      overflow: "hidden",
      border: "2px solid rgba(255,255,255,0.35)",
      background: "rgba(0,0,0,0.25)",
      backdropFilter: "blur(4px)",
    }}
  >
    <Img src={logoUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
  </div>
);
