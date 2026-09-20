// src/components/ui/ClubHero.jsx
import useTheme from "@app/providers/useTheme";

export default function ClubHero({ variant = "medium", showLogo = true }) {
  const { palette } = useTheme();

  const hasBgImage = Boolean(palette?.hero?.backgroundImage);
  const bgImage = palette?.hero?.backgroundImage || null;
  const bgColor = palette?.hero?.backgroundColor || "transparent";
  const logo = palette?.hero?.logo || null;

  const variants = {
    large: {
      fullHeight: "360px",
      collapsedHeight: "120px",
      padding: "40px",
      logoSize: "240px",
    },
    medium: {
      fullHeight: "240px",
      collapsedHeight: "100px",
      padding: "24px",
      logoSize: "180px",
    },
    small: {
      fullHeight: "180px",
      collapsedHeight: "80px",
      padding: "16px",
      logoSize: "140px",
    },
    tiny: {
      fullHeight: "120px",
      collapsedHeight: "60px",
      padding: "12px",
      logoSize: "100px",
    },
  };

  const v = variants[variant] || variants.medium;
  const height = hasBgImage ? v.fullHeight : v.collapsedHeight;

  return (
    <section
      className="w-full flex items-center justify-center"
      style={{
        height,
        paddingTop: v.padding,
        paddingBottom: v.padding,
        backgroundImage: hasBgImage ? `url(${bgImage})` : "none",
        backgroundColor: hasBgImage ? "transparent" : bgColor,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {showLogo && logo && (
        <img
          src={logo}
          alt="Club Logo"
          style={{
            width: v.logoSize,
            height: "auto",
            objectFit: "contain",
          }}
        />
      )}
    </section>
  );
}
