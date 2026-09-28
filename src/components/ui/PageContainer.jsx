export default function PageContainer({ children, className = "" }) {
  const classes = ["app-page-main", className].filter(Boolean).join(" ");
  return <main className={classes}>{children}</main>;
}
