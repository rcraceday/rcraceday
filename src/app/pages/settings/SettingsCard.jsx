import { settingsStyles as s } from "./settingsStyles";

export default function SettingsCard({ title, hint, children }) {
  return (
    <div style={s.card}>
      {title ? <h2 style={s.cardTitle}>{title}</h2> : null}
      {hint ? <p style={s.cardHint}>{hint}</p> : null}
      {children}
    </div>
  );
}
