import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Link,
  useNavigate,
  useLocation,
} from "react-router-dom";
import {
  CalendarDays,
  LayoutDashboard,
  Users,
  Building2,
  ListTodo,
  Bell,
  FileText,
  LogOut,
  Plus,
  Search,
  AlertCircle,
} from "lucide-react";
import { api, getToken, logout } from "../api.js";
import MasterDetail from "./MasterDetail.jsx";

const input =
  "w-full rounded-lg border border-[#c4c5d7] bg-white px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-200";
const field = "block text-sm font-semibold mb-1.5";
const roles = [
  ["leader", "Trưởng đơn vị / Ban Lãnh đạo"],
  ["deputy", "Phó đơn vị / Cán bộ chủ trì"],
  ["secretary", "Thư ký cuộc họp / Quản lý lịch đơn vị"],
  ["staff", "Giảng viên / Chuyên viên nghiệp vụ"],
  ["admin", "Cán bộ quản trị cấp cơ sở"],
];
const formatTime = (v) =>
  new Date(v).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  });
const formatDate = (v) =>
  new Date(v).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
function Register() {
  const [departments, setDepartments] = useState([]),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    api("/api/departments")
      .then(setDepartments)
      .catch((e) => setMessage(e.message));
  }, []);
  async function onSubmit(e) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const obj = Object.fromEntries(fd.entries());
    obj.agreement = fd.has("agreement");
    if (obj.password !== obj.confirm_password) {
      setMessage("Mật khẩu xác nhận không khớp");
      return;
    }
    setBusy(true);
    try {
      const result = await api("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(obj),
      });
      setMessage(result.message);
      e.target.reset();
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="min-h-screen px-4 py-9 grid place-items-center">
      <form
        onSubmit={onSubmit}
        className="bg-white w-full max-w-2xl shadow-xl border rounded-2xl p-7 sm:p-10 space-y-6"
      >
        <header className="text-center space-y-2">
          <div className="text-blue-800 text-4xl">▦</div>
          <p className="text-xs text-blue-800 tracking-widest font-bold">
            NỀN TẢNG QUẢN TRỊ ĐIỀU HÀNH TRỰC TUYẾN
          </p>
          <h1 className="text-2xl font-extrabold">ĐĂNG KÝ TÀI KHOẢN MỚI</h1>
          <p className="text-slate-500 text-sm">
            Hệ thống Quản lý Lịch công tác & Cuộc họp chuyên môn
          </p>
        </header>
        <section>
          <h2 className="font-bold text-lg border-b pb-2 mb-4 text-blue-900">
            1. Thông tin cá nhân
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={field}>Họ và tên đầy đủ *</label>
              <input
                className={input}
                name="full_name"
                required
                minLength={2}
                placeholder="Nguyễn Văn An"
              />
            </div>
            <div>
              <label className={field}>Email công vụ / Email cơ quan *</label>
              <input
                className={input}
                name="email"
                type="email"
                required
                placeholder="canbo@hcmut.edu.vn"
              />
              <small className="text-slate-500">
                Tên miền gov.vn hoặc edu.vn
              </small>
            </div>
            <div>
              <label className={field}>Số điện thoại liên hệ *</label>
              <input
                className={input}
                name="phone"
                required
                minLength={9}
                placeholder="0912 345 678"
              />
            </div>
          </div>
        </section>
        <section>
          <h2 className="font-bold text-lg border-b pb-2 mb-4 text-blue-900">
            2. Đơn vị công tác & Vai trò
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={field}>Phòng ban / Khoa / Đơn vị *</label>
              <select
                className={input}
                name="department"
                required
                defaultValue=""
              >
                <option value="" disabled>
                  -- Chọn đơn vị --
                </option>
                {departments.map((d) => (
                  <option key={d.id} value={d.code}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={field}>Chức vụ / Vai trò đăng ký *</label>
              <select className={input} name="role" required defaultValue="">
                <option value="" disabled>
                  -- Chọn vai trò --
                </option>
                {roles.map(([code, label]) => (
                  <option key={code} value={code}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={field}>Mã định danh cán bộ (tùy chọn)</label>
              <input
                className={input}
                name="staff_code"
                placeholder="CB-2026-8899"
              />
            </div>
          </div>
        </section>
        <section>
          <h2 className="font-bold text-lg border-b pb-2 mb-4 text-blue-900">
            3. Thiết lập mật khẩu bảo mật
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={field}>Mật khẩu *</label>
              <input
                className={input}
                type="password"
                name="password"
                minLength={8}
                required
              />
            </div>
            <div>
              <label className={field}>Nhập lại mật khẩu *</label>
              <input
                className={input}
                type="password"
                name="confirm_password"
                required
              />
            </div>
          </div>
          <p className="mt-3 p-3 bg-[#f2f3ff] rounded-lg text-sm text-slate-600">
            Mật khẩu tối thiểu 8 ký tự, có chữ hoa, chữ số và ký tự đặc biệt.
          </p>
        </section>
        <label className="flex gap-2 text-sm text-slate-600">
          <input type="checkbox" name="agreement" required />
          <span>
            Tôi xác nhận thông tin chính xác và đồng ý quy định sử dụng hệ
            thống.
          </span>
        </label>
        <p aria-live="polite" className="text-blue-700 text-sm font-semibold">
          {message}
        </p>
        <button
          disabled={busy}
          className="w-full p-3 bg-blue-700 text-white rounded-lg font-semibold disabled:opacity-50"
        >
          {busy ? "Đang gửi..." : "Gửi yêu cầu đăng ký tài khoản →"}
        </button>
        <div className="bg-blue-50 p-3 rounded-lg text-sm text-slate-600">
          Tài khoản được tạo ở trạng thái chờ phê duyệt. Quản trị viên xác minh
          và kích hoạt tài khoản trước khi đăng nhập.
        </div>
        <p className="text-center text-sm">
          Đã có tài khoản?{" "}
          <Link className="text-blue-700 font-bold" to="/login">
            Đăng nhập ngay
          </Link>
        </p>
      </form>
    </main>
  );
}
function Login() {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    navigate = useNavigate();
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    try {
      const d = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(fd.entries())),
      });
      sessionStorage.setItem("access_token", d.access_token);
      navigate("/meetings"); // tạm thời: vào thẳng trang Master-Detail để test
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="min-h-screen grid place-items-center p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-md bg-white p-9 rounded-2xl shadow-xl space-y-5"
      >
        <div className="text-center text-4xl text-blue-800">
          <CalendarDays className="inline" size={44} />
        </div>
        <h1 className="font-extrabold text-2xl text-center">
          ĐĂNG NHẬP HỆ THỐNG
        </h1>
        <p className="text-slate-500 text-sm text-center">
          Quản lý Lịch công tác & Cuộc họp chuyên môn
        </p>
        <label className={field}>
          Email công vụ
          <input
            className={input + " mt-2"}
            name="email"
            type="email"
            required
          />
        </label>
        <label className={field}>
          Mật khẩu
          <input
            className={input + " mt-2"}
            name="password"
            type="password"
            required
          />
        </label>
        <p role="alert" className="text-red-700 text-sm">
          {error}
        </p>
        <button
          disabled={busy}
          className="w-full p-3 text-white bg-blue-700 rounded-lg font-semibold"
        >
          Đăng nhập
        </button>
        <p className="text-center text-sm">
          <Link className="text-blue-700" to="/register">
            Chưa có tài khoản? Đăng ký
          </Link>
        </p>
      </form>
    </div>
  );
}
const menus = [
  ["Tổng quan", LayoutDashboard, "/dashboard"],
  ["Lịch công tác", CalendarDays, "/schedules"],
  ["Quản lý cuộc họp", Users, "/meetings"],
  ["Phòng họp", Building2, "/rooms"],
  ["Quản lý nhiệm vụ", ListTodo, "/tasks"],
  ["Biên bản cuộc họp", FileText, "/minutes"],
  ["Thông báo", Bell, "/notifications"],
  ["Người dùng & Phòng ban", Building2, "/departments"],
];
function Sidebar() {
  const { pathname } = useLocation();
  return (
    <aside className="lg:fixed lg:left-0 lg:top-0 lg:w-72 lg:h-screen bg-white shadow-sm p-4">
      <div className="bg-[#f2f3ff] rounded-xl p-4">
        <div className="font-extrabold text-blue-800">
          QUẢN LÝ LỊCH & CUỘC HỌP
        </div>
        <div className="text-xs text-slate-500 mt-1">
          Cơ quan Quản lý Điều hành
        </div>
      </div>
      <p className="text-xs text-slate-500 font-bold mt-6 mb-3">
        PHÂN HỆ TÁC NGHIỆP
      </p>
      <nav className="space-y-1">
        {menus.map(([label, Icon, to]) => (
          <Link
            key={label}
            to={to}
            className={
              "flex items-center gap-3 rounded-lg p-2.5 text-sm " +
              (pathname === to
                ? "bg-blue-700 text-white"
                : "hover:bg-blue-50 text-slate-600")
            }
          >
            <Icon size={19} />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
function MeetingsPage() {
  const navigate = useNavigate();
  useEffect(() => {
    if (!getToken()) navigate("/login");
  }, []);
  return (
    <div className="min-h-screen lg:pl-72">
      <Sidebar />
      <main className="p-6">
        <MasterDetail />
      </main>
    </div>
  );
}
function Dashboard() {
  const [user, setUser] = useState(null),
    [data, setData] = useState(null),
    [error, setError] = useState("");
  const navigate = useNavigate();
  useEffect(() => {
    if (!getToken()) {
      navigate("/login");
      return;
    }
    Promise.all([
      api("/api/auth/me", { token: getToken() }),
      api("/api/dashboard/summary", { token: getToken() }),
    ])
      .then(([u, d]) => {
        setUser(u);
        setData(d);
      })
      .catch((e) => {
        setError(e.message);
        if (e.message.includes("Token") || e.message.includes("chưa đăng nhập"))
          logout();
      });
  }, []);
  const n = data || {};
  return (
    <div className="min-h-screen lg:pl-72">
      <Sidebar />
      <div>
        <header className="bg-white shadow-sm px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-[#f2f3ff] px-3 py-2 text-sm text-slate-500">
            <Search size={17} />
            Tổng quan hoạt động
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold">
              {user?.full_name || "Đang tải..."}
              <small className="block font-normal text-slate-500">
                {user?.department}
              </small>
            </span>
            <button
              onClick={logout}
              className="flex gap-1 text-sm text-blue-800"
            >
              <LogOut size={16} />
              Đăng xuất
            </button>
          </div>
        </header>
        <main className="p-6 space-y-6">
          <div>
            <small className="text-blue-700 font-bold">
              ĐIỀU HÀNH TÁC NGHIỆP
            </small>
            <h1 className="text-2xl font-extrabold mt-1">
              Tổng quan hoạt động & Lịch làm việc hôm nay
            </h1>
            <p className="text-slate-500 text-sm mt-2">
              {new Date().toLocaleDateString("vi-VN", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          {error && <div className="p-3 bg-red-50 text-red-800">{error}</div>}
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              ["Cuộc họp hôm nay", n.meetings_today, Users],
              ["Lịch công tác tuần", n.schedules_this_week, CalendarDays],
              ["Nhiệm vụ chờ xử lý", n.pending_tasks, ListTodo],
              ["Thông báo mới", n.unread_notifications, Bell],
            ].map(([label, num, Icon]) => (
              <div
                key={label}
                className="bg-white rounded-xl shadow-sm p-5 flex justify-between"
              >
                <div>
                  <p className="text-sm text-slate-500">{label}</p>
                  <strong className="text-3xl block mt-3">{num ?? "–"}</strong>
                </div>
                <span className="text-blue-700 bg-blue-50 rounded-lg p-3 h-fit">
                  <Icon />
                </span>
              </div>
            ))}
          </div>
          <div className="grid xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-6">
              <section className="bg-white rounded-xl shadow-sm p-5">
                <h2 className="text-lg font-bold mb-4">
                  Lịch họp & Sự kiện sắp diễn ra hôm nay
                </h2>
                <div className="space-y-3">
                  {n.upcoming_meetings?.length ? (
                    n.upcoming_meetings.map((m) => (
                      <div
                        key={m.id}
                        className="bg-[#f2f3ff] p-4 rounded-lg border-l-4 border-blue-700"
                      >
                        <h3 className="font-bold">{m.title}</h3>
                        <p className="text-sm text-slate-600 mt-1">
                          {formatTime(m.start_at)} – {formatTime(m.end_at)} ·{" "}
                          {m.room} · Chủ trì: {m.organizer}
                        </p>
                        {m.join_url && (
                          <a
                            href={m.join_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-700 underline text-sm"
                          >
                            Tham gia ngay
                          </a>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500 text-sm">
                      Hôm nay chưa có cuộc họp.
                    </p>
                  )}
                </div>
              </section>
              <section className="bg-white p-5 rounded-xl shadow-sm">
                <h2 className="text-lg font-bold mb-4">
                  Nhiệm vụ & Kết luận cuộc họp đến hạn xử lý
                </h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm text-left">
                    <thead className="bg-[#f2f3ff]">
                      <tr>
                        {[
                          "Tên nhiệm vụ",
                          "Người phụ trách",
                          "Ưu tiên",
                          "Hạn",
                          "Trạng thái",
                        ].map((x) => (
                          <th key={x} className="p-3">
                            {x}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {n.tasks?.length ? (
                        n.tasks.map((t) => (
                          <tr key={t.id} className="border-b">
                            <td className="p-3 font-semibold">{t.title}</td>
                            <td className="p-3">{t.assignee}</td>
                            <td className="p-3">{t.priority}</td>
                            <td className="p-3">{formatDate(t.due_at)}</td>
                            <td className="p-3">{t.status}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan="5"
                            className="p-4 text-center text-slate-500"
                          >
                            Không có nhiệm vụ đang chờ
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
            <div className="space-y-6">
              <section className="bg-white p-5 rounded-xl shadow-sm">
                <h2 className="text-lg font-bold mb-3">
                  Tình trạng phòng họp trực tiếp
                </h2>
                <div className="space-y-3">
                  {n.rooms?.map((r) => (
                    <div
                      key={r.id}
                      className="bg-[#f2f3ff] p-3 rounded-lg flex justify-between items-center"
                    >
                      <div>
                        <strong className="text-sm">{r.name}</strong>
                        <p className="text-xs text-slate-500">
                          {r.location} · {r.capacity} chỗ
                        </p>
                      </div>
                      <span
                        className={
                          "text-xs font-semibold " +
                          (r.busy ? "text-red-700" : "text-blue-700")
                        }
                      >
                        {r.busy ? "Bận" : "Trống"}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
              <section className="bg-white p-5 rounded-xl shadow-sm">
                <h2 className="font-bold text-lg mb-3">Lối tắt nhanh</h2>
                <p className="text-slate-500 text-sm">
                  Quản lý cuộc họp và lịch công tác sẽ được mở rộng qua các phân
                  hệ.
                </p>
                <Link
                  to="/meetings"
                  className="text-blue-700 text-sm font-semibold mt-3 inline-block"
                >
                  Xem cuộc họp →
                </Link>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
function ModulePlaceholder() {
  return (
    <div className="p-8">
      <Link to="/dashboard" className="text-blue-700">
        ← Quay lại Tổng quan
      </Link>
      <h1 className="text-2xl font-bold mt-5">Phân hệ đang phát triển</h1>
      <p className="mt-2 text-slate-500">
        Backend đã có các API thử nghiệm. Giao diện CRUD sẽ được phát triển ở
        bước tiếp theo.
      </p>
    </div>
  );
}
function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<Dashboard />} />
      {/* Màn hình Master-Detail: phải đặt TRƯỚC route "/*" */}
      <Route path="/meetings" element={<MeetingsPage />} />
      <Route path="/dang-nhap.html" element={<Navigate to="/login" />} />
      <Route path="/dang-ky.html" element={<Navigate to="/register" />} />
      <Route path="/trang-chu.html" element={<Navigate to="/dashboard" />} />
      <Route path="/*" element={<ModulePlaceholder />} />
    </Routes>
  );
}
createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);