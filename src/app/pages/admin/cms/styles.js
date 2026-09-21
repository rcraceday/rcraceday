export const cmsStyles = {
  // -----------------------------
  // PAGE LAYOUT
  // -----------------------------
  pageContainer: {
    width: "100%",
    backgroundColor: "#F5F5F5",
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

  // -----------------------------
  // CARD (TIGHT + CLEAN)
  // -----------------------------
  card: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    border: "1px solid #E5E7EB",
    borderRadius: "8px",

    // ⭐ TIGHTER PADDING
    padding: "12px",
    boxSizing: "border-box",

    display: "flex",
    flexDirection: "column",

    // ⭐ NO INTERNAL GAP
    gap: "0px",
  },

  cardHeader: {
    paddingBottom: "8px", // tighter
    borderBottom: "1px solid #E5E7EB",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  cardTitle: {
    fontSize: "18px",
    fontWeight: 600,
    color: "#111827",
  },

  cardBody: {
    padding: "0",
  },

  // -----------------------------
  // BUTTONS
  // -----------------------------
  buttonBase: {
    padding: "10px 16px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    border: "1px solid #D1D5DB",
    backgroundColor: "#F3F4F6",
    color: "#111827",
  },

  buttonPrimary: {
    backgroundColor: "#E5E7EB",
    color: "#111827",
    border: "1px solid #D1D5DB",
  },

  buttonSecondary: {
    backgroundColor: "#F9FAFB",
    color: "#374151",
    border: "1px solid #D1D5DB",
  },

  buttonDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  },

  // -----------------------------
  // FORM ELEMENTS (TIGHT)
  // -----------------------------
  label: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#374151",

    // ⭐ TIGHTER LABEL SPACING
    marginBottom: "2px",
  },

  input: {
    width: "100%",

    // ⭐ TIGHTER INPUT PADDING
    padding: "8px 10px",

    borderRadius: "6px",
    border: "1px solid #D1D5DB",
    fontSize: "14px",
    color: "#111827",
    boxSizing: "border-box",
  },

  textarea: {
    width: "100%",

    // ⭐ TIGHTER TEXTAREA PADDING
    padding: "8px 10px",

    borderRadius: "6px",
    border: "1px solid #D1D5DB",
    fontSize: "14px",
    color: "#111827",

    // ⭐ TIGHTER HEIGHT
    minHeight: "100px",

    boxSizing: "border-box",
  },

  // -----------------------------
  // SECTION HEADERS (TIGHT)
  // -----------------------------
  sectionHeader: {
    fontSize: "12px",
    fontWeight: 600,
    color: "#111827",

    // ⭐ TIGHTER SPACING
    marginBottom: "6px",
    marginTop: "10px",
  },

  // -----------------------------
  // FORM ROWS (TIGHT)
  // -----------------------------
  formRow: {
    display: "flex",
    flexDirection: "column",

    // ⭐ TIGHTER GAP
    gap: "4px",

    marginBottom: "8px",
  },

  // -----------------------------
  // BADGES
  // -----------------------------
  badgePublished: {
    backgroundColor: "#DCFCE7",
    color: "#166534",
    padding: "4px 8px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: 600,
  },

  badgeDraft: {
    backgroundColor: "#FEE2E2",
    color: "#991B1B",
    padding: "4px 8px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: 600,
  },

  // -----------------------------
  // EVENT CARD TEXT
  // -----------------------------
  eventCardText: {
    labelSize: "14px",
    valueSize: "14px",
    iconSize: "16px",
  },

  // -----------------------------
  // TABLE (LEGACY)
  // -----------------------------
  table: {
    th: {
      textAlign: "left",
      padding: "12px 16px",
      fontSize: "13px",
      fontWeight: 600,
      color: "#374151",
    },

    td: {
      padding: "12px 16px",
      fontSize: "14px",
      color: "#111827",
    },

    loadingCell: {
      padding: "20px",
      textAlign: "center",
      fontSize: "14px",
      color: "#6B7280",
    },

    badgePublished: {
      backgroundColor: "#DCFCE7",
      color: "#166534",
      padding: "4px 8px",
      borderRadius: "6px",
      fontSize: "12px",
      fontWeight: 600,
    },

    badgeDraft: {
      backgroundColor: "#FEE2E2",
      color: "#991B1B",
      padding: "4px 8px",
      borderRadius: "6px",
      fontSize: "12px",
      fontWeight: 600,
    },

    actionButton: {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      padding: "6px 10px",
      borderRadius: "6px",
      backgroundColor: "#F3F4F6",
      color: "#111827",
      fontSize: "13px",
      textDecoration: "none",
      border: "1px solid #E5E7EB",
    },

    actionIcon: {
      width: "14px",
      height: "14px",
      color: "#6B7280",
    },
  },
};

// Backwards compatibility
export const styles = cmsStyles.table;
