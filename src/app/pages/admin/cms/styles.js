export const cmsStyles = {
  // -----------------------------
  // CARD (FIXED + UNIFIED)
  // -----------------------------
  card: {
    width: "100%",                 // ⭐ FULL WIDTH — stops shrink-to-fit
    backgroundColor: "#FFFFFF",
    border: "1px solid #E5E7EB",
    borderRadius: "8px",
    padding: "20px",               // ⭐ MATCHES ADMIN LAYOUT
    boxSizing: "border-box",       // ⭐ CRITICAL FOR WIDTH CONSISTENCY
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },

  cardHeader: {
    padding: "0 0 4px 0",          // Header spacing now handled by card padding
    borderBottom: "1px solid #E5E7EB",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: "12px",
  },

  cardTitle: {
    fontSize: "18px",
    fontWeight: 600,
    color: "#111827",
  },

  cardBody: {
    padding: "0",                  // Body spacing handled by card gap
  },

  // -----------------------------
  // BUTTONS (GREY)
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
  // FORM ELEMENTS
  // -----------------------------
  label: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#374151",
    marginBottom: "4px",
  },

  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "6px",
    border: "1px solid #D1D5DB",
    fontSize: "14px",
    color: "#111827",
    boxSizing: "border-box",
  },

  textarea: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "6px",
    border: "1px solid #D1D5DB",
    fontSize: "14px",
    color: "#111827",
    minHeight: "120px",
    boxSizing: "border-box",
  },

  // -----------------------------
  // SECTION HEADERS
  // -----------------------------
  sectionHeader: {
    fontSize: "12px",
    fontWeight: 600,
    color: "#111827",
    marginBottom: "8px",
    marginTop: "12px",
  },

  // -----------------------------
  // FORM ROWS
  // -----------------------------
  formRow: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    marginBottom: "16px",
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
  // EVENT CARD TEXT (EDITABLE)
  // -----------------------------
  eventCardText: {
    labelSize: "14px",
    valueSize: "14px",
    iconSize: "16px",
  },

  // -----------------------------
  // TABLE (LEGACY SUPPORT)
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

// Backwards compatibility for old imports
export const styles = cmsStyles.table;
