export const settingsStyles = {
  pageContainer: {
    width: "100%",
    color: "#111827",
    minWidth: 0,
    boxSizing: "border-box",
  },

  pageContent: {
    width: "100%",
    padding: "20px 0 32px",
    minWidth: 0,
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  },

  sectionHeader: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    minWidth: 0,
    flex: 1,
  },

  sectionHeaderWithActions: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: "16px",
  },

  sectionHeaderTitle: {
    fontSize: "22px",
    fontWeight: 600,
    lineHeight: 1.25,
    margin: 0,
    color: "#111827",
  },

  sectionHeaderSubtitle: {
    fontSize: "13px",
    lineHeight: 1.5,
    color: "#6B7280",
    margin: 0,
  },

  backButton: {
    padding: "4px 10px",
    fontSize: "12px",
    fontWeight: 600,
    borderRadius: "4px",
    border: "1px solid #D1D5DB",
    backgroundColor: "#F3F4F6",
    color: "#111827",
    cursor: "pointer",
    flexShrink: 0,
    height: 28,
  },

  card: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    border: "1px solid #E5E7EB",
    borderRadius: "6px",
    padding: "16px",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },

  cardTitle: {
    fontSize: "16px",
    fontWeight: 600,
    color: "#111827",
    margin: 0,
  },

  cardHint: {
    fontSize: "13px",
    lineHeight: 1.5,
    color: "#6B7280",
    margin: 0,
  },

  fieldGrid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "12px",
  },

  fieldGrid2: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "12px",
  },

  menuCard: {
    backgroundColor: "#FFFFFF",
    border: "1px solid #E5E7EB",
    borderRadius: "6px",
    padding: "14px 16px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    cursor: "pointer",
  },

  menuTitle: {
    fontSize: "16px",
    fontWeight: 600,
    color: "#111827",
    lineHeight: "20px",
  },

  menuDesc: {
    marginTop: "4px",
    fontSize: "13px",
    color: "#6B7280",
    lineHeight: "18px",
  },

  statusError: {
    fontSize: "13px",
    color: "#DC2626",
    margin: 0,
  },

  statusOk: {
    fontSize: "13px",
    color: "#15803D",
    margin: 0,
  },

  actions: {
    display: "flex",
    justifyContent: "flex-start",
    marginTop: "4px",
  },
};
