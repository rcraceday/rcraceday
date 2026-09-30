import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/app/providers/AuthProvider";
import { useClub } from "@/app/providers/ClubProvider";
import CMSCard from "@cms/CMSCard";
import CMSInput from "@cms/CMSInput";
import CMSSelect from "@cms/CMSSelect";
import CMSToggle from "@cms/CMSToggle";
import CMSButton from "@cms/CMSButton";
import CMSImageUpload from "@cms/CMSImageUpload";
import CMSRichTextEditor from "@/components/ui/CMSRichTextEditor";
import SaveActions from "@app/pages/admin/events/eventsedit/components/SaveActions";
import { cmsStyles } from "@cms/styles";
import { isRichTextEmpty } from "@/app/lib/richText";
import {
  datetimeLocalToIso,
  isoToDatetimeLocal,
} from "@/app/lib/eventDatetime";
import {
  clubNewsImagePath,
  removeClubAssetPath,
  uploadClubAsset,
} from "@/app/lib/clubAssetStorage";
import {
  isClubNewsNotifyDue,
  validateClubNewsDisplayDates,
} from "@/app/lib/clubNews";
import { triggerNominationsOpenProcessing } from "@/app/lib/userNotifications";
import { formatEdgeFunctionInvokeError } from "@/app/lib/edgeFunctionErrors";

const emptyNews = {
  title: "",
  body: "",
  image_url: "",
  is_published: false,
  notify_members: false,
  notify_mode: "on_publish",
  notify_at: "",
  display_from: "",
  display_until: "",
};

export default function AdminClubNewsEdit() {
  const navigate = useNavigate();
  const location = useLocation();
  const { clubSlug, id } = useParams();
  const isNew = !id || id === "new";
  const { club } = useClub();
  const { user } = useAuth();

  const [news, setNews] = useState(emptyNews);
  const [imageFile, setImageFile] = useState(null);
  const [originalImageUrl, setOriginalImageUrl] = useState("");
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [publishPromptOpen, setPublishPromptOpen] = useState(false);

  useEffect(() => {
    if (location.state?.sendNotice) setNotice(location.state.sendNotice);
    if (location.state?.sendError) setError(location.state.sendError);
  }, [location.state]);

  useEffect(() => {
    if (isNew || !id) return undefined;
    let cancelled = false;

    async function load() {
      setLoading(true);
      const { data, error: loadError } = await supabase
        .from("club_news")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (cancelled) return;
      if (loadError || !data) {
        setError("Failed to load news item.");
        setLoading(false);
        return;
      }
      setNews({
        ...data,
        notify_at: isoToDatetimeLocal(data.notify_at),
        notify_mode: data.notify_mode || "on_publish",
        display_from: isoToDatetimeLocal(data.display_from),
        display_until: isoToDatetimeLocal(data.display_until),
      });
      setOriginalImageUrl(data.image_url || "");
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id, isNew]);

  const update = (field, value) => {
    setNews((prev) => ({ ...prev, [field]: value }));
  };

  async function runNewsNotifications(newsId, { force = false } = {}) {
    setSending(true);
    setNotice(null);
    try {
      const { data, error: fnError } = await triggerNominationsOpenProcessing(
        supabase,
        null,
        { newsId, type: "club_news", force }
      );
      if (fnError) {
        const message =
          formatEdgeFunctionInvokeError(fnError, "process-nominations-open") ||
          "Could not send news notifications.";
        setError(message);
        return { ok: false, error: message, notice: null };
      }
      if (data?.error) {
        const message = String(data.error);
        setError(message);
        return { ok: false, error: message, notice: null };
      }
      const row = Array.isArray(data?.summary)
        ? data.summary.find((item) => item?.type === "club_news") || data.summary[0]
        : null;
      const noticeText = row
        ? `In-app: ${row.inApp}. Email: ${row.email}. Push: ${row.push}.`
        : "Notification job ran, but nothing was sent. Use Send notification now.";
      setNotice(noticeText);
      return { ok: true, error: null, notice: noticeText };
    } finally {
      setSending(false);
    }
  }

  const handleSave = async (isPublished = !!news.is_published) => {
    if (saving || !club?.id) return;
    const title = String(news.title || "").trim();
    if (!title) {
      setError("Title is required.");
      return;
    }
    if (isRichTextEmpty(news.body)) {
      setError("Description is required.");
      return;
    }
    if (news.notify_members && news.notify_mode === "scheduled" && !news.notify_at) {
      setError("Notification date and time is required.");
      return;
    }

    const displayFromIso = news.display_from
      ? datetimeLocalToIso(news.display_from)
      : null;
    const displayUntilIso = news.display_until
      ? datetimeLocalToIso(news.display_until)
      : null;
    const displayDateError = validateClubNewsDisplayDates(
      displayFromIso,
      displayUntilIso
    );
    if (displayDateError) {
      setError(displayDateError);
      return;
    }

    setPublishPromptOpen(false);
    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const newsId = isNew ? crypto.randomUUID() : id;
      let imageUrl = news.image_url || null;

      if (imageFile) {
        const objectPath = clubNewsImagePath(clubSlug || club, newsId, imageFile);
        const uploaded = await uploadClubAsset(supabase, {
          objectPath,
          file: imageFile,
          previousUrlOrPath: originalImageUrl || news.image_url,
        });
        if (uploaded.error) {
          setError(uploaded.error.message || "Image upload failed.");
          setSaving(false);
          return;
        }
        imageUrl = uploaded.publicUrl;
      } else if (!news.image_url && originalImageUrl) {
        await removeClubAssetPath(supabase, originalImageUrl);
        imageUrl = null;
      }

      const payload = {
        club_id: club.id,
        title,
        body: news.body || "",
        image_url: imageUrl,
        is_published: !!isPublished,
        notify_members: !!news.notify_members,
        notify_mode: news.notify_members ? news.notify_mode || "on_publish" : "on_publish",
        notify_at:
          news.notify_members && news.notify_mode === "scheduled"
            ? datetimeLocalToIso(news.notify_at)
            : null,
        display_from: displayFromIso,
        display_until: displayUntilIso,
        created_by: user?.id ?? null,
      };

      let res;
      if (isNew) {
        res = await supabase
          .from("club_news")
          .insert({ id: newsId, ...payload })
          .select("*")
          .maybeSingle();
      } else {
        const { created_by: _createdBy, ...updatePayload } = payload;
        res = await supabase
          .from("club_news")
          .update(updatePayload)
          .eq("id", newsId)
          .select("*")
          .maybeSingle();
      }

      if (res.error || !res.data) {
        setError(res.error?.message || "Failed to save news item.");
        setSaving(false);
        return;
      }

      setNews({
        ...res.data,
        notify_at: isoToDatetimeLocal(res.data.notify_at),
        notify_mode: res.data.notify_mode || "on_publish",
        display_from: isoToDatetimeLocal(res.data.display_from),
        display_until: isoToDatetimeLocal(res.data.display_until),
      });
      setOriginalImageUrl(res.data.image_url || "");
      setImageFile(null);

      let sendNotice = null;
      let sendError = null;
      if (isClubNewsNotifyDue(res.data)) {
        const result = await runNewsNotifications(res.data.id);
        sendNotice = result?.notice || null;
        sendError = result?.ok ? null : result?.error || "Could not send news notifications.";
      }

      setSaving(false);
      if (isNew) {
        navigate(`/${clubSlug}/app/admin/news/${res.data.id}`, {
          replace: true,
          state: { sendNotice, sendError },
        });
        return;
      }
      if (sendNotice) setNotice(sendNotice);
      if (sendError) setError(sendError);
    } catch {
      setError("Unexpected error saving news item.");
      setSaving(false);
    }
  };

  const requestSave = () => {
    if (saving || sending) return;
    if (!news.is_published) {
      setPublishPromptOpen(true);
      return;
    }
    handleSave(true);
  };

  const handleDelete = async () => {
    if (isNew) return;
    const confirmed = window.confirm("Delete this news item? This cannot be undone.");
    if (!confirmed) return;
    setSaving(true);
    if (news.image_url) {
      await removeClubAssetPath(supabase, news.image_url);
    }
    const { error: deleteError } = await supabase.from("club_news").delete().eq("id", id);
    if (deleteError) {
      setError(deleteError.message || "Failed to delete news item.");
      setSaving(false);
      return;
    }
    navigate(`/${clubSlug}/app/admin/news`);
  };

  return (
    <div style={cmsStyles.pageContainer}>
      <div style={cmsStyles.pageContent}>
        <div style={cmsStyles.sectionHeader}>
          <h1 style={cmsStyles.sectionHeaderTitle}>
            {isNew ? "Create News" : "Edit News"}
          </h1>
          <p style={cmsStyles.sectionHeaderSubtitle}>
            Published news appears on the home page carousel.
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: "6px",
              backgroundColor: "#FEE2E2",
              color: "#991B1B",
              fontSize: "14px",
            }}
          >
            {error}
          </div>
        )}

        {notice && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: "6px",
              backgroundColor: "#FEF3C7",
              color: "#92400E",
              fontSize: "14px",
            }}
          >
            {notice}
          </div>
        )}

        {loading ? (
          <CMSCard>
            <div>Loading…</div>
          </CMSCard>
        ) : (
          <>
            <CMSCard
              title="News item"
              actions={
                <CMSToggle
                  label="Published"
                  checked={!!news.is_published}
                  onChange={(v) => update("is_published", v)}
                />
              }
            >
              <CMSInput
                name="title"
                label="Title"
                value={news.title}
                onChange={(v) => update("title", v)}
              />

              <CMSImageUpload
                label="Image"
                value={news.image_url}
                filePreview={imageFile}
                onChange={(file) => {
                  setImageFile(file);
                  if (!file) update("image_url", "");
                }}
              />

              <div>
                <label style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>
                  Description
                </label>
                <CMSRichTextEditor
                  value={news.body || ""}
                  onChange={(value) => update("body", value)}
                />
              </div>
            </CMSCard>

            <CMSCard title="Display on site">
              <p style={{ fontSize: 12, color: "#6b7280", marginTop: 0 }}>
                Optional. Leave blank to show whenever the item is published, with no end
                date.
              </p>
              <CMSInput
                name="display_from"
                label="Show from"
                type="datetime-local"
                value={news.display_from || ""}
                onChange={(v) => update("display_from", v)}
              />
              <CMSInput
                name="display_until"
                label="Hide after"
                type="datetime-local"
                value={news.display_until || ""}
                onChange={(v) => update("display_until", v)}
              />
            </CMSCard>

            <CMSCard title="Notification">
              <CMSToggle
                label="Send notification to members"
                checked={!!news.notify_members}
                onChange={(v) => update("notify_members", v)}
              />
              {!!news.notify_members && (
                <>
                  <CMSSelect
                    label="When to notify"
                    value={news.notify_mode || "on_publish"}
                    onChange={(v) => update("notify_mode", v)}
                    sortOptions={false}
                    options={[
                      { value: "on_publish", label: "When published" },
                      { value: "scheduled", label: "At date & time" },
                    ]}
                  />
                  {news.notify_mode === "scheduled" && (
                    <CMSInput
                      name="notify_at"
                      label="Notification date & time"
                      type="datetime-local"
                      value={news.notify_at || ""}
                      onChange={(v) => update("notify_at", v)}
                    />
                  )}
                  <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>
                    Sends in-app, lock-screen push, and optional email. Members must enable
                    push on this device in RCRaceday Settings.
                  </p>
                  {!isNew && (
                    <CMSButton
                      type="button"
                      disabled={sending || saving}
                      onClick={() => runNewsNotifications(id, { force: true })}
                    >
                      {sending ? "Sending…" : "Send notification now"}
                    </CMSButton>
                  )}
                </>
              )}
            </CMSCard>

            <SaveActions
              isNew={isNew}
              saving={saving || sending}
              saveLabel="Save News"
              deleteLabel="Delete News"
              onSave={requestSave}
              onCancel={() => navigate(`/${clubSlug}/app/admin/news`)}
              onDelete={handleDelete}
            />
          </>
        )}

        {publishPromptOpen && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              background: "rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 99999,
              padding: "20px",
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: "420px",
                background: "#FFF",
                borderRadius: "12px",
                padding: "20px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 600 }}>
                News is not published
              </h2>
              <p style={{ margin: 0, fontSize: "14px", color: "#4B5563" }}>
                Do you want to publish this news item? Published items appear on the home
                carousel.
              </p>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <CMSButton
                  variant="secondary"
                  onClick={() => handleSave(false)}
                  disabled={saving}
                >
                  No, save as draft
                </CMSButton>
                <CMSButton
                  variant="primary"
                  onClick={() => {
                    update("is_published", true);
                    handleSave(true);
                  }}
                  disabled={saving}
                >
                  Yes, publish
                </CMSButton>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
