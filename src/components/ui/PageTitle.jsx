export default function PageTitle({
  icon: Icon,
  title,
  children,
  actions,
  style,
}) {
  return (
    <div className="page-title" style={style}>
      <div className="page-title-inner">
        {Icon && (
          <Icon className="page-title-icon" style={style} />
        )}

        <div className="page-title-content">
          <h1>{title}</h1>
          {children}
        </div>

        {actions && (
          <div className="page-title-actions">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}