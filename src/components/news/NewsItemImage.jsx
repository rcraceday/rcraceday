import "./news-item-image.css";

/**
 * News artwork on top of optional club news background (branding).
 */
export default function NewsItemImage({
  newsBackgroundUrl,
  imageUrl,
  title,
  variant = "carousel",
  className = "",
}) {
  const rootClass = [
    "news-item-image",
    `news-item-image--${variant}`,
    newsBackgroundUrl ? "news-item-image--has-club-bg" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const placeholder = title || "News";
  const useItemImageBackdrop =
    !newsBackgroundUrl && imageUrl && variant === "carousel";

  const fgClass = [
    "news-item-image-fg",
    variant === "thumb" && !newsBackgroundUrl ? "news-item-image-fg--thumb-cover" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClass}>
      {newsBackgroundUrl ? (
        <img
          className="news-item-image-club-bg"
          src={newsBackgroundUrl}
          alt=""
          aria-hidden="true"
        />
      ) : null}
      {useItemImageBackdrop ? (
        <img
          className="news-item-image-item-bg"
          src={imageUrl}
          alt=""
          aria-hidden="true"
        />
      ) : null}
      {imageUrl ? (
        <img className={fgClass} src={imageUrl} alt="" />
      ) : (
        <span className="news-item-image-placeholder">{placeholder}</span>
      )}
    </div>
  );
}

export function newsDetailHeaderStyle({ newsBackgroundUrl, brand, surfaceAlt }) {
  const surface = surfaceAlt || "#f9fafb";
  const gradient = `linear-gradient(180deg, ${brand} 0%, ${surface} 70%)`;
  if (!newsBackgroundUrl) {
    return {
      background: gradient,
      padding: "24px 0",
      borderRadius: "8px",
    };
  }
  return {
    backgroundImage: `${gradient}, url(${newsBackgroundUrl})`,
    backgroundSize: "cover, cover",
    backgroundPosition: "center, center",
    backgroundRepeat: "no-repeat, no-repeat",
    padding: "24px 0",
    borderRadius: "8px",
  };
}
