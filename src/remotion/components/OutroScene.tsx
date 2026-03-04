import { AbsoluteFill, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { config } from "@/config";

type OutroSceneProps = {
  variant?: "professional" | "minimal" | "clean";
};


const resolveAsset = (url: string) =>
  url.startsWith("http") ? url : staticFile(url.replace(/^\//, "")); 

export const OutroScene = ({ variant = "professional" }: OutroSceneProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = interpolate(frame, [0, fps * 0.5, fps * 1.5, fps * 2], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const scale = interpolate(frame, [0, fps * 0.5], [0.8, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const getStyles = () => {
    switch (variant) {
      case "minimal":
        return {
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          textColor: "#ffffff",
          accentColor: "#ffffff",
        };
      case "clean":
        return {
          background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
          textColor: "#ffffff",
          accentColor: "#ffffff",
        };
      default:
        return {
          background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
          textColor: "#ffffff",
          accentColor: "#ffffff",
        };
    }
  };

  const styles = getStyles();

  return (
    <AbsoluteFill
      style={{
        opacity,
        transform: `scale(${scale})`,
        background: styles.background,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 30,
          padding: "40px 60px",
          background: "rgba(255, 255, 255, 0.1)",
          borderRadius: 24,
          backdropFilter: "blur(20px)",
          border: "2px solid rgba(255, 255, 255, 0.3)",
          textAlign: "center",
          maxWidth: "80%",
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 48,
            fontWeight: "bold",
            color: styles.textColor,
            textShadow: "3px 3px 6px rgba(0,0,0,0.4)",
            lineHeight: 1.2,
          }}
        >
          GRAZIE PER AVER
          <br />
          SOPPORTATO
          <br />
          QUESTO COMMIT!
        </h2>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            padding: "20px 40px",
            background: "rgba(255, 255, 255, 0.15)",
            borderRadius: 16,
            border: "1px solid rgba(255, 255, 255, 0.3)",
          }}
        >
          <div
            style={{
              width: 100,
              height: 100,
              background: "rgba(255, 255, 255, 0.2)",
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "2px solid rgba(255, 255, 255, 0.4)",
            }}
          >
            <img
              src={resolveAsset(config.COMPANY_LOGO_URL)}
              alt="Logo"
              style={{
                width: 60,
                height: 60,
                objectFit: "contain",
              }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <h3
              style={{
                margin: 0,
                fontSize: 28,
                fontWeight: "bold",
                color: styles.textColor,
                textShadow: "2px 2px 4px rgba(0,0,0,0.3)",
              }}
            >
              Think Pink Studio
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: 16,
                color: styles.textColor,
                opacity: 0.9,
              }}
            >
              Web & Mobile Development
            </p>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            padding: "20px 40px",
            background: "rgba(255, 255, 255, 0.15)",
            borderRadius: 16,
            border: "1px solid rgba(255, 255, 255, 0.3)",
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: "bold",
              color: styles.textColor,
            }}
          >
            Seguici per altri capolavori:
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <a
              href="https://www.facebook.com/thinkpinkphoto"
              style={{
                color: styles.textColor,
                textDecoration: "none",
                fontSize: 18,
                padding: "12px 24px",
                background: "rgba(255, 255, 255, 0.1)",
                borderRadius: 12,
                border: "1px solid rgba(255, 255, 255, 0.3)",
                transition: "all 0.3s ease",
                fontWeight: "bold",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.25)";
                e.currentTarget.style.transform = "translateX(6px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                e.currentTarget.style.transform = "translateX(0)";
              }}
            >
              Facebook
            </a>
            <a
              href="https://www.youtube.com/@thinkpinkphoto"
              style={{
                color: styles.textColor,
                textDecoration: "none",
                fontSize: 18,
                padding: "12px 24px",
                background: "rgba(255, 255, 255, 0.1)",
                borderRadius: 12,
                border: "1px solid rgba(255, 255, 255, 0.3)",
                transition: "all 0.3s ease",
                fontWeight: "bold",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.25)";
                e.currentTarget.style.transform = "translateX(6px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                e.currentTarget.style.transform = "translateX(0)";
              }}
            >
              YouTube
            </a>
            <a
              href="https://www.thinkpinkstudio.it"
              style={{
                color: styles.textColor,
                textDecoration: "none",
                fontSize: 18,
                padding: "12px 24px",
                background: "rgba(255, 255, 255, 0.1)",
                borderRadius: 12,
                border: "1px solid rgba(255, 255, 255, 0.3)",
                transition: "all 0.3s ease",
                fontWeight: "bold",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.25)";
                e.currentTarget.style.transform = "translateX(6px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                e.currentTarget.style.transform = "translateX(0)";
              }}
            >
              Visita il sito
            </a>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};


