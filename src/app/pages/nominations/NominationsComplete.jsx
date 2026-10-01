import React, { useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import useTheme from "@app/providers/useTheme";
import { useTranslation } from "@/app/i18n/I18nContext";

const NominationsComplete = () => {
  const { clubSlug, eventId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { t } = useTranslation();

  const nominationId = location.state?.nominationId || null;

  const [loading, setLoading] = useState(true);
  const [summaryError, setSummaryError] = useState(null);
  const [nomination, setNomination] = useState(null);
  const [event, setEvent] = useState(null);
  const [classes, setClasses] = useState([]);
  const [total, setTotal] = useState(0);

  const [isSquareLoading, setIsSquareLoading] = useState(false);
  const [isPayPalLoading, setIsPayPalLoading] = useState(false);
  const [paymentError, setPaymentError] = useState(null);

  const calculateTotal = useCallback((classList) => {
    if (!Array.isArray(classList)) return 0;
    return classList.reduce((sum, cls) => sum + (cls.price || 0), 0);
  }, []);

  const fetchNominationSummary = useCallback(
    async (id) => {
      try {
        setLoading(true);
        setSummaryError(null);

        const res = await fetch(`/api/nominations/${id}/summary`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) throw new Error(t("nominationsFlow.loadSummaryError"));

        const data = await res.json();

        setNomination(data.nomination || null);
        setEvent(data.event || null);
        setClasses(data.classes || []);
        setTotal(calculateTotal(data.classes || []));
      } catch (err) {
        console.error(err);
        setSummaryError(
          err?.message || t("nominationsFlow.loadNominationError")
        );
      } finally {
        setLoading(false);
      }
    },
    [calculateTotal]
  );

  useEffect(() => {
    if (!nominationId) {
      setLoading(false);
      setSummaryError(t("nominationsFlow.nominationMissing"));
      return;
    }

fetchNominationSummary(nominationId);
  }, [nominationId, fetchNominationSummary]);

  const handleReturnToEvents = () => navigate(`/${clubSlug}/events`);

const handleReturnToNominations = () => {
    if (eventId) navigate(`/${clubSlug}/nominations/${eventId}`);
    else navigate(`/${clubSlug}/events`);
  };

  const handlePayment = async (provider) => {
    if (!nominationId || !eventId) {
      setPaymentError(t("nominationsFlow.missingPaymentInfo"));
      return;
    }

    setPaymentError(null);

    if (provider === "square") setIsSquareLoading(true);
    if (provider === "paypal") setIsPayPalLoading(true);

    try {
      const endpoint =
        provider === "square"
          ? "/api/payments/square/create-session"
          : "/api/payments/paypal/create-session";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nominationId,
          eventId,
          total,
          classes: classes.map((cls) => ({
            id: cls.id,
            name: cls.name,
            price: cls.price,
          })),
        }),
      });

      if (!res.ok) throw new Error(t("nominationsFlow.paymentSessionFailed"));

      const data = await res.json();
      if (!data.redirectUrl)
        throw new Error(t("nominationsFlow.paymentRedirectMissing"));

      window.location.href = data.redirectUrl;
    } catch (err) {
      console.error(err);
      setPaymentError(
        err?.message || t("nominationsFlow.paymentStartError")
      );
    } finally {
      if (provider === "square") setIsSquareLoading(false);
      if (provider === "paypal") setIsPayPalLoading(false);
    }
  };

  const formatCurrency = (value) =>
    typeof value === "number"
      ? value.toLocaleString("en-AU", {
          style: "currency",
          currency: "AUD",
        })
      : "$0.00";

  const formatDate = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-AU", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const hasCriticalError = summaryError && !nominationId;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full">
          {/* HEADER */}
          <div className="mb-6">
            <div className="inline-flex items-center gap-3 rounded-full bg-emerald-500/10 px-4 py-2 border border-emerald-500/30">
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold tracking-wide text-emerald-300 uppercase">
                {t("nominationsFlow.submittedBadge")}
              </span>
            </div>

            <h1 className="mt-4 text-3xl sm:text-4xl font-semibold tracking-tight">
              {t("nominationsFlow.onTheGrid")}
            </h1>

            <p className="mt-2 text-sm sm:text-base text-slate-300 max-w-xl">
              {t("nominationsFlow.completePaymentBody")}
            </p>
          </div>

          {/* CRITICAL ERROR */}
          {hasCriticalError && (
            <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-5 mb-6">
              <h2 className="text-sm font-semibold text-red-200">
                {t("nominationsFlow.nominationNotFoundTitle")}
              </h2>
              <p className="mt-1 text-sm text-red-100/80">
                {t("nominationsFlow.nominationNotFoundBody")}
              </p>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  onClick={handleReturnToEvents}
                  className="rounded-full bg-slate-50 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-200"
                >
                  {t("nominationsFlow.returnToEvents")}
                </button>
              </div>
            </div>
          )}

          {/* LOADING */}
          {!hasCriticalError && loading && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 mb-6">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full border-2 border-slate-700 border-t-emerald-400 animate-spin" />
                <div>
                  <p className="text-sm font-medium text-slate-100">
                    {t("nominationsFlow.finalising")}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {t("nominationsFlow.loadingDetails")}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SUMMARY ERROR */}
          {!hasCriticalError && summaryError && !loading && (
            <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 mb-6">
              <h2 className="text-sm font-semibold text-amber-100">
                {t("nominationsFlow.loadSummaryFailed")}
              </h2>
              <p className="mt-1 text-sm text-amber-50/80">{summaryError}</p>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  onClick={handleReturnToEvents}
                  className="rounded-full bg-slate-50 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-200"
                >
                  {t("nominationsFlow.returnToEvents")}
                </button>
              </div>
            </div>
          )}

          {/* MAIN CONTENT */}
          {!hasCriticalError && !loading && !summaryError && nomination && (
            <div className="space-y-6">
              {/* EVENT SUMMARY */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
                <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase">
                      {t("nominationsFlow.eventLabel")}
                    </p>
                    <h2 className="mt-1 text-xl font-semibold text-slate-50">
                      {event?.name}
                    </h2>
                    <p className="mt-1 text-xs text-slate-400">
                      {formatDate(event?.date)}
                      {event?.location ? ` • ${event.location}` : ""}
                    </p>
                    <p className="mt-3 text-xs text-slate-400">
                      {t("nominationsFlow.nominationId")}{" "}
                      <span className="font-mono text-slate-300">
                        {nomination.id}
                      </span>
                    </p>
                  </div>

                  <div className="sm:text-right">
                    <p className="text-xs font-semibold text-slate-400 uppercase">
                      {t("nominationsFlow.totalDue")}
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-emerald-400">
                      {formatCurrency(total)}
                    </p>
                  </div>
                </div>

                {/* CLASSES */}
                <div className="mt-5 border-t border-slate-800 pt-4">
                  <p className="text-xs font-semibold text-slate-400 uppercase mb-3">
                    {t("nominationsFlow.nominatedClasses")}
                  </p>

                  {classes.length === 0 ? (
                    <p className="text-sm text-slate-400">
                      {t("nominationsFlow.noClassesForNomination")}
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {classes.map((cls) => (
                        <li
                          key={cls.id}
                          className="flex items-center justify-between rounded-xl bg-slate-900/80 border border-slate-800 px-3 py-2.5"
                        >
                          <p className="text-sm font-medium text-slate-100">
                            {cls.name}
                          </p>
                          <p className="text-sm font-semibold text-slate-50">
                            {formatCurrency(cls.price)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* PAYMENT OPTIONS */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-6">
                <p className="text-xs font-semibold text-slate-400 uppercase">
                  {t("nominationsFlow.paymentOptions")}
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  {t("nominationsFlow.paymentOptionsBody")}
                </p>

                {paymentError && (
                  <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2.5">
                    <p className="text-xs text-red-100">{paymentError}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                  {/* SQUARE */}
                  <button
                    onClick={() => handlePayment("square")}
                    disabled={isSquareLoading || isPayPalLoading}
                    className={`rounded-xl px-4 py-3 text-sm font-semibold border transition-colors ${
                      isSquareLoading || isPayPalLoading
                        ? "bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed"
                        : "bg-sky-500 text-slate-950 border-sky-400 hover:bg-sky-400"
                    }`}
                  >
                    {isSquareLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 rounded-full border-2 border-slate-900 border-t-slate-50 animate-spin" />
                        {t("nominationsFlow.processingSquare")}
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <span className="text-base font-bold">□</span>
                        {t("nominationsFlow.payWithSquare")}
                      </span>
                    )}
                  </button>

                  {/* PAYPAL */}
                  <button
                    onClick={() => handlePayment("paypal")}
                    disabled={isSquareLoading || isPayPalLoading}
                    className={`rounded-xl px-4 py-3 text-sm font-semibold border transition-colors ${
                      isSquareLoading || isPayPalLoading
                        ? "bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed"
                        : "bg-amber-400 text-slate-950 border-amber-300 hover:bg-amber-300"
                    }`}
                  >
                    {isPayPalLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 rounded-full border-2 border-slate-900 border-t-slate-50 animate-spin" />
                        {t("nominationsFlow.redirectingPaypal")}
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <span className="text-base font-black italic">P</span>
                        {t("nominationsFlow.payWithPaypal")}
                      </span>
                    )}
                  </button>
                </div>

                <p className="mt-4 text-xs text-slate-400">
                  {t("nominationsFlow.paymentSecureNote")}
                </p>
              </div>

              {/* NAVIGATION */}
              <div className="flex flex-wrap gap-3 justify-between items-center">
                <button
                  onClick={handleReturnToEvents}
                  className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-slate-100 hover:bg-slate-800"
                >
                  {t("nominationsFlow.returnToEvents")}
                </button>

                <button
                  onClick={handleReturnToNominations}
                  className="rounded-full bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-200"
                >
                  {t("nominationsFlow.reviewNominationsAgain")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NominationsComplete;
