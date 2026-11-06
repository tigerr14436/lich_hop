import React, { useMemo, useState } from "react";
import "./MasterDetail.css";

/* =====================================================================
   MASTER–DETAIL + DATA BINDING TRONG REACT
   ---------------------------------------------------------------------
   Master  : danh sách cuộc họp (Collection -> render bằng map)
   Detail  : form chỉnh sửa cuộc họp đang chọn (Object -> controlled input)

   Hai kiểu binding dùng trong bài:
   1) Collection -> UI : meetings.map(...) tạo từng dòng của danh sách,
      rooms.map(...) tạo các <option> của ô chọn phòng.
   2) Object -> Form   : mỗi ô nhập có value={draft.field} (State -> hiển thị)
      và onChange cập nhật lại draft (sự kiện -> State).
   ===================================================================== */

// ---------- Dữ liệu mẫu (thay bằng dữ liệu gọi từ API /api/meetings, /api/rooms) ----------
const ROOMS = [
  { id: 1, name: "Phòng họp A1", capacity: 20 },
  { id: 2, name: "Phòng họp B2", capacity: 10 },
  { id: 3, name: "Hội trường lớn", capacity: 120 },
];

const STATUSES = [
  { value: "scheduled", label: "Đã lên lịch" },
  { value: "done", label: "Đã họp xong" },
  { value: "cancelled", label: "Đã hủy" },
];

const INITIAL_MEETINGS = [
  {
    id: 1,
    title: "Họp giao ban tuần",
    start: "2026-11-09T08:00",
    end: "2026-11-09T09:30",
    roomId: 1,
    attendees: 12,
    status: "scheduled",
    note: "Báo cáo tiến độ các nhóm.",
  },
  {
    id: 2,
    title: "Họp chuyên môn Khoa CNTT",
    start: "2026-11-10T14:00",
    end: "2026-11-10T16:00",
    roomId: 2,
    attendees: 8,
    status: "scheduled",
    note: "",
  },
  {
    id: 3,
    title: "Tổng kết học kỳ",
    start: "2026-10-30T09:00",
    end: "2026-10-30T11:00",
    roomId: 3,
    attendees: 80,
    status: "done",
    note: "Đã có biên bản.",
  },
];

// ---------- Hàm tiện ích ----------
const emptyMeeting = () => ({
  id: null, // null = chưa lưu, sẽ được cấp id khi bấm "Lưu"
  title: "",
  start: "",
  end: "",
  roomId: ROOMS[0].id,
  attendees: 1,
  status: "scheduled",
  note: "",
});

const formatTime = (iso) =>
  iso ? new Date(iso).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }) : "—";

// Validation: cú pháp (bắt buộc) + ngữ nghĩa (kết thúc sau bắt đầu, không vượt sức chứa)
function validate(m) {
  const errors = {};
  if (!m.title.trim()) errors.title = "Nhập tên cuộc họp.";
  if (!m.start) errors.start = "Chọn thời điểm bắt đầu.";
  if (!m.end) errors.end = "Chọn thời điểm kết thúc.";
  if (m.start && m.end && new Date(m.end) <= new Date(m.start))
    errors.end = "Thời điểm kết thúc phải sau thời điểm bắt đầu.";
  const room = ROOMS.find((r) => r.id === Number(m.roomId));
  if (room && Number(m.attendees) > room.capacity)
    errors.attendees = `${room.name} chỉ chứa tối đa ${room.capacity} người.`;
  if (Number(m.attendees) < 1) errors.attendees = "Số người tham dự phải từ 1 trở lên.";
  return errors;
}

// =====================================================================
// COMPONENT CHA: giữ State dùng chung (collection + phần tử đang chọn)
// =====================================================================
export default function MasterDetail() {
  const [meetings, setMeetings] = useState(INITIAL_MEETINGS); // Collection
  const [selectedId, setSelectedId] = useState(INITIAL_MEETINGS[0].id); // khóa của phần tử chọn
  const [creating, setCreating] = useState(false); // đang thêm mới?

  // Object đang chọn được "suy ra" từ collection, không lưu trùng lặp thêm một bản sao
  const selected = useMemo(
    () => (creating ? emptyMeeting() : meetings.find((m) => m.id === selectedId) ?? null),
    [creating, meetings, selectedId]
  );

  function handleSelect(id) {
    setCreating(false);
    setSelectedId(id);
  }

  function handleSave(draft) {
    if (draft.id === null) {
      const newId = Math.max(0, ...meetings.map((m) => m.id)) + 1;
      setMeetings([...meetings, { ...draft, id: newId, roomId: Number(draft.roomId), attendees: Number(draft.attendees) }]);
      setSelectedId(newId);
      setCreating(false);
    } else {
      // Cập nhật bất biến (immutable): tạo mảng mới, thay đúng phần tử
      setMeetings(
        meetings.map((m) =>
          m.id === draft.id ? { ...draft, roomId: Number(draft.roomId), attendees: Number(draft.attendees) } : m
        )
      );
    }
  }

  function handleDelete(id) {
    const rest = meetings.filter((m) => m.id !== id);
    setMeetings(rest);
    setSelectedId(rest.length ? rest[0].id : null);
  }

  return (
    <div className="md-app">
      <header className="md-header">
        <h1>Lịch họp</h1>
        <button className="md-btn md-btn-primary" onClick={() => setCreating(true)}>
          Thêm cuộc họp
        </button>
      </header>

      <div className="md-layout">
        <MasterList
          meetings={meetings}
          selectedId={creating ? null : selectedId}
          onSelect={handleSelect}
        />

        {selected ? (
          // key = id: khi đổi phần tử chọn, React tạo lại form với dữ liệu mới
          // (State "draft" được khởi tạo lại từ props, không cần useEffect).
          <DetailForm
            key={creating ? "new" : selected.id}
            meeting={selected}
            onSave={handleSave}
            onDelete={handleDelete}
            onCancelNew={() => setCreating(false)}
          />
        ) : (
          <section className="md-detail md-empty">
            <p>Chưa có cuộc họp nào. Chọn “Thêm cuộc họp” để tạo cuộc họp đầu tiên.</p>
          </section>
        )}
      </div>
    </div>
  );
}

// =====================================================================
// MASTER: Binding Collection -> danh sách
// =====================================================================
function MasterList({ meetings, selectedId, onSelect }) {
  return (
    <section className="md-master" aria-label="Danh sách cuộc họp">
      <ul className="md-list">
        {meetings.map((m) => {
          const room = ROOMS.find((r) => r.id === m.roomId);
          const status = STATUSES.find((s) => s.value === m.status);
          return (
            <li key={m.id}>
              <button
                className={"md-item" + (m.id === selectedId ? " is-selected" : "")}
                onClick={() => onSelect(m.id)}
                aria-current={m.id === selectedId}
              >
                <span className="md-item-title">{m.title}</span>
                <span className="md-item-meta">
                  {formatTime(m.start)} · {room?.name}
                </span>
                <span className={"md-badge md-badge-" + m.status}>{status?.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// =====================================================================
// DETAIL: Binding Object -> Form (controlled components)
// =====================================================================
function DetailForm({ meeting, onSave, onDelete, onCancelNew }) {
  // draft là bản sao có thể sửa của object được chọn.
  // Chưa bấm "Lưu" thì collection ở component cha không bị ảnh hưởng.
  const [draft, setDraft] = useState(meeting);
  const [errors, setErrors] = useState({});
  const [saved, setSaved] = useState(false);

  const isNew = meeting.id === null;
  const isDirty = JSON.stringify(draft) !== JSON.stringify(meeting);

  // Một handler dùng chung cho mọi ô: tên trường lấy từ thuộc tính name của input
  function handleChange(e) {
    const { name, value } = e.target;
    setDraft((d) => ({ ...d, [name]: value })); // sự kiện -> State
    setSaved(false);
  }

  function handleSubmit(e) {
    e.preventDefault(); // chặn trình duyệt tải lại trang
    const found = validate(draft);
    setErrors(found);
    if (Object.keys(found).length > 0) return; // dừng nếu không hợp lệ
    onSave(draft);
    setSaved(true);
  }

  function handleReset() {
    setDraft(meeting); // quay về object gốc
    setErrors({});
  }

  const room = ROOMS.find((r) => r.id === Number(draft.roomId));

  return (
    <section className="md-detail" aria-label="Chi tiết cuộc họp">
      <h2>{isNew ? "Cuộc họp mới" : draft.title || "Chi tiết cuộc họp"}</h2>

      <form onSubmit={handleSubmit} noValidate>
        <Field label="Tên cuộc họp" error={errors.title} htmlFor="title">
          <input id="title" name="title" value={draft.title} onChange={handleChange} />
        </Field>

        <div className="md-row">
          <Field label="Bắt đầu" error={errors.start} htmlFor="start">
            <input id="start" type="datetime-local" name="start" value={draft.start} onChange={handleChange} />
          </Field>
          <Field label="Kết thúc" error={errors.end} htmlFor="end">
            <input id="end" type="datetime-local" name="end" value={draft.end} onChange={handleChange} />
          </Field>
        </div>

        <div className="md-row">
          <Field label="Phòng họp" htmlFor="roomId">
            {/* Collection ROOMS -> các <option>; value của select lấy từ State */}
            <select id="roomId" name="roomId" value={draft.roomId} onChange={handleChange}>
              {ROOMS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} (tối đa {r.capacity})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Số người tham dự" error={errors.attendees} htmlFor="attendees">
            <input id="attendees" type="number" min="1" name="attendees" value={draft.attendees} onChange={handleChange} />
          </Field>
        </div>

        <Field label="Trạng thái" htmlFor="status">
          <select id="status" name="status" value={draft.status} onChange={handleChange}>
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Ghi chú" htmlFor="note">
          <textarea id="note" name="note" rows="3" value={draft.note} onChange={handleChange} />
        </Field>

        {/* Binding một chiều ra giao diện: tóm tắt tự cập nhật theo draft */}
        <p className="md-summary">
          {draft.title || "(chưa đặt tên)"} — {room?.name}, {formatTime(draft.start)} đến {formatTime(draft.end)}
        </p>

        <div className="md-actions">
          <button type="submit" className="md-btn md-btn-primary" disabled={!isNew && !isDirty}>
            Lưu thay đổi
          </button>
          {isNew ? (
            <button type="button" className="md-btn" onClick={onCancelNew}>
              Hủy
            </button>
          ) : (
            <>
              <button type="button" className="md-btn" onClick={handleReset} disabled={!isDirty}>
                Hoàn tác
              </button>
              <button type="button" className="md-btn md-btn-danger" onClick={() => onDelete(meeting.id)}>
                Xóa cuộc họp
              </button>
            </>
          )}
          {saved && <span className="md-saved" role="status">Đã lưu</span>}
        </div>
      </form>
    </section>
  );
}

// Thành phần nhỏ: nhãn + ô nhập + thông báo lỗi
function Field({ label, htmlFor, error, children }) {
  return (
    <div className={"md-field" + (error ? " has-error" : "")}>
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {error && <span className="md-error">{error}</span>}
    </div>
  );
}