import { useEffect, useRef, useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import PageTitle from "@/components/ui/PageTitle";
import { ClipboardDocumentCheckIcon } from "@heroicons/react/24/solid";
import { useTranslation } from "@/app/i18n/I18nContext";
import useTheme from "@/app/providers/useTheme";
import {
  createHostClubVisitorDriver,
  ensureHostClubVisitorDriver,
  resolveDriverNames,
} from "@/app/lib/ensureHostClubVisitorDriver";

export default function EventNominateDriverGate({
  userId,
  clubId,
  membership,
  onDriverReady,
}) {
  const { t } = useTranslation();
  const { palette } = useTheme();
  const brand = palette?.primary || "#00438a";

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isJunior, setIsJunior] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("bootstrapping");
  const autoAttemptRef = useRef(false);

  useEffect(() => {
    if (autoAttemptRef.current) return;
    autoAttemptRef.current = true;
    let cancelled = false;

    (async () => {
      const ensured = await ensureHostClubVisitorDriver({
        userId,
        clubId,
        membership,
      });
      if (cancelled) return;
      if (ensured) {
        await onDriverReady?.();
        return;
      }

      const { first, last } = await resolveDriverNames({
        userId,
        membership,
      });
      if (cancelled) return;
      setFirstName(first);
      setLastName(last);
      setMode("form");
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, clubId, membership, onDriverReady]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const result = await createHostClubVisitorDriver({
      userId,
      clubId,
      firstName,
      lastName,
      isJunior,
    });

    if (!result.ok) {
      if (result.error === "duplicate_name") {
        setError(t("nominate.visitorDriverDuplicate"));
      } else if (result.error === "name_required") {
        setError(t("nominate.visitorDriverNameRequired"));
      } else {
        setError(result.error || t("nominate.visitorDriverSaveFailed"));
      }
      setSaving(false);
      return;
    }

    await onDriverReady?.();
    setSaving(false);
  }

  if (mode === "bootstrapping") {
    return (
      <div style={{ minHeight: "100vh", background: palette?.background || "#ffffff" }}>
        <PageTitle icon={ClipboardDocumentCheckIcon} title={t("nominate.title")} style={{ color: brand }} />
        <div style={{ padding: "40px", textAlign: "center", color: "#666", fontSize: "14px" }}>
          {t("nominate.loadingForm")}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: palette?.background || "#ffffff" }}>
      <PageTitle icon={ClipboardDocumentCheckIcon} title={t("nominate.title")} style={{ color: brand }} />
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "16px 12px 32px" }}>
        <Card>
          <h2 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 600 }}>{t("nominate.visitorDriverTitle")}</h2>
          <p style={{ margin: "0 0 16px", fontSize: 14, color: "#4b5563", lineHeight: 1.45 }}>
            {t("nominate.visitorDriverHint")}
          </p>
          {error ? (
            <p style={{ color: "#b91c1c", fontSize: 14, marginBottom: 12 }} role="alert">
              {error}
            </p>
          ) : null}
          <form onSubmit={handleSubmit}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Input
                label={t("nominate.firstName")}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
              <Input
                label={t("nominate.lastName")}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                <input
                  type="checkbox"
                  checked={isJunior}
                  onChange={(e) => setIsJunior(e.target.checked)}
                />
                {t("nominate.juniorShort")}
              </label>
              <Button type="submit" disabled={saving}>
                {saving ? t("nominate.saving") : t("nominate.visitorDriverContinue")}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
