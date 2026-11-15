import { useState } from "react";
import { Link } from "react-router-dom";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Footer from "@/components/ui/Footer";
import { useTranslation } from "@/app/i18n/I18nContext";
import { submitPlatformContact } from "@/app/lib/requestPlatformContact";
import { PLATFORM_SUPPORT_EMAIL } from "@/app/lib/platformSupportEmail";

const PLATFORM_LOGO_SRC = "/rcraceday_logo.png";

const TOPIC_KEYS = ["account", "membership", "privacy", "club", "other"];

export default function ContactRCRaceday() {
  const { t } = useTranslation();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState("account");
  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!fullName.trim()) {
      setErrorMsg(t("contactPage.nameRequired"));
      return;
    }
    if (!email.trim()) {
      setErrorMsg(t("contactPage.emailRequired"));
      return;
    }
    if (!message.trim()) {
      setErrorMsg(t("contactPage.messageRequired"));
      return;
    }

    setLoading(true);
    const { error } = await submitPlatformContact({
      fullName,
      email,
      topic,
      message,
    });
    setLoading(false);

    if (error) {
      const detail = String(error.message || "").trim();
      setErrorMsg(
        detail && !import.meta.env.PROD
          ? `${t("contactPage.sendFailed")} (${detail})`
          : t("contactPage.sendFailed")
      );
      return;
    }

    setSuccessMsg(t("contactPage.sendSuccess"));
    setMessage("");
  }

  return (
    <div className="platform-legal-page">
      <header className="platform-legal-header">
        <Link to="/" className="platform-legal-brand" aria-label="RCRaceday home">
          <img src={PLATFORM_LOGO_SRC} alt="" className="platform-legal-logo" />
        </Link>
      </header>

      <main className="platform-legal-main">
        <h1 className="platform-legal-title">{t("contactPage.title")}</h1>
        <p className="platform-legal-lead">{t("contactPage.lead")}</p>
        <p className="platform-legal-paragraph">{t("contactPage.supportHint")}</p>
        <p className="platform-legal-paragraph">
          <Link to="/support" className="public-auth-link">
            {t("footer.support")}
          </Link>
        </p>

        <form onSubmit={handleSubmit} className="public-auth-form platform-contact-form">
          <Input
            label={t("contactPage.fullName")}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
          />

          <Input
            label={t("contactPage.email")}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />

          <label className="platform-contact-field">
            <span className="platform-contact-label">{t("contactPage.topic")}</span>
            <select
              className="platform-contact-select"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            >
              {TOPIC_KEYS.map((key) => (
                <option key={key} value={key}>
                  {t(`contactPage.topic_${key}`)}
                </option>
              ))}
            </select>
          </label>

          <label className="platform-contact-field">
            <span className="platform-contact-label">{t("contactPage.message")}</span>
            <textarea
              className="platform-contact-textarea"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              placeholder={t("contactPage.messagePlaceholder")}
            />
          </label>

          {errorMsg ? <p className="public-auth-error">{errorMsg}</p> : null}
          {successMsg ? <p className="public-auth-success">{successMsg}</p> : null}

          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? t("auth.sending") : t("contactPage.send")}
          </Button>
        </form>

        <p className="platform-legal-paragraph" style={{ marginTop: 24 }}>
          {t("contactPage.emailDirect")}{" "}
          <a href={`mailto:${PLATFORM_SUPPORT_EMAIL}`} className="public-auth-link">
            {PLATFORM_SUPPORT_EMAIL}
          </a>
        </p>

        <p className="platform-legal-back">
          <Link to="/" className="public-auth-link">
            {t("legal.support.backHome")}
          </Link>
        </p>
      </main>

      <Footer />
    </div>
  );
}