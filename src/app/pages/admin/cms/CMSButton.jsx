import React, { useState } from "react";
import { cmsStyles } from "./styles";

export default function CMSButton({
  children,
  onClick,
  disabled = false,
  variant = "primary",
  type = "button",
  style = {},
}) {
  const [isHover, setIsHover] = useState(false);
  const [isActive, setIsActive] = useState(false);

  const base = cmsStyles.buttonBase;

  const variants = {
    primary: cmsStyles.buttonPrimary,
    secondary: cmsStyles.buttonSecondary,
  };

  // -----------------------------
  // HOVER + ACTIVE STATES (GREY)
  // -----------------------------
  const hoverStyles = !disabled
    ? {
        filter: "brightness(0.96)",
      }
    : {};

  const activeStyles = !disabled
    ? {
        filter: "brightness(0.90)",
        transform: "scale(0.98)",
      }
    : {};

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => {
        setIsHover(false);
        setIsActive(false);
      }}
      onMouseDown={() => setIsActive(true)}
      onMouseUp={() => setIsActive(false)}
      style={{
        ...base,
        ...variants[variant],
        ...(disabled ? cmsStyles.buttonDisabled : {}),
        ...(isHover ? hoverStyles : {}),
        ...(isActive ? activeStyles : {}),
        ...style,
      }}
    >
      {children}
    </button>
  );
}
