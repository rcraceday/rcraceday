// components/TrackCard.jsx
import CMSCard from "@cms/CMSCard";
import CMSInput from "@cms/CMSInput";
import CMSTextarea from "@cms/CMSTextarea";

import {
  MiniEditButton,
  MiniDeleteButton,
  MiniAddButton,
  MiniBulkButton,
  MiniExpandButton,
  MiniCollapseButton,
  MiniAddClassButton,
  MiniBulkAddButton,
  MiniDeleteTrackButton,
  MiniSaveButton,
  MiniCancelButton,
} from "@cms/CMSMiniButtonSet";

import ClassRow from "./ClassRow";
import { useTranslation } from "@/app/i18n/I18nContext";

export default function TrackCard({
  track,
  classes,
  collapsed,

  addingClassTrackId,
  bulkModeTrackId,
  newClassName,
  newClassDesc,
  bulkClassesInput,
  editingClassId,
  editClassName,
  editClassDesc,

  onToggleCollapse,
  onStartAddClass,
  onStartBulk,
  onCancelAddClass,
  onCancelBulk,
  onAddClass,
  onBulkAddClasses,
  onStartEditClass,
  onCancelEditClass,
  onSaveEditClass,
  onDeleteClass,
  onDeleteTrack,

  setNewClassName,
  setNewClassDesc,
  setBulkClassesInput,
  setEditClassName,
  setEditClassDesc,

  LivetimeNotice,
}) {
  const { t } = useTranslation();
  return (
    <div style={{ marginBottom: "12px" }}>
      <CMSCard
        title={
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              margin: 0,
              padding: 0,
              position: "relative",
              top: "-10px",
              paddingRight: "170px",
            }}
          >
            <div
              style={{
                fontSize: "20px",
                fontWeight: 700,
                lineHeight: 1.15,
                margin: 0,
                padding: 0,
              }}
            >
              {track.name}
            </div>

            {track.description && (
              <div
                style={{
                  fontSize: "12px",
                  color: "#6B7280",
                  marginTop: "2px",
                  marginBottom: "4px",
                }}
              >
                {track.description}
              </div>
            )}
          </div>
        }
actions={
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "6px",
      minWidth: "170px",
      position: "relative",
      top: "-4px",
    }}
  >
    {collapsed ? (
      <MiniExpandButton onClick={() => onToggleCollapse(track.id)} />
    ) : (
      <MiniCollapseButton onClick={() => onToggleCollapse(track.id)} />
    )}

    <MiniAddClassButton onClick={() => onStartAddClass(track.id)} />
    <MiniBulkAddButton onClick={() => onStartBulk(track.id)} />
    <MiniDeleteTrackButton
      onClick={() => {
        if (
          window.confirm(
            `Delete track "${track.name}"?\n\nThis will remove ALL classes assigned to it.\nThis cannot be undone.`
          )
        ) {
          onDeleteTrack(track.id);
        }
      }}
    />
  </div>
}
      >
        {addingClassTrackId === track.id && (
          <div
            style={{
              border: "1px solid #E5E7EB",
              borderRadius: "6px",
              padding: "8px",
              marginBottom: "8px",
            }}
          >
            <CMSInput
              labelKey="cms.className"
              value={newClassName}
              onChange={(value) => setNewClassName(value)}
            />
            <CMSTextarea
              labelKey="cms.classDescriptionOptional"
              value={newClassDesc}
              onChange={(value) => setNewClassDesc(value)}
            />

            <LivetimeNotice />

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "8px",
                marginTop: "8px",
              }}
            >
              <MiniSaveButton onClick={() => onAddClass(track.id)}>
                Save Class
              </MiniSaveButton>

              <MiniCancelButton onClick={onCancelAddClass} />
            </div>
          </div>
        )}

        {bulkModeTrackId === track.id && (
          <div
            style={{
              border: "1px solid #E5E7EB",
              borderRadius: "6px",
              padding: "8px",
              marginBottom: "8px",
            }}
          >
            <CMSTextarea
              labelKey="cms.bulkInsertClasses"
              value={bulkClassesInput}
              onChange={(value) => setBulkClassesInput(value)}
            />

            <LivetimeNotice />

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "8px",
                marginTop: "8px",
              }}
            >
              <MiniSaveButton onClick={() => onBulkAddClasses(track.id)}>
                Add Classes
              </MiniSaveButton>

              <MiniCancelButton onClick={onCancelBulk} />
            </div>
          </div>
        )}

        {!collapsed && (
          <div style={{ marginTop: "8px" }}>
            {classes.length === 0 ? (
              <div
                style={{
                  fontSize: "12px",
                  color: "#9CA3AF",
                  padding: "4px 0",
                }}
              >
                No classes defined for this track yet.
              </div>
            ) : (
              classes.map((cls) => (
                <ClassRow
                  key={cls.id}
                  cls={cls}
                  trackId={track.id}
                  isEditing={editingClassId === cls.id}
                  editClassName={editClassName}
                  editClassDesc={editClassDesc}
                  onStartEditClass={onStartEditClass}
                  onCancelEditClass={onCancelEditClass}
                  onSaveEditClass={onSaveEditClass}
                  onDeleteClass={onDeleteClass}
                  setEditClassName={setEditClassName}
                  setEditClassDesc={setEditClassDesc}
                  LivetimeNotice={LivetimeNotice}
                />
              ))
            )}
          </div>
        )}
      </CMSCard>
    </div>
  );
}
