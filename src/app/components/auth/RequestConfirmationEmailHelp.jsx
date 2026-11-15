import { useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useTranslation } from "@/app/i18n/I18nContext";
import {
  requestConfirmationEmailHelp,
  resendSignupConfirmation,
} from "@/app/lib/requestAuthEmailHelp";

export default function RequestConfirmationEmailHelp({
  email,
  defaultFullName = "",
  club = null,
  clubSlug = "",
  clubLogo = "",
  showResend = true,
}) {
  const { t } = useTranslation();
  const [helpOpen, setHelpOpen] = useState(false);
  const [fullName, setFullName] = useState(defaultFullName);
  const [message, setMessage] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [helpLoading, setHelpLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function handleResend() {
    setResendLoading(true);
    setError("");
    setStatus("");
    const { error: resendError } = await resendSignupConfirmation(email);
    setResendLoading(false);
    if (resendError) {
      setError(resendError.message || t("signup.sendFailed"));
      return;
    }
    setStatus(t("signup.resendSent"));
  }

  async function handleHelpSubmit(e) {
    e.preventDefault();
    setHelpLoading(true);
    setError("");
    setStatus("");

    const name = fullName.trim();
    if (!name) {
      setHelpLoading(false);
      setError(t("signup.nameRequired"));
      return;
    }

    const { error: helpError } = await requestConfirmationEmailHelp({
      email,
      fullName: name,
      message,
      club,
      clubSlug,
      clubLogo,
    });

    setHelpLoading(false);
    if (helpError) {
      setError(t("signup.sendFailed"));
      return;
    }

    setStatus(
      club?.name ? t("signup.requestSent") : t("signup.confirmationHelpSentPlatform")
    );
    setHelpOpen(false);
  }

  return (
    <div className="public-auth-help" style={{ marginTop: 16, width: "100%" }}>
      {showResend ? (
        <Button type="button" variant="secondary" disabled={resendLoading} onClick={handleResend}>
          {resendLoading ? t("signup.resending") : t("signup.resendEmail")}
        </Button>
      ) : null}

      <p className="public-auth-lead" style={{ marginTop: 12, marginBottom: 8, fontSize: 13 }}>
        {t("signup.confirmationEmailTips")}
      </p>

      {!helpOpen ? (
        <Button type="button" variant="secondary" onClick={() => setHelpOpen(true)}>
          {t("signup.requestConfirmationHelp")}
        </Button>
      ) : (
        <form
          onSubmit={handleHelpSubmit}
          className="public-auth-form"
          style={{ marginTop: 12, gap: 12 }}
        >
          <p className="public-auth-lead" style={{ margin: 0, fontSize: 13 }}>
            {club?.name
              ? t("signup.confirmationHelpLeadClub")
              : t("signup.confirmationHelpLeadPlatform")}
          </p>
          {!defaultFullName?.trim() ? (
            <Input
              label={t("signup.fullName")}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          ) : null}
          <Input
            label={t("signup.messageOptional")}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <Button type="submit" variant="primary" disabled={helpLoading}>
              {helpLoading ? t("auth.sending") : t("signup.sendHelpRequest")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={helpLoading}
              onClick={() => setHelpOpen(false)}
            >
              {t("actions.cancel")}
            </Button>
          </div>
        </form>
      )}

      {error ? <p className="public-auth-error" style={{ marginTop: 12 }}>{error}</p> : null}
      {status ? <p className="public-auth-success" style={{ marginTop: 12 }}>{status}</p> : null}
    </div>
  );
}