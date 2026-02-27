import { AbsoluteFill, Img } from "remotion";
import { THINKPINK_LINKS } from "@/lib/links";
import { QRCodeSVG } from "qrcode.react";

export const OutroScene = () => {
  return (
    <AbsoluteFill style={{
      background: 'linear-gradient(to bottom, #ff0080, #000000)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        marginBottom: 40
      }}>
        {THINKPINK_LINKS.map((link) => (
          <a 
            key={link.url}
            href={link.url}
            style={{
              color: 'white',
              fontSize: 24,
              textDecoration: 'none'
            }}
          >
            {link.label}
          </a>
        ))}
      </div>
      <QRCodeSVG
        value="https://www.thinkpinkstudio.it" 
        size={200}
        bgColor="#ff0080"
        fgColor="#ffffff"
      />
    </AbsoluteFill>
  );
};