"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  KeyRound,
  LogOut,
  Megaphone,
  Moon,
  Music2,
  Plus,
  RotateCcw,
  Settings,
  Sparkles,
  Sun,
  Users,
  type LucideIcon,
} from "lucide-react";
import type {
  AmbiguousTime,
  AppData,
  AvailabilityResponse,
  ClubUser,
  Notice,
  Performance,
  PracticeCandidate,
  Role,
  Schedule,
  ScheduleSurvey,
  Song,
  SongMember,
  Team,
} from "@/types/domain";
import { createAudit, readData, resetData, SESSION_KEY, writeData } from "@/lib/local-data";
import { canManageTeams, canManageUsers, isAdminRole, roleLabel } from "@/lib/permissions";
import { cn, uid } from "@/lib/utils";

type Portal = "user" | "admin";
type Session = { userId: string; portal: Portal };
type NavItem = [string, string, LucideIcon];

const roleOptions: Role[] = ["SUPER_ADMIN", "VICE_ADMIN", "TREASURER", "TEAM_ADMIN", "USER"];
const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const defaultBlue = "#7BC7F2";
const fixedTeamColors: Record<string, string> = {
  "춤": "#7BC7F2",
  "랩": "#B8C8F8",
  "기획": "#8BDDD6",
};
const palette = ["#7BC7F2", "#B8C8F8", "#8BDDD6", "#A8DADC", "#F8DFA8", "#C9E4CA", "#D7C0F7"];

const nowIso = () => new Date().toISOString();
const today = () => new Date().toISOString().slice(0, 10);

function readSession(): Session | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return { userId: raw, portal: "user" };
  }
}

function writeSession(session: Session) {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function toDatetimeLocal(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}-${`${date.getDate()}`.padStart(2, "0")}`;
}

function sameDay(date: Date, iso: string) {
  const target = new Date(iso);
  return date.getFullYear() === target.getFullYear() && date.getMonth() === target.getMonth() && date.getDate() === target.getDate();
}

function calendarDays(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function monthTitle(date: Date) {
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long" }).format(date);
}

export default function HomePage() {
  const [data, setData] = useState<AppData | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loginMode, setLoginMode] = useState<Portal>("user");
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setData(readData());
    setSession(readSession());
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function persist(next: AppData) {
    setData(next);
    writeData(next);
  }

  const currentUser = data?.users.find((user) => user.id === session?.userId) ?? null;

  function login(username: string, password: string) {
    if (!data) return "데이터를 불러오는 중입니다.";
    const user = data.users.find((item) => item.username === username && item.password === password && item.status === "ACTIVE");
    if (!user) return "아이디 또는 비밀번호를 확인해주세요.";
    if (loginMode === "admin" && !isAdminRole(user.role)) return "관리자 권한이 없는 계정입니다.";
    const nextSession = { userId: user.id, portal: loginMode };
    writeSession(nextSession);
    setSession(nextSession);
    return null;
  }

  function logout() {
    window.localStorage.removeItem(SESSION_KEY);
    setSession(null);
  }

  function toggleTheme() {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    setDark(next);
  }

  if (!data) return <main className="soft-shell grid min-h-screen place-items-center p-6">로컬 데이터를 준비하고 있어요.</main>;

  if (!currentUser) {
    return <LoginScreen mode={loginMode} setMode={setLoginMode} onLogin={login} onReset={() => persist(resetData())} dark={dark} toggleTheme={toggleTheme} />;
  }

  if (currentUser.mustChangePassword) {
    return (
      <PasswordChangeScreen
        user={currentUser}
        onChange={(password) => {
          persist({ ...data, users: data.users.map((user) => (user.id === currentUser.id ? { ...user, password, mustChangePassword: false, updatedAt: nowIso() } : user)) });
        }}
      />
    );
  }

  return (
    <AppShell
      data={data}
      currentUser={currentUser}
      portal={session?.portal ?? "user"}
      persist={persist}
      logout={logout}
      dark={dark}
      toggleTheme={toggleTheme}
      onReset={() => persist(resetData())}
    />
  );
}

function LoginScreen({
  mode,
  setMode,
  onLogin,
  onReset,
  dark,
  toggleTheme,
}: {
  mode: Portal;
  setMode: (mode: Portal) => void;
  onLogin: (username: string, password: string) => string | null;
  onReset: () => void;
  dark: boolean;
  toggleTheme: () => void;
}) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin1234");
  const [error, setError] = useState<string | null>(null);

  function switchMode(next: Portal) {
    setMode(next);
    setUsername("admin");
    setPassword("admin1234");
    setError(null);
  }

  return (
    <main className="soft-shell min-h-screen p-6 sm:p-10">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-[1500px] gap-14 lg:grid-cols-[minmax(0,1fr)_520px] lg:items-center">
        <section className="space-y-6">
          <div className="flex items-center gap-4">
            <button className="rounded-full border border-white/70 bg-white/75 p-3 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-white dark:bg-card/70" onClick={toggleTheme} aria-label="테마 변경">
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/75 px-4 py-2 text-sm font-semibold text-primary shadow-sm backdrop-blur dark:bg-card/70">
              <Sparkles size={16} />
              Club schedule manager
            </span>
          </div>
          <h1 className="login-title-pop text-6xl font-black leading-tight sm:text-8xl">
            동아리 일정,
            <br />
            가볍게 정리.
          </h1>
        </section>

        <form
          className="login-card-rise rounded-[2rem] border border-white/70 bg-white/82 p-7 shadow-[0_24px_80px_rgba(86,144,183,0.14)] backdrop-blur dark:border-white/10 dark:bg-card/78"
          onSubmit={(event) => {
            event.preventDefault();
            setError(onLogin(username, password));
          }}
        >
          <div className="mb-5 rounded-[1.4rem] bg-muted/70 p-1.5">
            <div className="grid grid-cols-2 gap-1">
              <button type="button" className={segmentClass(mode === "user")} onClick={() => switchMode("user")}>사용자 로그인</button>
              <button type="button" className={segmentClass(mode === "admin")} onClick={() => switchMode("admin")}>관리자 로그인</button>
            </div>
          </div>
          <div className="space-y-5">
            <Field label="아이디" value={username} onChange={setUsername} />
            <Field label="비밀번호" type="password" value={password} onChange={setPassword} />
            {error && <p className="rounded-2xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
            <button className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-4 text-lg font-bold text-primary-foreground shadow-lg shadow-primary/20">
              <KeyRound size={18} />
              로그인
            </button>
          </div>
          <div className="mt-5 rounded-2xl bg-muted/70 p-4 text-sm text-muted-foreground">초기 관리자 계정: admin/admin1234</div>
          <button type="button" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground" onClick={onReset}>
            <RotateCcw size={15} />
            로컬 데이터 초기화
          </button>
        </form>
      </div>
    </main>
  );
}

function AppShell({
  data,
  currentUser,
  portal,
  persist,
  logout,
  dark,
  toggleTheme,
  onReset,
}: {
  data: AppData;
  currentUser: ClubUser;
  portal: Portal;
  persist: (data: AppData) => void;
  logout: () => void;
  dark: boolean;
  toggleTheme: () => void;
  onReset: () => void;
}) {
  const adminMode = portal === "admin" && isAdminRole(currentUser.role);
  const [view, setView] = useState("calendar");
  const nav: NavItem[] = adminMode
    ? [
        ["calendar", "캘린더", CalendarDays],
        ["users", "멤버", Users],
        ["performances", "공연 관리", Music2],
        ["songs", "공연 곡 관리", ClipboardList],
        ["archive", "과거 공연 이력", Archive],
        ["notices", "공지", Megaphone],
        ["audit", "로그", ClipboardList],
        ["mypage", "마이", Settings],
      ]
    : [
        ["calendar", "캘린더", CalendarDays],
        ["surveys", "조사", ClipboardList],
        ["notices-user", "공지", Megaphone],
        ["mypage", "마이", Settings],
      ];

  return (
    <main className="soft-shell min-h-screen">
      <aside className="fixed inset-x-3 bottom-3 z-20 rounded-[1.4rem] border border-white/70 bg-white/84 p-2 shadow-[0_16px_40px_rgba(86,144,183,0.14)] backdrop-blur md:inset-y-4 md:left-4 md:right-auto md:w-80 md:p-5 dark:border-white/10 dark:bg-card/82">
        <div className="hidden pb-5 md:block">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <Sparkles size={21} />
            </div>
            <div>
              <p className="text-sm font-bold text-primary">Club Scheduler</p>
              <h1 className="text-lg font-black">{adminMode ? "관리자 공간" : "사용자 공간"}</h1>
            </div>
          </div>
        </div>
        <nav className="grid grid-cols-4 gap-1 md:block md:space-y-2">
          {nav.map(([id, label, Icon]) => (
            <button
              key={id}
              className={cn(
                "flex w-full flex-col items-center justify-center gap-1 rounded-[1rem] px-2 py-2 text-xs font-bold transition md:flex-row md:justify-start md:px-4 md:py-3 md:text-sm",
                view === id ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-muted-foreground hover:bg-muted/70",
              )}
              onClick={() => setView(id)}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>
      </aside>

      <section className="pb-28 md:ml-[22rem] md:pb-0">
        <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-4 backdrop-blur sm:px-7">
          <div>
            <p className="text-sm font-semibold text-muted-foreground">
              {roleLabel(currentUser.role)} · {currentUser.name} · {adminMode ? "관리자" : "사용자"}
            </p>
            <h2 className="text-2xl font-black">{view === "calendar" ? "이번 달 일정" : nav.find(([id]) => id === view)?.[1]}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button className="rounded-2xl border border-white/70 bg-white/75 p-3 shadow-sm dark:border-white/10 dark:bg-card/70" onClick={toggleTheme} aria-label="테마 변경">
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button className="rounded-2xl border border-white/70 bg-white/75 p-3 shadow-sm dark:border-white/10 dark:bg-card/70" onClick={logout} aria-label="로그아웃">
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <div className="p-5 pt-1 sm:p-8 sm:pt-2">
          {view === "calendar" && <CalendarPanel data={data} currentUser={currentUser} adminMode={adminMode} persist={persist} />}
          {view === "users" && <UsersPanelV2 data={data} currentUser={currentUser} persist={persist} />}
          {view === "performances" && <PerformanceManagerV2 data={data} currentUser={currentUser} persist={persist} />}
          {view === "songs" && <SongManagementPanel data={data} currentUser={currentUser} persist={persist} />}
          {view === "archive" && <ArchivePanel data={data} currentUser={currentUser} persist={persist} />}
          {view === "notices" && <NoticePanel data={data} currentUser={currentUser} persist={persist} admin />}
          {view === "audit" && <AuditPanel data={data} onReset={onReset} />}
          {view === "surveys" && <SurveyPanel data={data} currentUser={currentUser} persist={persist} />}
          {view === "notices-user" && <NoticePanel data={data} currentUser={currentUser} persist={persist} />}
          {view === "mypage" && <MyPagePanel data={data} currentUser={currentUser} persist={persist} />}
        </div>
      </section>
    </main>
  );
}

function CalendarPanel({ data, currentUser, adminMode, persist }: { data: AppData; currentUser: ClubUser; adminMode: boolean; persist: (data: AppData) => void }) {
  const [month, setMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(today());
  const [showCreate, setShowCreate] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [scheduleForm, setScheduleForm] = useState({ title: "", startsAt: "", endsAt: "" });
  const [personalTitle, setPersonalTitle] = useState("");
  const [personalStart, setPersonalStart] = useState("18:00");
  const [personalEnd, setPersonalEnd] = useState("19:00");
  const visibleSchedules = useMemo(() => getVisibleSchedules(data, currentUser, adminMode), [adminMode, currentUser, data]);
  const monthDays = calendarDays(month);
  const selectedEvents = visibleSchedules.filter((schedule) => toDateKey(new Date(schedule.startsAt)) === selectedDate);
  const upcoming = visibleSchedules.slice().sort((a, b) => a.startsAt.localeCompare(b.startsAt)).slice(0, 5);
  const pinned = data.notices.filter((notice) => notice.pinned);

  function addPersonalSchedule() {
    if (!personalTitle.trim()) return;
    const createdAt = nowIso();
    const schedule: Schedule = {
      id: uid("schedule"),
      type: "PERSONAL",
      title: personalTitle,
      startsAt: new Date(`${selectedDate}T${personalStart}`).toISOString(),
      endsAt: new Date(`${selectedDate}T${personalEnd}`).toISOString(),
      color: "#AAB2BD",
      ownerUserId: currentUser.id,
      visibility: "PRIVATE",
      status: "CONFIRMED",
      createdBy: currentUser.id,
      createdAt,
      updatedAt: createdAt,
    };
    persist({ ...data, schedules: [...data.schedules, schedule] });
    setPersonalTitle("");
    setShowCreate(false);
  }

  function startEditSchedule(schedule: Schedule) {
    setEditingScheduleId(schedule.id);
    setScheduleForm({ title: schedule.title, startsAt: toDatetimeLocal(schedule.startsAt), endsAt: toDatetimeLocal(schedule.endsAt) });
    setShowCreate(false);
  }

  function saveScheduleEdit() {
    if (!editingScheduleId || !scheduleForm.title.trim()) return;
    const updatedAt = nowIso();
    persist({
      ...data,
      schedules: data.schedules.map((schedule) => schedule.id === editingScheduleId ? { ...schedule, title: scheduleForm.title, startsAt: new Date(scheduleForm.startsAt).toISOString(), endsAt: new Date(scheduleForm.endsAt).toISOString(), updatedAt } : schedule),
      auditLogs: [...data.auditLogs, createAudit(currentUser, "UPDATE_SCHEDULE", "schedules", editingScheduleId, scheduleForm)],
    });
    setEditingScheduleId(null);
  }

  function cancelSchedule(schedule: Schedule) {
    const ok = window.confirm(`${schedule.title} 일정을 취소할까요?`);
    if (!ok) return;
    const restoredCandidates = data.practiceCandidates.map((candidate) => (
      schedule.songId &&
      candidate.songId === schedule.songId &&
      candidate.startsAt === schedule.startsAt &&
      candidate.endsAt === schedule.endsAt &&
      candidate.status === "APPROVED"
        ? { ...candidate, status: "PENDING" as const, reviewedBy: undefined, reviewedAt: undefined, updatedAt: nowIso() }
        : candidate
    ));
    persist({
      ...data,
      schedules: data.schedules.filter((item) => item.id !== schedule.id),
      practiceCandidates: restoredCandidates,
      auditLogs: [...data.auditLogs, createAudit(currentUser, "CANCEL_SCHEDULE", "schedules", schedule.id, schedule)],
    });
    if (editingScheduleId === schedule.id) setEditingScheduleId(null);
  }

  function canEditSchedule(schedule: Schedule) {
    return adminMode || schedule.ownerUserId === currentUser.id;
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
      <section className="rounded-[1.75rem] border border-white/70 bg-white/84 p-4 shadow-[0_20px_70px_rgba(86,144,183,0.12)] backdrop-blur dark:border-white/10 dark:bg-card/82 sm:p-5">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-primary">Calendar</p>
            <h3 className="text-3xl font-black">{monthTitle(month)}</h3>
          </div>
          <div className="flex items-center gap-2">
            <IconButton label="이전 달" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft size={18} /></IconButton>
            <button className="rounded-2xl bg-muted/70 px-4 py-3 text-sm font-bold" onClick={() => setMonth(new Date())}>Today</button>
            <IconButton label="다음 달" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight size={18} /></IconButton>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {weekdays.map((day) => <div key={day} className="px-2 pb-1 text-center text-xs font-black text-muted-foreground">{day}</div>)}
          {monthDays.map((date) => {
            const dateKey = toDateKey(date);
            const events = visibleSchedules.filter((schedule) => sameDay(date, schedule.startsAt));
            const isCurrentMonth = date.getMonth() === month.getMonth();
            const isToday = sameDay(date, new Date().toISOString());
            const isSelected = selectedDate === dateKey;
            return (
              <button
                key={date.toISOString()}
                className={cn(
                  "min-h-24 rounded-[1.25rem] border bg-card/80 p-2 text-left transition hover:-translate-y-0.5 hover:shadow-lg sm:min-h-30",
                  !isCurrentMonth && "opacity-45",
                  isSelected ? "border-primary/70 ring-4 ring-primary/10" : isToday ? "border-primary/35" : "border-white/80 dark:border-white/10",
                )}
                onClick={() => {
                  setSelectedDate(dateKey);
                  setShowCreate(false);
                }}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className={cn("grid h-7 w-7 place-items-center rounded-full text-sm font-black", isToday && "bg-primary text-primary-foreground")}>{date.getDate()}</span>
                  {events.length > 2 && <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold">+{events.length - 2}</span>}
                </div>
                <div className="space-y-1.5">
                  {events.slice(0, 2).map((event) => <CalendarEventPill key={event.id} schedule={event} data={data} currentUser={currentUser} />)}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <aside className="space-y-5">
        <Panel title={`${selectedDate} 일정`}>
          <div className="mb-4 space-y-2">
            {selectedEvents.length === 0 && <p className="text-sm text-muted-foreground">이 날짜에 등록된 일정이 없습니다.</p>}
            {selectedEvents.map((schedule) => (
              <ScheduleRow
                key={schedule.id}
                schedule={schedule}
                data={data}
                currentUser={currentUser}
                editable={canEditSchedule(schedule)}
                onEdit={() => startEditSchedule(schedule)}
                onCancel={() => cancelSchedule(schedule)}
              />
            ))}
          </div>
          {editingScheduleId && (
            <div className="mb-4 space-y-3 border-t border-white/70 pt-4 dark:border-white/10">
              <Field label="일정 제목" value={scheduleForm.title} onChange={(value) => setScheduleForm({ ...scheduleForm, title: value })} />
              <Field label="시작" type="datetime-local" value={scheduleForm.startsAt} onChange={(value) => setScheduleForm({ ...scheduleForm, startsAt: value })} />
              <Field label="종료" type="datetime-local" value={scheduleForm.endsAt} onChange={(value) => setScheduleForm({ ...scheduleForm, endsAt: value })} />
              <PrimaryButton onClick={saveScheduleEdit}>수정 저장</PrimaryButton>
              <button className="w-full rounded-2xl bg-muted/70 px-4 py-3 text-sm font-bold" onClick={() => setEditingScheduleId(null)}>닫기</button>
            </div>
          )}
          {!showCreate ? (
            <PrimaryButton onClick={() => setShowCreate(true)} icon={<Plus size={17} />}>일정 생성</PrimaryButton>
          ) : (
            <div className="space-y-3 border-t border-white/70 pt-4 dark:border-white/10">
              <Field label="개인 일정 제목" value={personalTitle} onChange={setPersonalTitle} />
              <div className="grid grid-cols-2 gap-2">
                <Field label="시작" type="time" value={personalStart} onChange={setPersonalStart} />
                <Field label="종료" type="time" value={personalEnd} onChange={setPersonalEnd} />
              </div>
              <PrimaryButton onClick={addPersonalSchedule}>개인 일정 추가</PrimaryButton>
              <button className="w-full rounded-2xl bg-muted/70 px-4 py-3 text-sm font-bold" onClick={() => setShowCreate(false)}>닫기</button>
            </div>
          )}
        </Panel>
        <Panel title="다가오는 일정"><div className="space-y-3">{upcoming.map((schedule) => <ScheduleRow key={schedule.id} schedule={schedule} data={data} currentUser={currentUser} />)}</div></Panel>
        <Panel title="고정 공지"><div className="space-y-3">{pinned.map((notice) => <NoticeCard key={notice.id} notice={notice} />)}</div></Panel>
      </aside>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function UsersPanel({ data, currentUser, persist }: { data: AppData; currentUser: ClubUser; persist: (data: AppData) => void }) {
  const [form, setForm] = useState({ name: "", username: "", password: "", teamId: data.teams[0]?.id ?? "", role: "USER" as Role });
  const [teamName, setTeamName] = useState("");
  const allowed = canManageUsers(currentUser.role);

  function addTeam() {
    if (!teamName.trim() || !canManageTeams(currentUser.role)) return;
    const createdAt = nowIso();
    const team: Team = { id: uid("team"), name: teamName, color: fixedTeamColors[teamName] ?? palette[data.teams.length % palette.length], order: data.teams.length + 1, isActive: true, createdAt, updatedAt: createdAt };
    persist({ ...data, teams: [...data.teams, team], auditLogs: [...data.auditLogs, createAudit(currentUser, "CREATE_TEAM", "teams", team.id, team)] });
    setTeamName("");
  }

  function createUser() {
    if (!allowed || !form.name || !form.username || !form.password) return;
    const team = data.teams.find((item) => item.id === form.teamId);
    const createdAt = nowIso();
    const user: ClubUser = {
      id: uid("user"),
      ...form,
      teamId: form.teamId || null,
      teamColor: team?.color ?? defaultBlue,
      performanceColors: {},
      mustChangePassword: true,
      status: "ACTIVE",
      createdAt,
      updatedAt: createdAt,
    };
    persist({ ...data, users: [...data.users, user], auditLogs: [...data.auditLogs, createAudit(currentUser, "CREATE_USER", "users", user.id, user)] });
    setForm({ name: "", username: "", password: "", teamId: data.teams[0]?.id ?? "", role: "USER" });
  }

  return (
    <TwoColumn>
      <div className="space-y-5">
        <Panel title="소속 팀 만들기">
          <Field label="팀 이름" value={teamName} onChange={setTeamName} />
          <PrimaryButton className="mt-3" disabled={!canManageTeams(currentUser.role)} onClick={addTeam}>생성</PrimaryButton>
        </Panel>
        <Panel title="멤버 생성">
          <div className="space-y-3">
            <Field label="이름" value={form.name} onChange={(value) => setForm({ ...form, name: value })} />
            <Field label="아이디" value={form.username} onChange={(value) => setForm({ ...form, username: value })} />
            <Field label="초기 비밀번호" type="password" value={form.password} onChange={(value) => setForm({ ...form, password: value })} />
            <Select label="소속 팀" value={form.teamId} onChange={(value) => setForm({ ...form, teamId: value })} options={data.teams.map((team) => [team.id, team.name])} />
            <Select label="Role" value={form.role} onChange={(value) => setForm({ ...form, role: value as Role })} options={roleOptions.map((role) => [role, roleLabel(role)])} />
            <PrimaryButton onClick={createUser} disabled={!allowed} icon={<Plus size={17} />}>생성</PrimaryButton>
          </div>
        </Panel>
      </div>
      <DataList title="멤버 목록" items={data.users.map((user) => ({ id: user.id, title: user.name, meta: `${user.username} · ${roleLabel(user.role)} · ${data.teams.find((team) => team.id === user.teamId)?.name ?? "팀 없음"}` }))} />
    </TwoColumn>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function PerformanceManager({ data, currentUser, persist }: { data: AppData; currentUser: ClubUser; persist: (data: AppData) => void }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = data.performances.find((item) => item.id === selectedId) ?? null;
  const [perf, setPerf] = useState({ title: "", startsAt: `${today()}T19:00`, endsAt: `${today()}T21:00`, location: "" });

  function addPerformance() {
    if (!perf.title) return;
    const createdAt = nowIso();
    const performance: Performance = {
      id: uid("perf"),
      title: perf.title,
      color: palette[data.performances.length % palette.length],
      startsAt: new Date(perf.startsAt).toISOString(),
      endsAt: new Date(perf.endsAt).toISOString(),
      location: perf.location,
      memberIds: [],
      status: "ACTIVE",
      createdBy: currentUser.id,
      createdAt,
      updatedAt: createdAt,
    };
    const schedule: Schedule = {
      id: uid("schedule"),
      type: "PERFORMANCE",
      title: performance.title,
      startsAt: performance.startsAt,
      endsAt: performance.endsAt,
      color: performance.color,
      performanceId: performance.id,
      visibility: "PUBLIC",
      status: "CONFIRMED",
      createdBy: currentUser.id,
      createdAt,
      updatedAt: createdAt,
    };
    persist({ ...data, performances: [...data.performances, performance], schedules: [...data.schedules, schedule], auditLogs: [...data.auditLogs, createAudit(currentUser, "CREATE_PERFORMANCE", "performances", performance.id, performance)] });
    setPerf({ title: "", startsAt: `${today()}T19:00`, endsAt: `${today()}T21:00`, location: "" });
  }

  return (
    <section className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <Panel title="공연 만들기">
          <div className="space-y-3">
            <Field label="공연명" value={perf.title} onChange={(value) => setPerf({ ...perf, title: value })} />
            <Field label="시작" type="datetime-local" value={perf.startsAt} onChange={(value) => setPerf({ ...perf, startsAt: value })} />
            <Field label="종료" type="datetime-local" value={perf.endsAt} onChange={(value) => setPerf({ ...perf, endsAt: value })} />
            <Field label="장소" value={perf.location} onChange={(value) => setPerf({ ...perf, location: value })} />
            <PrimaryButton onClick={addPerformance}>생성</PrimaryButton>
          </div>
        </Panel>
        <Panel title="공연 목록">
          <div className="grid gap-3 md:grid-cols-2">
            {data.performances.map((performance) => (
              <button key={performance.id} className={cn("rounded-[1.2rem] border p-4 text-left transition hover:-translate-y-0.5", selected?.id === performance.id ? "border-primary bg-primary/10" : "border-white/80 bg-card/70 dark:border-white/10")} onClick={() => setSelectedId(selected?.id === performance.id ? null : performance.id)}>
                <span className="mb-3 block h-2 w-12 rounded-full" style={{ backgroundColor: performance.color }} />
                <p className="font-black">{performance.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{formatDateTime(performance.startsAt)} · {performance.location || "장소 미정"}</p>
              </button>
            ))}
          </div>
        </Panel>
      </div>
      {selected && <PerformanceDetail data={data} currentUser={currentUser} performance={selected} persist={persist} />}
    </section>
  );
}

function PerformanceDetail({ data, currentUser, performance, persist }: { data: AppData; currentUser: ClubUser; performance: Performance; persist: (data: AppData) => void }) {
  const performanceMemberIds = performance.memberIds ?? [];
  const performanceMembers = data.users.filter((user) => performanceMemberIds.includes(user.id));
  const songs = data.songs.filter((song) => song.performanceId === performance.id);
  const [description, setDescription] = useState(performance.description ?? "");
  const [noticeText, setNoticeText] = useState("");
  const [songTitle, setSongTitle] = useState("");
  const [songTeamId, setSongTeamId] = useState(data.teams[0]?.id ?? "");
  const [songMemberIds, setSongMemberIds] = useState<string[]>([]);
  const [leaderIds, setLeaderIds] = useState<string[]>([]);
  const [editingMembers, setEditingMembers] = useState(false);
  const [draftMemberIds, setDraftMemberIds] = useState<string[]>(performanceMemberIds);
  const [songMemberTeamFilter, setSongMemberTeamFilter] = useState("all");
  const [songMemberSearch, setSongMemberSearch] = useState("");
  const filteredSongMembers = useMemo(() => {
    const keyword = songMemberSearch.trim().toLowerCase();
    return performanceMembers.filter((user) => {
      const team = data.teams.find((item) => item.id === user.teamId);
      const matchesTeam = songMemberTeamFilter === "all" || user.teamId === songMemberTeamFilter;
      const matchesSearch = !keyword || user.name.toLowerCase().includes(keyword) || user.username.toLowerCase().includes(keyword) || (team?.name ?? "").toLowerCase().includes(keyword);
      return matchesTeam && matchesSearch;
    });
  }, [data.teams, performanceMembers, songMemberSearch, songMemberTeamFilter]);

  function updatePerformance(partial: Partial<Performance>) {
    persist({ ...data, performances: data.performances.map((item) => (item.id === performance.id ? { ...item, ...partial, updatedAt: nowIso() } : item)) });
  }

  function togglePerformanceMember(userId: string) {
    setDraftMemberIds((prev) => prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]);
  }

  function savePerformanceMembers() {
    updatePerformance({ memberIds: draftMemberIds });
    setEditingMembers(false);
  }

  function addPerformanceNotice() {
    if (!noticeText.trim()) return;
    const createdAt = nowIso();
    const notice: Notice = { id: uid("notice"), type: "PERFORMANCE", title: `${performance.title} 공지`, content: noticeText, targetPerformanceId: performance.id, pinned: false, createdBy: currentUser.id, createdAt, updatedAt: createdAt };
    persist({ ...data, notices: [...data.notices, notice], auditLogs: [...data.auditLogs, createAudit(currentUser, "CREATE_NOTICE", "notices", notice.id, notice)] });
    setNoticeText("");
  }

  function addSong() {
    if (!songTitle.trim() || songMemberIds.length === 0) return;
    const createdAt = nowIso();
    const leaderUserId = leaderIds[0] ?? songMemberIds[0];
    const song: Song = { id: uid("song"), performanceId: performance.id, teamId: songTeamId, title: songTitle, leaderUserId, requiredPracticeCount: 0, estimatedPracticeMinutes: 120, order: data.songs.length + 1, status: "ACTIVE", createdAt, updatedAt: createdAt };
    const memberships: SongMember[] = songMemberIds.map((userId) => ({ id: uid("member"), performanceId: performance.id, songId: song.id, userId, joinedAt: createdAt }));
    persist({ ...data, songs: [...data.songs, song], songMembers: [...data.songMembers, ...memberships], auditLogs: [...data.auditLogs, createAudit(currentUser, "CREATE_SONG", "songs", song.id, song)] });
    setSongTitle("");
    setSongMemberIds([]);
    setLeaderIds([]);
  }

  return (
    <Panel title={`${performance.title} 상세`}>
      <div className="grid gap-5 xl:grid-cols-3">
        <Panel title="공연 참여 인원" className="shadow-none">
          {!editingMembers ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {performanceMembers.length === 0 && <p className="text-sm text-muted-foreground">아직 지정된 참여 인원이 없습니다.</p>}
                {performanceMembers.map((user) => <UserPill key={user.id} user={user} data={data} />)}
              </div>
              <PrimaryButton onClick={() => { setDraftMemberIds(performanceMemberIds); setEditingMembers(true); }}>지정하기</PrimaryButton>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid max-h-80 gap-2 overflow-auto">
                {data.users.map((user) => (
                  <div key={user.id} className="flex items-center justify-between gap-3 rounded-2xl px-3 py-2 text-sm font-semibold" style={{ backgroundColor: alpha(teamColor(data.teams.find((team) => team.id === user.teamId)), "2E") }}>
                    <UserPill user={user} data={data} />
                    <SoftCheckbox checked={draftMemberIds.includes(user.id)} label="선택" onToggle={() => togglePerformanceMember(user.id)} />
                  </div>
                ))}
              </div>
              <PrimaryButton onClick={savePerformanceMembers}>저장하기</PrimaryButton>
              <button className="w-full rounded-2xl bg-muted/70 px-4 py-3 text-sm font-bold" onClick={() => setEditingMembers(false)}>닫기</button>
            </div>
          )}
        </Panel>
        <Panel title="공연 곡 생성" className="shadow-none">
          <div className="space-y-3">
            <Select label="소속 팀" value={songTeamId} onChange={setSongTeamId} options={data.teams.map((team) => [team.id, team.name])} />
            <Field label="곡 / 무대 이름" value={songTitle} onChange={setSongTitle} />
            <div className="rounded-2xl bg-muted/50 p-3">
              <p className="mb-3 text-sm font-black">곡 참여 인원 / 팀장</p>
              <input
                className="mb-3 w-full rounded-2xl border border-white/80 bg-white/70 px-4 py-3 text-sm font-bold outline-none transition placeholder:text-muted-foreground/70 focus:ring-4 focus:ring-primary/15"
                value={songMemberSearch}
                onChange={(event) => setSongMemberSearch(event.target.value)}
                placeholder="이름이나 아이디로 검색"
              />
              <div className="mb-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className={cn("rounded-full px-3 py-2 text-xs font-black transition", songMemberTeamFilter === "all" ? "bg-primary text-white shadow-sm" : "bg-white/65 text-muted-foreground")}
                  onClick={() => setSongMemberTeamFilter("all")}
                >
                  전체
                </button>
                {data.teams.map((team) => (
                  <button
                    type="button"
                    key={team.id}
                    className={cn("rounded-full px-3 py-2 text-xs font-black transition", songMemberTeamFilter === team.id ? "text-white shadow-sm" : "text-foreground")}
                    style={{ backgroundColor: songMemberTeamFilter === team.id ? teamColor(team) : alpha(teamColor(team), "35") }}
                    onClick={() => setSongMemberTeamFilter(team.id)}
                  >
                    {team.name}팀만 보기
                  </button>
                ))}
              </div>
              <div className="grid max-h-44 gap-2 overflow-auto">
                {filteredSongMembers.map((user) => (
                  <div key={user.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-2xl bg-white/45 p-2 text-sm">
                    <UserPill user={user} data={data} />
                    <SoftCheckbox checked={songMemberIds.includes(user.id)} label="참여" onToggle={() => setSongMemberIds((prev) => prev.includes(user.id) ? prev.filter((id) => id !== user.id) : [...prev, user.id])} />
                    <SoftCheckbox checked={leaderIds.includes(user.id)} label="팀장" onToggle={() => setLeaderIds((prev) => prev.includes(user.id) ? prev.filter((id) => id !== user.id) : [...prev, user.id])} />
                  </div>
                ))}
                {filteredSongMembers.length === 0 && <p className="rounded-2xl bg-white/50 p-4 text-sm font-bold text-muted-foreground">조건에 맞는 참여 인원이 없습니다.</p>}
              </div>
            </div>
            <PrimaryButton onClick={addSong}>곡 생성</PrimaryButton>
          </div>
        </Panel>
        <Panel title="공연 상세 공지" className="shadow-none">
          <div className="space-y-3">
            <TextArea label="공연 설명 / 운영 메모" value={description} onChange={setDescription} />
            <PrimaryButton onClick={() => updatePerformance({ description })}>설명 저장</PrimaryButton>
            <TextArea label="참여 인원에게 보이는 공지" value={noticeText} onChange={setNoticeText} />
            <PrimaryButton onClick={addPerformanceNotice}>공지 추가</PrimaryButton>
          </div>
        </Panel>
      </div>
      <Panel title="생성된 공연 곡" className="mt-5 shadow-none">
        <div className="grid gap-3">
          {songs.length === 0 && <p className="text-sm text-muted-foreground">생성된 곡이 없습니다.</p>}
          {songs.map((song) => {
            const members = data.songMembers
              .filter((member) => member.songId === song.id)
              .map((member) => data.users.find((user) => user.id === member.userId))
              .filter((user): user is ClubUser => Boolean(user));
            return (
              <div key={song.id} className="rounded-[1.1rem] border border-white/80 bg-card/68 p-4 dark:border-white/10">
                <p className="font-black">{song.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{data.teams.find((team) => team.id === song.teamId)?.name ?? "팀 없음"} · 팀장 {data.users.find((user) => user.id === song.leaderUserId)?.name ?? "미지정"}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {members.map((user) => <UserPill key={user.id} user={user} data={data} />)}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </Panel>
  );
}

function SongManagementPanel({ data, currentUser, persist }: { data: AppData; currentUser: ClubUser; persist: (data: AppData) => void }) {
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);
  const pending = data.practiceCandidates.filter((candidate) => candidate.status === "PENDING");
  const sortedPending = pending.slice().sort((a, b) => b.availableMemberCount - a.availableMemberCount || a.startsAt.localeCompare(b.startsAt));
  const grouped = data.performances.map((performance) => ({ performance, songs: data.songs.filter((song) => song.performanceId === performance.id) })).filter((group) => group.songs.length > 0);
  const selectedSong = data.songs.find((song) => song.id === selectedSongId) ?? null;
  const conflicts = findPracticeConflicts(pending, data);

  function approveRequest(candidate: PracticeCandidate) {
    const song = data.songs.find((item) => item.id === candidate.songId);
    if (!song) return;
    const updatedAt = nowIso();
    const approved = { ...candidate, status: "APPROVED" as const, reviewedBy: currentUser.id, reviewedAt: updatedAt, updatedAt };
    const schedule: Schedule = { id: uid("schedule"), type: "PRACTICE", title: candidate.title || `${song.title} 연습`, startsAt: candidate.startsAt, endsAt: candidate.endsAt, performanceId: song.performanceId, songId: song.id, visibility: "MEMBERS_ONLY", status: "CONFIRMED", createdBy: currentUser.id, createdAt: updatedAt, updatedAt };
    persist({ ...data, practiceCandidates: data.practiceCandidates.map((item) => item.id === candidate.id ? approved : item), schedules: [...data.schedules, schedule], auditLogs: [...data.auditLogs, createAudit(currentUser, "APPROVE_SCHEDULE", "practiceCandidates", candidate.id, approved)] });
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-5">
        {grouped.map(({ performance, songs }) => (
          <Panel key={performance.id} title={performance.title}>
            <div className="grid gap-3 md:grid-cols-2">
              {songs.map((song) => (
                <button key={song.id} className={cn("rounded-[1.2rem] border p-4 text-left", selectedSongId === song.id ? "border-primary bg-primary/10" : "border-white/80 bg-card/70 dark:border-white/10")} onClick={() => setSelectedSongId(song.id)}>
                  <span className="mb-3 block h-2 w-12 rounded-full" style={{ backgroundColor: performanceColor(performance, currentUser) }} />
                  <p className="font-black">{song.title}</p>
                  <p className="text-sm text-muted-foreground">대기 요청 {pending.filter((item) => item.songId === song.id).length}개</p>
                </button>
              ))}
            </div>
          </Panel>
        ))}
      </div>
      <aside className="space-y-5">
        <Panel title="전체 연습 요청">
          <div className="space-y-3">
            {sortedPending.length === 0 && <p className="text-sm text-muted-foreground">승인 대기 중인 연습 일정이 없습니다.</p>}
            {sortedPending.map((request) => {
              const song = data.songs.find((item) => item.id === request.songId);
              const performance = data.performances.find((item) => item.id === song?.performanceId);
              const selected = selectedSong?.id === request.songId;
              return (
              <div key={request.id} className={cn("rounded-[1.1rem] border p-3", selected ? "border-primary bg-primary/10" : "border-white/70 bg-muted/55 dark:border-white/10")}>
                <p className="font-black">{request.title || "연습 요청"}</p>
                <p className="text-sm text-muted-foreground">{performance?.title ?? "공연 없음"} · {song?.title ?? "곡 없음"}</p>
                <p className="text-sm text-muted-foreground">{formatDateTime(request.startsAt)} - {formatDateTime(request.endsAt)} · 가능 {request.availableMemberCount}/{request.totalMemberCount}명</p>
                {request.memo && <p className="mt-1 text-sm">{request.memo}</p>}
                <PrimaryButton className="mt-3" onClick={() => approveRequest(request)}><Check size={16} />확정</PrimaryButton>
              </div>
              );
            })}
          </div>
        </Panel>
        <Panel title="충돌 정리">
          <div className="space-y-3">
            {conflicts.length === 0 && <p className="text-sm text-muted-foreground">타팀과 겹치는 대기 요청이 없습니다.</p>}
            {conflicts.map((conflict) => (
              <div key={`${conflict.first.id}-${conflict.second.id}`} className="rounded-[1.1rem] bg-muted/55 p-3 text-sm">
                <p className="font-black">{formatDateTime(conflict.startsAt)} - {formatDateTime(conflict.endsAt)}</p>
                <div className="mt-2 grid gap-2">
                  {[conflict.first, conflict.second].map((item) => (
                    <div key={item.id} className="rounded-2xl bg-white/55 p-3">
                      <p className="font-black">{item.performanceTitle} · {item.songTitle}</p>
                      <p className="text-muted-foreground">팀 {item.teamName} · 가능 {item.availableMemberCount}/{item.totalMemberCount}명</p>
                    </div>
                  ))}
                </div>
                <p className={cn("mt-2 rounded-xl px-3 py-2 font-bold", conflict.sharedMemberCount >= 2 ? "bg-destructive/10 text-destructive" : "bg-primary/15 text-primary")}>
                  겹치는 인원 {conflict.sharedMemberCount}명 · {conflict.sharedMemberCount >= 2 ? "동시 확정 비추천" : "동시 확정 가능"}
                </p>
              </div>
            ))}
          </div>
        </Panel>
      </aside>
    </section>
  );
}

function SurveyPanel({ data, currentUser, persist }: { data: AppData; currentUser: ClubUser; persist: (data: AppData) => void }) {
  const leaderSongs = data.songs.filter((song) => song.leaderUserId === currentUser.id);
  const memberSongIds = data.songMembers.filter((member) => member.userId === currentUser.id).map((member) => member.songId);
  const openSurveys = data.surveys.filter((survey) => survey.status === "OPEN" && memberSongIds.includes(survey.songId));
  const leaderSurveys = data.surveys.filter((survey) => leaderSongs.some((song) => song.id === survey.songId));
  const [form, setForm] = useState({ songId: leaderSongs[0]?.id ?? "", startDate: today(), endDate: today(), timeStart: "18:00", timeEnd: "22:00" });
  const [selectedSurveyId, setSelectedSurveyId] = useState(openSurveys[0]?.id ?? "");
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
  const [dragMode, setDragMode] = useState<"select" | "erase" | null>(null);
  const [ambiguousMemo, setAmbiguousMemo] = useState("");
  const selectedSurvey = openSurveys.find((survey) => survey.id === selectedSurveyId) ?? openSurveys[0] ?? null;
  const selectedSurveyDates = selectedSurvey ? getDateRange(selectedSurvey.startDate, selectedSurvey.endDate) : [];
  const selectedSurveyTimes = selectedSurvey ? getSurveyTimes(selectedSurvey) : [];

  useEffect(() => {
    if (!selectedSurveyId && openSurveys[0]) {
      setSelectedSurveyId(openSurveys[0].id);
    }
  }, [openSurveys, selectedSurveyId]);

  useEffect(() => {
    if (!selectedSurveyId) return;
    const saved = data.availabilityResponses.find((response) => response.surveyId === selectedSurveyId && response.userId === currentUser.id);
    setSelectedSlots(new Set(saved?.slots.filter((slot) => slot.available).map((slot) => slotKey(slot.date, slot.time)) ?? []));
  }, [currentUser.id, data.availabilityResponses, selectedSurveyId]);

  function addSurvey() {
    const song = data.songs.find((item) => item.id === form.songId);
    if (!song || song.leaderUserId !== currentUser.id) return;
    const createdAt = nowIso();
    const survey: ScheduleSurvey = { id: uid("survey"), performanceId: song.performanceId, songId: song.id, createdBy: currentUser.id, title: `${song.title} 일정 조사`, startDate: form.startDate, endDate: form.endDate, timeStart: form.timeStart, timeEnd: form.timeEnd, slotMinutes: 30, status: "OPEN", createdAt, updatedAt: createdAt };
    persist({ ...data, surveys: [...data.surveys, survey] });
  }

  function toggleSlot(date: string, time: string, forcedMode?: "select" | "erase") {
    const key = slotKey(date, time);
    setSelectedSlots((prev) => {
      const next = new Set(prev);
      const mode = forcedMode ?? (next.has(key) ? "erase" : "select");
      if (mode === "erase") next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function submitResponse() {
    if (!selectedSurvey) return;
    const submittedAt = nowIso();
    const slots = selectedSurveyDates.flatMap((date) => selectedSurveyTimes.map((time) => ({ date, time, available: selectedSlots.has(slotKey(date, time)) })));
    const availability: AvailabilityResponse = { id: uid("availability"), surveyId: selectedSurvey.id, userId: currentUser.id, slots, submittedAt, updatedAt: submittedAt };
    const ambiguous: AmbiguousTime | null = ambiguousMemo.trim() ? { id: uid("ambiguous"), surveyId: selectedSurvey.id, userId: currentUser.id, date: selectedSurvey.startDate, timeStart: selectedSurvey.timeStart, timeEnd: selectedSurvey.timeEnd, memo: ambiguousMemo, createdAt: submittedAt } : null;
    persist({ ...data, availabilityResponses: [...data.availabilityResponses.filter((item) => !(item.surveyId === selectedSurvey.id && item.userId === currentUser.id)), availability], ambiguousTimes: ambiguous ? [...data.ambiguousTimes, ambiguous] : data.ambiguousTimes });
    setAmbiguousMemo("");
  }

  function createRecommendedCandidate(survey: ScheduleSurvey, recommendation: { date: string; start: string; end: string; count: number; total: number }) {
    const song = data.songs.find((item) => item.id === survey.songId);
    if (!song || song.leaderUserId !== currentUser.id) return;
    const createdAt = nowIso();
    const candidate: PracticeCandidate = {
      id: uid("candidate"),
      performanceId: song.performanceId,
      songId: song.id,
      surveyId: survey.id,
      proposedBy: currentUser.id,
      title: `${song.title} 연습`,
      startsAt: makeLocalIso(recommendation.date, recommendation.start),
      endsAt: makeLocalIso(recommendation.date, recommendation.end),
      availableMemberCount: recommendation.count,
      totalMemberCount: recommendation.total,
      memo: `일정 조사 추천 후보 · ${recommendation.count}/${recommendation.total}명 가능`,
      status: "PENDING",
      createdAt,
      updatedAt: createdAt,
    };
    persist({ ...data, practiceCandidates: [...data.practiceCandidates, candidate] });
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[380px_1fr]">
      <div className="space-y-5">
        <Panel title="일정 조사 만들기">
          {leaderSongs.length === 0 ? <p className="text-sm leading-6 text-muted-foreground">팀장으로 지정된 곡이 있을 때만 일정을 조사할 수 있습니다.</p> : (
            <div className="space-y-3">
              <Select label="팀장인 곡" value={form.songId} onChange={(value) => setForm({ ...form, songId: value })} options={leaderSongs.map((song) => [song.id, song.title])} />
              <Field label="시작 날짜" type="date" value={form.startDate} onChange={(value) => setForm({ ...form, startDate: value })} />
              <Field label="종료 날짜" type="date" value={form.endDate} onChange={(value) => setForm({ ...form, endDate: value })} />
              <Field label="시작 시간" type="time" value={form.timeStart} onChange={(value) => setForm({ ...form, timeStart: value })} />
              <Field label="종료 시간" type="time" value={form.timeEnd} onChange={(value) => setForm({ ...form, timeEnd: value })} />
              <PrimaryButton onClick={addSurvey}>조사 생성</PrimaryButton>
            </div>
          )}
        </Panel>
        <SurveySummaryPanel data={data} surveys={leaderSurveys} onCreateCandidate={createRecommendedCandidate} />
      </div>
      <Panel title="조사 응답">
        {openSurveys.length === 0 || !selectedSurvey ? (
          <p className="text-sm text-muted-foreground">참여 중인 열린 조사가 없습니다.</p>
        ) : (
          <div className="space-y-4">
            <Select label="참여 중인 조사" value={selectedSurvey.id} onChange={setSelectedSurveyId} options={openSurveys.map((survey) => [survey.id, survey.title])} />
            <AvailabilityGrid
              dates={selectedSurveyDates}
              times={selectedSurveyTimes}
              selectedSlots={selectedSlots}
              dragMode={dragMode}
              onDragMode={setDragMode}
              onToggleSlot={toggleSlot}
            />
            <TextArea label="애매한 시간 메모" value={ambiguousMemo} onChange={setAmbiguousMemo} />
            <PrimaryButton onClick={submitResponse}>응답 저장</PrimaryButton>
          </div>
        )}
      </Panel>
    </section>
  );
}

function ArchivePanel({ data, currentUser, persist }: { data: AppData; currentUser: ClubUser; persist: (data: AppData) => void }) {
  const [query, setQuery] = useState("");
  const [selectedNames, setSelectedNames] = useState<string[]>([]);
  const [mergeBaseId, setMergeBaseId] = useState("");
  const [mergeQuery, setMergeQuery] = useState("");
  const [mergeSelectedIds, setMergeSelectedIds] = useState<string[]>([]);
  const normalizedQuery = query.trim().toLowerCase();
  const normalizedMergeQuery = mergeQuery.trim().toLowerCase();
  const mergeBase = data.archiveSongs.find((item) => item.id === mergeBaseId) ?? null;
  const archiveMemberNames = Array.from(new Set(data.archiveSongs.flatMap((item) => item.memberNames))).sort((a, b) => a.localeCompare(b, "ko"));
  const filteredArchiveMembers = archiveMemberNames.filter((name) => !normalizedQuery || name.toLowerCase().includes(normalizedQuery));
  const mergeCandidates = data.archiveSongs.filter((item) => {
    if (item.id === mergeBaseId) return false;
    if (!normalizedMergeQuery) return true;
    return [item.performanceTitle, item.songTitle, item.leaderName, ...item.memberNames].some((value) => value.toLowerCase().includes(normalizedMergeQuery));
  });
  const scoredArchives = data.archiveSongs
    .map((item) => {
      const selectedMatchCount = selectedNames.filter((name) => item.memberNames.includes(name)).length;
      const textMatches = !normalizedQuery || [
      item.performanceTitle,
      item.songTitle,
      item.leaderName,
      ...item.memberNames,
      ].some((value) => value.toLowerCase().includes(normalizedQuery));
      return { item, selectedMatchCount, textMatches };
    })
    .filter(({ selectedMatchCount, textMatches }) => (selectedNames.length > 0 ? selectedMatchCount > 0 : textMatches))
    .sort((a, b) => {
      if (b.selectedMatchCount !== a.selectedMatchCount) return b.selectedMatchCount - a.selectedMatchCount;
      return a.item.songTitle.localeCompare(b.item.songTitle, "ko");
    });

  function beginMerge(itemId: string) {
    const item = data.archiveSongs.find((archive) => archive.id === itemId);
    setMergeBaseId(itemId);
    setMergeSelectedIds([]);
    setMergeQuery(item?.songTitle ?? "");
  }

  function cancelMerge() {
    setMergeBaseId("");
    setMergeSelectedIds([]);
    setMergeQuery("");
  }

  function splitPerformanceTitles(value: string) {
    return value.split(" · ").map((title) => title.trim()).filter(Boolean);
  }

  function mergeArchiveSongs() {
    if (!mergeBase || mergeSelectedIds.length === 0) return;
    const selectedIds = new Set([mergeBase.id, ...mergeSelectedIds]);
    const selectedItems = data.archiveSongs
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => selectedIds.has(item.id))
      .sort((a, b) => a.index - b.index);
    const primary = selectedItems[0]?.item;
    if (!primary) return;
    const performanceTitle = Array.from(new Set(selectedItems.flatMap(({ item }) => splitPerformanceTitles(item.performanceTitle)))).join(" · ");
    const memberNames = Array.from(new Set(selectedItems.flatMap(({ item }) => item.memberNames)));
    const sources = Array.from(new Set(selectedItems.map(({ item }) => item.source).filter((source): source is string => Boolean(source))));
    const mergedItem = {
      ...primary,
      performanceTitle,
      memberNames,
      source: sources.join(" · ") || primary.source,
      updatedAt: nowIso(),
    };
    const removableIds = new Set(selectedItems.map(({ item }) => item.id).filter((id) => id !== primary.id));
    persist({
      ...data,
      archiveSongs: data.archiveSongs.flatMap((item) => {
        if (item.id === primary.id) return [mergedItem];
        if (removableIds.has(item.id)) return [];
        return [item];
      }),
      auditLogs: [...data.auditLogs, createAudit(currentUser, "MERGE_ARCHIVE_SONGS", "archiveSongs", primary.id, { mergedIds: Array.from(selectedIds), title: primary.songTitle })],
    });
    cancelMerge();
  }

  function importCurrentSongs() {
    const createdAt = nowIso();
    const existingKeys = new Set(data.archiveSongs.map((item) => item.archiveKey));
    const archiveSongs = data.songs.flatMap((song) => {
      const performance = data.performances.find((item) => item.id === song.performanceId);
      if (!performance) return [];
      const key = `current-${performance.id}-${song.id}`;
      if (existingKeys.has(key)) return [];
      const memberNames = data.songMembers
        .filter((member) => member.songId === song.id)
        .map((member) => data.users.find((user) => user.id === member.userId)?.name)
        .filter((name): name is string => Boolean(name));
      const leaderName = data.users.find((user) => user.id === song.leaderUserId)?.name ?? memberNames[0] ?? "";
      return [{
        id: uid("archive"),
        archiveKey: key,
        performanceTitle: performance.title,
        teamId: song.teamId,
        songTitle: song.title,
        leaderName,
        memberNames,
        source: "현재 진행 곡",
        createdAt,
        updatedAt: createdAt,
      }];
    });
    persist({
      ...data,
      archiveSongs: [...data.archiveSongs, ...archiveSongs],
      auditLogs: [...data.auditLogs, createAudit(currentUser, "IMPORT_CURRENT_SONGS_TO_ARCHIVE", "archiveSongs", "current", { songs: archiveSongs.length })],
    });
  }

  return (
    <section className="space-y-5">
      <Panel title="과거 공연 이력 DB">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
          <input
            className="rounded-2xl border border-white/80 bg-white/70 px-5 py-4 text-sm font-bold outline-none transition placeholder:text-muted-foreground/70 focus:ring-4 focus:ring-primary/15"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="공연명, 곡명, 팀원 이름 검색"
          />
          <button type="button" className="rounded-2xl bg-white/70 px-5 py-4 text-sm font-black shadow-sm" onClick={importCurrentSongs}>현재 곡 이력 추가</button>
        </div>
        <div className="mt-4 space-y-3">
          {selectedNames.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedNames.map((name) => (
                <button key={name} type="button" className="rounded-full bg-primary/15 px-3 py-1.5 text-xs font-black text-primary" onClick={() => setSelectedNames((names) => names.filter((item) => item !== name))}>
                  {name} 지우기
                </button>
              ))}
              <button type="button" className="rounded-full bg-white/70 px-3 py-1.5 text-xs font-black text-muted-foreground" onClick={() => setSelectedNames([])}>전체 해제</button>
            </div>
          )}
          {normalizedQuery && filteredArchiveMembers.length > 0 && (
            <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto rounded-2xl bg-primary/8 p-3">
              {filteredArchiveMembers.slice(0, 40).map((name) => {
                const selected = selectedNames.includes(name);
                return (
                  <button
                    key={name}
                    type="button"
                    className={cn("rounded-full px-3 py-1.5 text-xs font-black transition", selected ? "bg-primary text-primary-foreground" : "bg-white/75 text-foreground hover:bg-white")}
                    onClick={() => setSelectedNames((names) => (names.includes(name) ? names.filter((item) => item !== name) : [...names, name]))}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </Panel>
      {mergeBase && (
        <Panel title="곡 병합">
          <div className="space-y-4">
            <div className="rounded-3xl bg-primary/10 p-4">
              <p className="text-sm font-black text-primary">기준 카드</p>
              <p className="mt-1 text-lg font-black">{mergeBase.songTitle}</p>
              <p className="mt-1 text-sm font-bold text-muted-foreground">{mergeBase.performanceTitle} · 팀장 {mergeBase.leaderName || "미지정"}</p>
            </div>
            <input
              className="w-full rounded-2xl border border-white/80 bg-white/70 px-5 py-4 text-sm font-bold outline-none transition placeholder:text-muted-foreground/70 focus:ring-4 focus:ring-primary/15"
              value={mergeQuery}
              onChange={(event) => setMergeQuery(event.target.value)}
              placeholder="병합할 곡 검색"
            />
            <div className="grid max-h-80 gap-2 overflow-y-auto rounded-3xl bg-primary/8 p-3">
              {mergeCandidates.length === 0 && <p className="p-3 text-sm font-bold text-muted-foreground">병합할 곡을 찾지 못했습니다.</p>}
              {mergeCandidates.slice(0, 80).map((item) => {
                const selected = mergeSelectedIds.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={cn("rounded-2xl border px-4 py-3 text-left transition", selected ? "border-primary bg-primary/15" : "border-white/70 bg-white/55 hover:bg-white/80")}
                    onClick={() => setMergeSelectedIds((ids) => (ids.includes(item.id) ? ids.filter((id) => id !== item.id) : [...ids, item.id]))}
                  >
                    <p className="font-black">{item.songTitle}</p>
                    <p className="mt-1 text-xs font-bold text-muted-foreground">{item.performanceTitle} · 팀장 {item.leaderName || "미지정"}</p>
                  </button>
                );
              })}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <button type="button" className="rounded-2xl bg-primary px-5 py-4 text-sm font-black text-primary-foreground shadow-lg shadow-primary/20 disabled:opacity-45" disabled={mergeSelectedIds.length === 0} onClick={mergeArchiveSongs}>
                {mergeSelectedIds.length + 1}개 카드 병합
              </button>
              <button type="button" className="rounded-2xl bg-white/70 px-5 py-4 text-sm font-black shadow-sm" onClick={cancelMerge}>취소</button>
            </div>
          </div>
        </Panel>
      )}
      <Panel title={`이력 목록 ${scoredArchives.length}개`}>
        <div className="grid gap-3">
          {scoredArchives.length === 0 && <p className="text-sm text-muted-foreground">검색 결과가 없습니다.</p>}
          {scoredArchives.map(({ item, selectedMatchCount }) => {
            const team = data.teams.find((teamItem) => teamItem.id === item.teamId);
            return (
              <div
                key={item.id}
                className="rounded-3xl border p-4 transition hover:-translate-y-0.5 hover:shadow-sm"
                style={{ borderColor: teamColor(team), backgroundColor: alpha(teamColor(team), "22") }}
                onDoubleClick={() => beginMerge(item.id)}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-lg font-black">{item.songTitle}</p>
                    <p className="text-sm font-bold text-muted-foreground">{item.performanceTitle} · 팀장 {item.leaderName || "미지정"}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedNames.length > 0 && <span className="w-fit rounded-full bg-primary/15 px-3 py-1 text-xs font-black text-primary">{selectedMatchCount}/{selectedNames.length}명 일치</span>}
                    <span className="w-fit rounded-full bg-white/65 px-3 py-1 text-xs font-black text-muted-foreground">{item.source ?? "이력"}</span>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.memberNames.map((name) => {
                    const user = data.users.find((candidate) => candidate.name === name);
                    return user ? <UserPill key={name} user={user} data={data} /> : <span key={name} className="rounded-full bg-white/65 px-3 py-1.5 text-sm font-black">{name}</span>;
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </section>
  );
}

function AvailabilityGrid({
  dates,
  times,
  selectedSlots,
  dragMode,
  onDragMode,
  onToggleSlot,
}: {
  dates: string[];
  times: string[];
  selectedSlots: Set<string>;
  dragMode: "select" | "erase" | null;
  onDragMode: (mode: "select" | "erase" | null) => void;
  onToggleSlot: (date: string, time: string, forcedMode?: "select" | "erase") => void;
}) {
  return (
    <div className="overflow-x-auto rounded-[1.6rem] bg-white/55 p-3 shadow-inner dark:bg-white/5" onMouseLeave={() => onDragMode(null)} onMouseUp={() => onDragMode(null)}>
      <div className="grid min-w-[680px] gap-1" style={{ gridTemplateColumns: `72px repeat(${dates.length}, minmax(72px, 1fr))` }}>
        <div />
        {dates.map((date) => (
          <div key={date} className="px-1 pb-2 text-center text-xs font-black text-muted-foreground">
            <span className="block text-foreground">{new Intl.DateTimeFormat("ko-KR", { weekday: "short" }).format(new Date(`${date}T00:00:00`))}</span>
            {date.slice(5).replace("-", ".")}
          </div>
        ))}
        {times.map((time) => (
          <div key={time} className="contents">
            <div className="pr-2 text-right text-[11px] font-bold leading-7 text-muted-foreground">{time}</div>
            {dates.map((date) => {
              const active = selectedSlots.has(slotKey(date, time));
              return (
                <button
                  key={slotKey(date, time)}
                  type="button"
                  aria-pressed={active}
                  className={cn(
                    "grid h-7 place-items-center rounded-xl border border-sky-200/70 text-[10px] font-black outline-none transition hover:ring-2 hover:ring-primary/25 focus-visible:ring-2 focus-visible:ring-primary/30",
                    active ? "bg-primary/80 text-white shadow-inner" : "bg-sky-50/80 text-slate-400 dark:bg-white/10 dark:text-slate-300",
                  )}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    const mode = active ? "erase" : "select";
                    onDragMode(mode);
                    onToggleSlot(date, time, mode);
                  }}
                  onTouchStart={(event) => {
                    event.preventDefault();
                    const mode = active ? "erase" : "select";
                    onDragMode(mode);
                    onToggleSlot(date, time, mode);
                  }}
                  onMouseEnter={() => {
                    if (dragMode) onToggleSlot(date, time, dragMode);
                  }}
                >
                  {time}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function SurveySummaryPanel({ data, surveys, onCreateCandidate }: { data: AppData; surveys: ScheduleSurvey[]; onCreateCandidate: (survey: ScheduleSurvey, recommendation: { date: string; start: string; end: string; count: number; total: number }) => void }) {
  const [recommendationLimits, setRecommendationLimits] = useState<Record<string, number>>({});

  return (
    <Panel title="조사 결과">
      <div className="space-y-5">
        {surveys.length === 0 && <p className="text-sm leading-6 text-muted-foreground">팀장으로 만든 조사가 있으면 응답 분포와 추천 연습시간이 표시됩니다.</p>}
        {surveys.map((survey) => {
          const dates = getDateRange(survey.startDate, survey.endDate);
          const times = getSurveyTimes(survey);
          const { counts, totalResponses } = getSurveyHeatmap(survey, data);
          const recommendations = getSurveyRecommendations(survey, data);
          const recommendationLimit = recommendationLimits[survey.id] ?? 6;
          const visibleRecommendations = recommendations.slice(0, recommendationLimit);
          return (
            <div key={survey.id} className="rounded-3xl bg-muted/45 p-4">
              <p className="font-black">{survey.title}</p>
              <p className="mt-1 text-xs font-bold text-muted-foreground">{survey.startDate} - {survey.endDate} · 응답 {totalResponses}명</p>
              <div className="mt-3 overflow-x-auto rounded-[1.35rem] bg-white/55 p-2 shadow-inner dark:bg-white/5">
                <div className="grid min-w-[560px] gap-1" style={{ gridTemplateColumns: `56px repeat(${dates.length}, minmax(74px, 1fr))` }}>
                  <div />
                  {dates.map((date) => <div key={date} className="pb-1 text-center text-[10px] font-black text-muted-foreground">{date.slice(5).replace("-", ".")}</div>)}
                  {times.map((time) => (
                    <div key={time} className="contents">
                      <div className="pr-1 text-right text-[10px] font-bold leading-6 text-muted-foreground">{time}</div>
                      {dates.map((date) => {
                        const count = counts.get(slotKey(date, time)) ?? 0;
                        const intensity = totalResponses === 0 ? 0 : count / totalResponses;
                        return (
                          <div
                            key={slotKey(date, time)}
                            className="grid h-7 grid-cols-[1fr_auto] items-center rounded-xl border border-sky-200/70 px-2 text-[10px] font-black"
                            style={{ backgroundColor: `hsl(199 82% ${94 - intensity * 34}%)`, color: intensity > 0.55 ? "white" : "#334155" }}
                          >
                            <span className={cn("truncate", count ? "" : "opacity-45")}>{time}</span>
                            <span>{count || ""}</span>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-3 space-y-2">
                <label className="flex items-center justify-between gap-3 rounded-2xl bg-white/45 px-3 py-2 text-xs font-black">
                  <span>추천 개수</span>
                  <input
                    className="w-20 rounded-xl border border-white/80 bg-white/70 px-3 py-2 text-right outline-none focus:ring-4 focus:ring-primary/15"
                    type="number"
                    min={1}
                    max={20}
                    value={recommendationLimit}
                    onChange={(event) => {
                      const next = Math.min(20, Math.max(1, Number(event.target.value) || 1));
                      setRecommendationLimits((prev) => ({ ...prev, [survey.id]: next }));
                    }}
                  />
                </label>
                {recommendations.length === 0 && <p className="text-xs font-bold text-muted-foreground">아직 추천할 수 있는 시간이 없습니다.</p>}
                {visibleRecommendations.map((item) => (
                  <button
                    key={`${survey.id}-${item.date}-${item.start}`}
                    type="button"
                    className="flex w-full items-center justify-between gap-3 rounded-2xl bg-white/65 px-3 py-2 text-left text-sm font-bold transition hover:bg-white"
                    onClick={() => onCreateCandidate(survey, item)}
                  >
                    <span>{item.date} {item.start}-{item.end}</span>
                    <span className="rounded-full bg-primary/20 px-2 py-1 text-xs text-primary">{item.count}/{item.total}명</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function MyPagePanel({ data, currentUser, persist }: { data: AppData; currentUser: ClubUser; persist: (data: AppData) => void }) {
  const [form, setForm] = useState({ username: currentUser.username, password: currentUser.password });
  const [performanceColors, setPerformanceColors] = useState<Record<string, string>>(currentUser.performanceColors ?? {});
  const [backupMessage, setBackupMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function save() {
    persist({ ...data, users: data.users.map((user) => user.id === currentUser.id ? { ...user, ...form, performanceColors, updatedAt: nowIso() } : user) });
  }

  function exportBackup() {
    const payload = {
      app: "club-scheduler",
      version: 1,
      exportedAt: nowIso(),
      data,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `club-scheduler-backup-${today()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setBackupMessage("백업 파일을 내려받았습니다.");
  }

  function importBackup(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const nextData: AppData | null = isAppData(parsed) ? parsed : isAppData(parsed?.data) ? parsed.data : null;
        if (!nextData) {
          setBackupMessage("앱 백업 파일 형식이 아닙니다.");
          return;
        }
        const ok = window.confirm("현재 로컬 데이터를 백업 파일 내용으로 교체할까요?");
        if (!ok) {
          setBackupMessage("가져오기를 취소했습니다.");
          return;
        }
        const normalizedData: AppData = { ...nextData, archiveSongs: nextData.archiveSongs ?? [] };
        persist(normalizedData);
        setPerformanceColors(normalizedData.users.find((user) => user.id === currentUser.id)?.performanceColors ?? {});
        setBackupMessage("백업 파일을 가져왔습니다.");
      } catch {
        setBackupMessage("백업 파일을 읽지 못했습니다.");
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  }

  return (
    <Panel title="마이페이지" className="max-w-2xl">
      <div className="space-y-4">
        <Field label="아이디" value={form.username} onChange={(value) => setForm({ ...form, username: value })} />
        <Field label="비밀번호" type="password" value={form.password} onChange={(value) => setForm({ ...form, password: value })} />
        <div className="space-y-3 rounded-2xl bg-muted/50 p-4">
          <div>
            <p className="text-sm font-black">공연 색상</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">캘린더와 곡 카드에 표시할 공연별 색상입니다.</p>
          </div>
          {data.performances.length === 0 ? (
            <p className="rounded-2xl bg-white/50 p-4 text-sm font-bold text-muted-foreground">아직 생성된 공연이 없습니다.</p>
          ) : (
            data.performances.map((performance) => (
              <ColorField key={performance.id} label={performance.title} value={performanceColors[performance.id] ?? defaultBlue} onChange={(value) => setPerformanceColors({ ...performanceColors, [performance.id]: value })} />
            ))
          )}
        </div>
        <PrimaryButton onClick={save}>저장</PrimaryButton>
        <div className="space-y-3 rounded-2xl bg-muted/50 p-4">
          <div>
            <p className="text-sm font-black">로컬 데이터 백업</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">멤버, 공연, 곡, 일정, 공지 데이터를 JSON 파일로 저장하고 복구합니다.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" className="rounded-2xl bg-primary px-4 py-3 text-sm font-black text-primary-foreground shadow-lg shadow-primary/20" onClick={exportBackup}>백업 내보내기</button>
            <button type="button" className="rounded-2xl bg-white/75 px-4 py-3 text-sm font-black shadow-sm" onClick={() => fileInputRef.current?.click()}>백업 가져오기</button>
          </div>
          <input ref={fileInputRef} className="hidden" type="file" accept="application/json,.json" onChange={(event) => importBackup(event.target.files?.[0] ?? null)} />
          {backupMessage && <p className="text-xs font-bold text-muted-foreground">{backupMessage}</p>}
        </div>
      </div>
    </Panel>
  );
}

function NoticePanel({ data, currentUser, persist, admin = false }: { data: AppData; currentUser: ClubUser; persist: (data: AppData) => void; admin?: boolean }) {
  const [form, setForm] = useState({ title: "", content: "", pinned: false });
  const visibleNotices = admin ? data.notices : data.notices.filter((notice) => notice.type !== "PERFORMANCE" || !notice.targetPerformanceId || data.performances.find((performance) => performance.id === notice.targetPerformanceId)?.memberIds?.includes(currentUser.id));

  function addNotice() {
    if (!form.title || !admin) return;
    const createdAt = nowIso();
    const notice: Notice = { id: uid("notice"), type: "GENERAL", title: form.title, content: form.content, pinned: form.pinned, createdBy: currentUser.id, createdAt, updatedAt: createdAt };
    persist({ ...data, notices: [...data.notices, notice], auditLogs: [...data.auditLogs, createAudit(currentUser, "CREATE_NOTICE", "notices", notice.id, notice)] });
    setForm({ title: "", content: "", pinned: false });
  }

  return (
    <TwoColumn>
      {admin && <Panel title="공지 작성"><div className="space-y-3"><Field label="제목" value={form.title} onChange={(value) => setForm({ ...form, title: value })} /><TextArea label="내용" value={form.content} onChange={(value) => setForm({ ...form, content: value })} /><label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={form.pinned} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} /> 고정</label><PrimaryButton onClick={addNotice}>작성</PrimaryButton></div></Panel>}
      <DataList title="공지" items={visibleNotices.map((notice) => ({ id: notice.id, title: notice.pinned ? `[고정] ${notice.title}` : notice.title, meta: notice.content }))} />
    </TwoColumn>
  );
}

function AuditPanel({ data, onReset }: { data: AppData; onReset: () => void }) {
  return <section className="space-y-5"><Panel title="Audit Log"><button className="rounded-2xl border border-white/80 bg-card px-4 py-3 text-sm font-bold shadow-sm dark:border-white/10" onClick={onReset}>샘플 데이터 초기화</button></Panel><DataList title="관리자 작업 기록" items={data.auditLogs.slice().reverse().map((log) => ({ id: log.id, title: log.action, meta: `${log.targetType}/${log.targetId} · ${formatDateTime(log.createdAt)}` }))} /></section>;
}

function PasswordChangeScreen({ user, onChange }: { user: ClubUser; onChange: (password: string) => void }) {
  const [password, setPassword] = useState("");
  return <main className="soft-shell grid min-h-screen place-items-center p-4"><Panel title="초기 비밀번호 변경" className="w-full max-w-md"><p className="mb-5 text-sm text-muted-foreground">{user.name}님, 최초 로그인 후 비밀번호를 변경해야 합니다.</p><div className="space-y-3"><Field label="새 비밀번호" type="password" value={password} onChange={setPassword} /><PrimaryButton disabled={password.length < 6} onClick={() => onChange(password)}>변경</PrimaryButton></div></Panel></main>;
}

function getVisibleSchedules(data: AppData, currentUser: ClubUser, adminMode: boolean) {
  return data.schedules.filter((schedule) => {
    if (schedule.status !== "CONFIRMED") return false;
    if (adminMode) return true;
    if (schedule.visibility === "ADMINS_ONLY") return false;
    if (schedule.visibility === "PRIVATE") return schedule.ownerUserId === currentUser.id;
    if (schedule.visibility === "PUBLIC") return true;
    if (schedule.visibility === "MEMBERS_ONLY" && schedule.songId) return data.songMembers.some((member) => member.songId === schedule.songId && member.userId === currentUser.id);
    return false;
  });
}

function performanceColor(performance: Performance, user: ClubUser) {
  return user.performanceColors?.[performance.id] ?? defaultBlue;
}

function teamColor(team?: Team) {
  if (!team) return defaultBlue;
  return fixedTeamColors[team.name] ?? team.color ?? defaultBlue;
}

function alpha(hex: string, opacity = "33") {
  return `${hex}${opacity}`;
}

function isAppData(value: unknown): value is AppData {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<Record<keyof AppData, unknown>>;
  return (
    Array.isArray(data.teams) &&
    Array.isArray(data.users) &&
    Array.isArray(data.performances) &&
    Array.isArray(data.songs) &&
    Array.isArray(data.songMembers) &&
    (data.archiveSongs === undefined || Array.isArray(data.archiveSongs)) &&
    Array.isArray(data.schedules) &&
    Array.isArray(data.surveys) &&
    Array.isArray(data.availabilityResponses) &&
    Array.isArray(data.ambiguousTimes) &&
    Array.isArray(data.practiceCandidates) &&
    Array.isArray(data.notices) &&
    Array.isArray(data.auditLogs)
  );
}

function eventColor(schedule: Schedule, data: AppData, currentUser: ClubUser) {
  if (schedule.type === "PERSONAL") return "#AAB2BD";
  if (schedule.performanceId) {
    const performance = data.performances.find((item) => item.id === schedule.performanceId);
    if (performance) return performanceColor(performance, currentUser);
  }
  return schedule.color ?? defaultBlue;
}

function findPracticeConflicts(candidates: PracticeCandidate[], data: AppData) {
  const conflicts: Array<{
    first: PracticeCandidate & { performanceTitle: string; songTitle: string; teamName: string };
    second: PracticeCandidate & { performanceTitle: string; songTitle: string; teamName: string };
    startsAt: string;
    endsAt: string;
    sharedMemberCount: number;
  }> = [];

  candidates.forEach((first, firstIndex) => {
    candidates.slice(firstIndex + 1).forEach((second) => {
      if (first.songId === second.songId) return;
      if (!(first.startsAt < second.endsAt && second.startsAt < first.endsAt)) return;
      const firstSong = data.songs.find((song) => song.id === first.songId);
      const secondSong = data.songs.find((song) => song.id === second.songId);
      if (!firstSong || !secondSong) return;
      if (firstSong.teamId === secondSong.teamId) return;
      const firstPerformance = data.performances.find((performance) => performance.id === firstSong.performanceId);
      const secondPerformance = data.performances.find((performance) => performance.id === secondSong.performanceId);
      const firstTeam = data.teams.find((team) => team.id === firstSong.teamId);
      const secondTeam = data.teams.find((team) => team.id === secondSong.teamId);
      conflicts.push({
        first: { ...first, performanceTitle: firstPerformance?.title ?? "공연 없음", songTitle: firstSong.title, teamName: firstTeam?.name ?? "팀 없음" },
        second: { ...second, performanceTitle: secondPerformance?.title ?? "공연 없음", songTitle: secondSong.title, teamName: secondTeam?.name ?? "팀 없음" },
        startsAt: first.startsAt > second.startsAt ? first.startsAt : second.startsAt,
        endsAt: first.endsAt < second.endsAt ? first.endsAt : second.endsAt,
        sharedMemberCount: getSharedMemberCount(first.songId, second.songId, data),
      });
    });
  });

  return conflicts.sort((a, b) => b.sharedMemberCount - a.sharedMemberCount || a.startsAt.localeCompare(b.startsAt));
}

function getDateRange(startDate: string, endDate: string) {
  const dates: string[] = [];
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  for (const date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    dates.push(date.toISOString().slice(0, 10));
  }
  return dates;
}

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes: number) {
  const hours = Math.floor(minutes / 60).toString().padStart(2, "0");
  const mins = (minutes % 60).toString().padStart(2, "0");
  return `${hours}:${mins}`;
}

function getSurveyTimes(survey: ScheduleSurvey) {
  const times: string[] = [];
  for (let minute = timeToMinutes(survey.timeStart); minute < timeToMinutes(survey.timeEnd); minute += survey.slotMinutes) {
    times.push(minutesToTime(minute));
  }
  return times;
}

function slotKey(date: string, time: string) {
  return `${date}_${time}`;
}

function getSurveyHeatmap(survey: ScheduleSurvey, data: AppData) {
  const responses = data.availabilityResponses.filter((response) => response.surveyId === survey.id);
  const counts = new Map<string, number>();
  responses.forEach((response) => {
    response.slots.forEach((slot) => {
      if (!slot.available) return;
      counts.set(slotKey(slot.date, slot.time), (counts.get(slotKey(slot.date, slot.time)) ?? 0) + 1);
    });
  });
  return { counts, totalResponses: responses.length };
}

function makeLocalIso(date: string, time: string) {
  return new Date(`${date}T${time}:00`).toISOString();
}

function getSurveyRecommendations(survey: ScheduleSurvey, data: AppData, durationMinutes = 60) {
  const dates = getDateRange(survey.startDate, survey.endDate);
  const times = getSurveyTimes(survey);
  const { counts, totalResponses } = getSurveyHeatmap(survey, data);
  const slotCount = Math.max(1, Math.ceil(durationMinutes / survey.slotMinutes));
  const recommendations: Array<{ date: string; start: string; end: string; count: number; total: number }> = [];

  dates.forEach((date) => {
    for (let index = 0; index <= times.length - slotCount; index += 1) {
      const window = times.slice(index, index + slotCount);
      const count = Math.min(...window.map((time) => counts.get(slotKey(date, time)) ?? 0));
      if (count > 0) {
        recommendations.push({
          date,
          start: window[0],
          end: minutesToTime(timeToMinutes(window[0]) + durationMinutes),
          count,
          total: totalResponses,
        });
      }
    }
  });

  return recommendations.sort((a, b) => b.count - a.count || a.date.localeCompare(b.date) || a.start.localeCompare(b.start)).slice(0, 6);
}

function getSongUserIds(songId: string, data: AppData) {
  return data.songMembers.filter((member) => member.songId === songId).map((member) => member.userId);
}

function getSharedMemberCount(firstSongId: string, secondSongId: string, data: AppData) {
  const first = new Set(getSongUserIds(firstSongId, data));
  return getSongUserIds(secondSongId, data).filter((userId) => first.has(userId)).length;
}

function CalendarEventPill({ schedule, data, currentUser }: { schedule: Schedule; data: AppData; currentUser: ClubUser }) {
  const color = eventColor(schedule, data, currentUser);
  return <div className="truncate rounded-md px-2 py-1 text-[11px] font-black text-foreground shadow-sm" style={{ backgroundColor: `${color}55` }}><span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} />{schedule.title}</div>;
}

function ScheduleRow({ schedule, data, currentUser, editable = false, onEdit, onCancel }: { schedule: Schedule; data: AppData; currentUser: ClubUser; editable?: boolean; onEdit?: () => void; onCancel?: () => void }) {
  const color = eventColor(schedule, data, currentUser);
  return (
    <div className="flex gap-3 rounded-[1.1rem] bg-muted/55 p-3">
      <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-black">{schedule.title}</p>
        <p className="text-xs leading-5 text-muted-foreground">{formatDateTime(schedule.startsAt)} - {formatDateTime(schedule.endsAt)}</p>
        {editable && (
          <div className="mt-2 flex gap-2">
            <button type="button" className="rounded-full bg-white/70 px-3 py-1.5 text-xs font-black" onClick={onEdit}>수정</button>
            <button type="button" className="rounded-full bg-destructive/10 px-3 py-1.5 text-xs font-black text-destructive" onClick={onCancel}>취소</button>
          </div>
        )}
      </div>
    </div>
  );
}

function NoticeCard({ notice }: { notice: Notice }) {
  return <div className="rounded-[1.1rem] bg-muted/70 p-4"><p className="font-black">{notice.title}</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{notice.content}</p></div>;
}

function UserPill({ user, data }: { user: ClubUser; data: AppData }) {
  const team = data.teams.find((item) => item.id === user.teamId);
  const color = teamColor(team);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-black" style={{ backgroundColor: alpha(color, "42"), color: "#1f2937" }}>
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      {user.name}
    </span>
  );
}

function SoftCheckbox({ checked, label, onToggle, className }: { checked: boolean; label: string; onToggle: () => void; className?: string }) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={onToggle}
      className={cn(
        "inline-flex min-h-9 items-center gap-2 rounded-2xl border px-3 py-1.5 text-sm font-black transition",
        checked ? "border-primary/40 bg-white text-foreground shadow-sm shadow-primary/10" : "border-white/70 bg-white/45 text-muted-foreground hover:bg-white/80",
        className,
      )}
    >
      <span className={cn("grid h-5 w-5 place-items-center rounded-full transition", checked ? "bg-primary text-white" : "bg-sky-100 ring-1 ring-inset ring-primary/20")}>
        {checked && <Check className="h-3.5 w-3.5 stroke-[3]" />}
      </span>
      {label}
    </button>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label className="block text-base font-bold">{label}<input className="mt-1 w-full rounded-2xl border border-white/80 bg-card/80 px-5 py-4 outline-none transition focus:ring-4 focus:ring-primary/15 dark:border-white/10" type={type} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const validValue = /^#[0-9A-Fa-f]{6}$/.test(value) ? value : defaultBlue;
  return (
    <div className="space-y-3 rounded-2xl border border-white/80 bg-white/55 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-black">{label}</p>
          <p className="text-xs font-bold text-muted-foreground">{validValue.toUpperCase()}</p>
        </div>
        <span className="h-10 w-10 shrink-0 rounded-2xl border border-white/80 shadow-inner" style={{ backgroundColor: validValue }} />
      </div>
      <div className="flex flex-wrap gap-2">
        {palette.map((color) => (
          <button
            key={color}
            type="button"
            aria-label={`${color} 선택`}
            className={cn("h-9 w-9 rounded-full border-2 shadow-sm transition hover:scale-105", validValue === color ? "border-foreground" : "border-white/80")}
            style={{ backgroundColor: color }}
            onClick={() => onChange(color)}
          />
        ))}
      </div>
      <input
        className="w-full rounded-2xl border border-white/80 bg-card/75 px-4 py-3 text-sm font-black uppercase outline-none transition focus:ring-4 focus:ring-primary/15 dark:border-white/10"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="#7BC7F2"
      />
    </div>
  );
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block text-base font-bold">{label}<textarea className="mt-1 min-h-32 w-full rounded-2xl border border-white/80 bg-card/80 px-5 py-4 outline-none transition focus:ring-4 focus:ring-primary/15 dark:border-white/10" value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[][] }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedLabel = options.find(([optionValue]) => optionValue === value)?.[1] ?? "없음";

  useEffect(() => {
    function close(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div ref={rootRef} className="relative block text-base font-bold">
      <p>{label}</p>
      <button
        type="button"
        className={cn(
          "mt-1 flex w-full items-center justify-between gap-3 rounded-2xl border border-white/80 bg-card/80 px-5 py-4 text-left outline-none transition dark:border-white/10",
          open ? "ring-4 ring-primary/15" : "hover:bg-white/90 dark:hover:bg-white/10",
        )}
        onClick={() => setOpen((next) => !next)}
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronRight className={cn("h-5 w-5 text-muted-foreground transition", open ? "rotate-90" : "rotate-0")} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-white/80 bg-white/95 p-2 shadow-[0_18px_48px_rgba(86,144,183,0.18)] backdrop-blur dark:border-white/10 dark:bg-card/95">
          {options.length === 0 ? (
            <div className="rounded-xl px-4 py-3 text-sm text-muted-foreground">없음</div>
          ) : (
            options.map(([optionValue, labelText]) => {
              const selected = optionValue === value;
              return (
                <button
                  key={optionValue}
                  type="button"
                  className={cn("flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-black transition", selected ? "bg-primary/18 text-foreground" : "hover:bg-muted/70")}
                  onClick={() => {
                    onChange(optionValue);
                    setOpen(false);
                  }}
                >
                  <span>{labelText}</span>
                  {selected && <Check className="h-4 w-4 text-primary" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function Panel({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return <section className={cn("rounded-[1.75rem] border border-white/70 bg-white/84 p-6 shadow-[0_18px_60px_rgba(86,144,183,0.10)] backdrop-blur dark:border-white/10 dark:bg-card/82", className)}><h3 className="mb-5 text-xl font-black">{title}</h3>{children}</section>;
}

function TwoColumn({ children }: { children: React.ReactNode }) {
  return <section className="grid gap-5 xl:grid-cols-[380px_1fr]">{children}</section>;
}

function DataList({ title, items }: { title: string; items: Array<{ id: string; title: string; meta: string }> }) {
  return <Panel title={title}><div className="grid gap-2">{items.length === 0 && <p className="text-sm text-muted-foreground">표시할 항목이 없습니다.</p>}{items.map((item) => <div key={item.id} className="rounded-[1.1rem] border border-white/80 bg-card/68 p-4 dark:border-white/10"><p className="font-black">{item.title}</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{item.meta}</p></div>)}</div></Panel>;
}

function PrimaryButton({ children, onClick, disabled, icon, className }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; icon?: React.ReactNode; className?: string }) {
  return <button className={cn("flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-4 text-lg font-bold text-primary-foreground shadow-lg shadow-primary/20 disabled:opacity-50", className)} onClick={onClick} disabled={disabled}>{icon}{children}</button>;
}

function IconButton({ children, label, onClick }: { children: React.ReactNode; label: string; onClick: () => void }) {
  return <button className="rounded-2xl bg-muted/70 p-3" onClick={onClick} aria-label={label}>{children}</button>;
}

function segmentClass(active: boolean) {
  return cn("rounded-[1rem] px-3 py-3 text-sm font-black transition", active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground");
}

function UsersPanelV2({ data, currentUser, persist }: { data: AppData; currentUser: ClubUser; persist: (data: AppData) => void }) {
  const [form, setForm] = useState({ name: "", username: "", password: "", teamId: data.teams[0]?.id ?? "", role: "USER" as Role });
  const [teamName, setTeamName] = useState("");
  const [selectedYear, setSelectedYear] = useState<2025 | 2026>(2026);
  const [selectedUserId, setSelectedUserId] = useState(data.users[0]?.id ?? "");
  const [showAllMembers, setShowAllMembers] = useState(false);
  const usersByYear = data.users.filter((user) => (user.activeYears ?? [2026]).includes(selectedYear));
  const selectedUser = usersByYear.find((user) => user.id === selectedUserId) ?? usersByYear[0] ?? null;
  const selectedUserIndex = usersByYear.findIndex((user) => user.id === selectedUserId);
  const shouldExpandMembers = showAllMembers || selectedUserIndex >= 5;
  const visibleUsers = shouldExpandMembers ? usersByYear : usersByYear.slice(0, 5);
  const allowed = canManageUsers(currentUser.role);

  function addTeam() {
    if (!teamName.trim() || !canManageTeams(currentUser.role)) return;
    const createdAt = nowIso();
    const team: Team = { id: uid("team"), name: teamName, color: fixedTeamColors[teamName] ?? palette[data.teams.length % palette.length], order: data.teams.length + 1, isActive: true, createdAt, updatedAt: createdAt };
    persist({ ...data, teams: [...data.teams, team], auditLogs: [...data.auditLogs, createAudit(currentUser, "CREATE_TEAM", "teams", team.id, team)] });
    setTeamName("");
  }

  function deleteTeam(teamId: string) {
    const teamHasUsers = data.users.some((user) => user.teamId === teamId);
    const teamHasSongs = data.songs.some((song) => song.teamId === teamId);
    if (teamHasUsers || teamHasSongs) return;
    persist({ ...data, teams: data.teams.filter((team) => team.id !== teamId), auditLogs: [...data.auditLogs, createAudit(currentUser, "DELETE_TEAM", "teams", teamId)] });
  }

  function createUser() {
    if (!allowed || !form.name || !form.username || !form.password) return;
    const team = data.teams.find((item) => item.id === form.teamId);
    const createdAt = nowIso();
    const user: ClubUser = {
      id: uid("user"),
      ...form,
      teamId: form.teamId || null,
      teamColor: team?.color ?? defaultBlue,
      performanceColors: {},
      activeYears: [2026],
      mustChangePassword: true,
      status: "ACTIVE",
      createdAt,
      updatedAt: createdAt,
    };
    persist({ ...data, users: [...data.users, user], auditLogs: [...data.auditLogs, createAudit(currentUser, "CREATE_USER", "users", user.id, user)] });
    setForm({ name: "", username: "", password: "", teamId: data.teams[0]?.id ?? "", role: "USER" });
    setSelectedUserId(user.id);
    if (data.users.length >= 5) setShowAllMembers(true);
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[380px_1fr]">
      <div className="space-y-5">
        <Panel title="소속 팀 만들기">
          <Field label="팀 이름" value={teamName} onChange={setTeamName} />
          <PrimaryButton className="mt-3" disabled={!canManageTeams(currentUser.role)} onClick={addTeam}>생성</PrimaryButton>
          <div className="mt-4 space-y-2">
            {data.teams.map((team) => {
              const canDelete = !data.users.some((user) => user.teamId === team.id) && !data.songs.some((song) => song.teamId === team.id);
              return (
                <div key={team.id} className="flex items-center justify-between rounded-2xl px-3 py-2 text-sm font-bold" style={{ backgroundColor: alpha(teamColor(team), "3D") }}>
                  <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: teamColor(team) }} />{team.name}</span>
                  <button className="text-xs text-muted-foreground disabled:opacity-40" disabled={!canDelete} onClick={() => deleteTeam(team.id)}>삭제</button>
                </div>
              );
            })}
          </div>
        </Panel>
        <Panel title="멤버 생성">
          <div className="space-y-3">
            <Field label="이름" value={form.name} onChange={(value) => setForm({ ...form, name: value })} />
            <Field label="아이디" value={form.username} onChange={(value) => setForm({ ...form, username: value })} />
            <Field label="초기 비밀번호" type="password" value={form.password} onChange={(value) => setForm({ ...form, password: value })} />
            <Select label="소속 팀" value={form.teamId} onChange={(value) => setForm({ ...form, teamId: value })} options={data.teams.map((team) => [team.id, team.name])} />
            <Select label="직책" value={form.role} onChange={(value) => setForm({ ...form, role: value as Role })} options={roleOptions.map((role) => [role, roleLabel(role)])} />
            <PrimaryButton onClick={createUser} disabled={!allowed} icon={<Plus size={17} />}>생성</PrimaryButton>
          </div>
        </Panel>
      </div>
      <div className="space-y-5">
        <Panel title="멤버 목록">
          <div className="mb-4 grid grid-cols-2 gap-3">
            {[2025, 2026].map((year) => {
              const count = data.users.filter((user) => (user.activeYears ?? [2026]).includes(year)).length;
              const selected = selectedYear === year;
              return (
                <button
                  key={year}
                  type="button"
                  className={cn("rounded-2xl px-4 py-3 text-left transition", selected ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "bg-white/70 text-muted-foreground")}
                  onClick={() => {
                    setSelectedYear(year as 2025 | 2026);
                    setShowAllMembers(false);
                  }}
                >
                  <p className="text-lg font-black">{String(year).slice(2)}년</p>
                  <p className="mt-1 text-xs font-bold opacity-80">{count}명</p>
                </button>
              );
            })}
          </div>
          <div className="grid gap-3">
            {visibleUsers.map((user) => {
              const team = data.teams.find((item) => item.id === user.teamId);
              const color = teamColor(team);
              const selected = selectedUserId === user.id;
              return (
                <button
                  key={user.id}
                  className={cn("relative overflow-hidden rounded-[1.1rem] border p-4 pl-5 text-left transition hover:-translate-y-0.5", selected ? "shadow-sm" : "border-white/80 bg-card/68 dark:border-white/10")}
                  style={selected ? { borderColor: color, backgroundColor: alpha(color, "2E") } : undefined}
                  onClick={() => setSelectedUserId(user.id)}
                >
                  <span className="absolute inset-y-3 left-0 w-1.5 rounded-r-full" style={{ backgroundColor: color }} />
                  <p className="font-black">{user.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{user.username} · {roleLabel(user.role)} · {team?.name ?? "팀 없음"}</p>
                </button>
              );
            })}
          </div>
          {usersByYear.length > 5 && (
            <button
              type="button"
              className="mt-4 w-full rounded-2xl bg-muted/70 px-4 py-3 text-sm font-black text-muted-foreground transition hover:bg-muted"
              onClick={() => setShowAllMembers((value) => !value)}
            >
              {shouldExpandMembers ? "접기" : `더보기 ${usersByYear.length - 5}명`}
            </button>
          )}
        </Panel>
        {selectedUser && <MemberDetailPanel data={data} user={selectedUser} persist={persist} />}
      </div>
    </section>
  );
}

function MemberDetailPanel({ data, user, persist }: { data: AppData; user: ClubUser; persist: (data: AppData) => void }) {
  const [form, setForm] = useState({ name: user.name, username: user.username, password: user.password, teamId: user.teamId ?? "", role: user.role, activeYears: user.activeYears ?? [2026] });
  const joinedSongIds = data.songMembers.filter((member) => member.userId === user.id).map((member) => member.songId);
  const joinedSongs = data.songs.filter((song) => joinedSongIds.includes(song.id));

  useEffect(() => {
    setForm({ name: user.name, username: user.username, password: user.password, teamId: user.teamId ?? "", role: user.role, activeYears: user.activeYears ?? [2026] });
  }, [user]);

  function save() {
    const team = data.teams.find((item) => item.id === form.teamId);
    persist({
      ...data,
      users: data.users.map((item) =>
        item.id === user.id
          ? { ...item, ...form, activeYears: form.activeYears.length > 0 ? form.activeYears : [2026], role: form.role as Role, teamId: form.teamId || null, teamColor: item.teamColor || team?.color || defaultBlue, updatedAt: nowIso() }
          : item,
      ),
    });
  }

  function toggleActiveYear(year: number) {
    setForm((current) => ({
      ...current,
      activeYears: current.activeYears.includes(year) ? current.activeYears.filter((item) => item !== year) : [...current.activeYears, year].sort(),
    }));
  }

  return (
    <Panel title={`${user.name} 상세`}>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-3">
          <Field label="이름" value={form.name} onChange={(value) => setForm({ ...form, name: value })} />
          <Field label="아이디" value={form.username} onChange={(value) => setForm({ ...form, username: value })} />
          <Field label="비밀번호" type="password" value={form.password} onChange={(value) => setForm({ ...form, password: value })} />
          <Select label="소속 팀" value={form.teamId} onChange={(value) => setForm({ ...form, teamId: value })} options={data.teams.map((team) => [team.id, team.name])} />
          <Select label="직책" value={form.role} onChange={(value) => setForm({ ...form, role: value as Role })} options={roleOptions.map((role) => [role, roleLabel(role)])} />
          <div className="space-y-2">
            <p className="text-sm font-black">활동 연도</p>
            <div className="grid grid-cols-2 gap-2">
              {[2025, 2026].map((year) => {
                const selected = form.activeYears.includes(year);
                return (
                  <button
                    key={year}
                    type="button"
                    className={cn("rounded-2xl px-4 py-3 text-sm font-black transition", selected ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "bg-white/70 text-muted-foreground")}
                    onClick={() => toggleActiveYear(year)}
                  >
                    {String(year).slice(2)}년 활동
                  </button>
                );
              })}
            </div>
          </div>
          <PrimaryButton onClick={save}>수정 저장</PrimaryButton>
        </div>
        <DataList title="참여 중인 곡" items={joinedSongs.map((song) => ({ id: song.id, title: song.title, meta: `${data.performances.find((performance) => performance.id === song.performanceId)?.title ?? "공연 없음"} · ${data.teams.find((team) => team.id === song.teamId)?.name ?? "팀 없음"}` }))} />
      </div>
    </Panel>
  );
}

function PerformanceManagerV2({ data, currentUser, persist }: { data: AppData; currentUser: ClubUser; persist: (data: AppData) => void }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = data.performances.find((item) => item.id === selectedId) ?? null;
  const [perf, setPerf] = useState({ title: "", startsAt: `${today()}T19:00`, endsAt: `${today()}T21:00`, location: "" });

  function addPerformance() {
    if (!perf.title) return;
    const createdAt = nowIso();
    const performance: Performance = {
      id: uid("perf"),
      title: perf.title,
      color: palette[data.performances.length % palette.length],
      startsAt: new Date(perf.startsAt).toISOString(),
      endsAt: new Date(perf.endsAt).toISOString(),
      location: perf.location,
      memberIds: [],
      status: "ACTIVE",
      createdBy: currentUser.id,
      createdAt,
      updatedAt: createdAt,
    };
    const schedule: Schedule = {
      id: uid("schedule"),
      type: "PERFORMANCE",
      title: performance.title,
      startsAt: performance.startsAt,
      endsAt: performance.endsAt,
      color: performance.color,
      performanceId: performance.id,
      visibility: "PUBLIC",
      status: "CONFIRMED",
      createdBy: currentUser.id,
      createdAt,
      updatedAt: createdAt,
    };
    persist({ ...data, performances: [...data.performances, performance], schedules: [...data.schedules, schedule], auditLogs: [...data.auditLogs, createAudit(currentUser, "CREATE_PERFORMANCE", "performances", performance.id, performance)] });
    setPerf({ title: "", startsAt: `${today()}T19:00`, endsAt: `${today()}T21:00`, location: "" });
  }

  return (
    <section className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <Panel title="공연 만들기">
          <div className="space-y-3">
            <Field label="공연명" value={perf.title} onChange={(value) => setPerf({ ...perf, title: value })} />
            <Field label="시작" type="datetime-local" value={perf.startsAt} onChange={(value) => setPerf({ ...perf, startsAt: value })} />
            <Field label="종료" type="datetime-local" value={perf.endsAt} onChange={(value) => setPerf({ ...perf, endsAt: value })} />
            <Field label="장소" value={perf.location} onChange={(value) => setPerf({ ...perf, location: value })} />
            <PrimaryButton onClick={addPerformance}>생성</PrimaryButton>
          </div>
        </Panel>
        <Panel title="공연 목록">
          <div className="grid gap-3 md:grid-cols-2">
            {data.performances.map((performance) => (
              <button key={performance.id} className={cn("rounded-[1.2rem] border p-4 text-left transition hover:-translate-y-0.5", selected?.id === performance.id ? "border-primary bg-primary/10" : "border-white/80 bg-card/70 dark:border-white/10")} onClick={() => setSelectedId(selected?.id === performance.id ? null : performance.id)}>
                <span className="mb-3 block h-2 w-12 rounded-full" style={{ backgroundColor: performance.color }} />
                <p className="font-black">{performance.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{formatDateTime(performance.startsAt)} · {performance.location || "장소 미정"}</p>
              </button>
            ))}
          </div>
        </Panel>
      </div>
      {selected && <PerformanceDetailV2 data={data} currentUser={currentUser} performance={selected} persist={persist} />}
    </section>
  );
}

function PerformanceDetailV2({ data, currentUser, performance, persist }: { data: AppData; currentUser: ClubUser; performance: Performance; persist: (data: AppData) => void }) {
  const performanceMemberIds = performance.memberIds ?? [];
  const performanceMembers = data.users.filter((user) => performanceMemberIds.includes(user.id));
  const songs = data.songs.filter((song) => song.performanceId === performance.id);
  const [description, setDescription] = useState(performance.description ?? "");
  const [noticeText, setNoticeText] = useState("");
  const [songTitle, setSongTitle] = useState("");
  const [songTeamId, setSongTeamId] = useState(data.teams[0]?.id ?? "");
  const [songMemberIds, setSongMemberIds] = useState<string[]>([]);
  const [leaderIds, setLeaderIds] = useState<string[]>([]);
  const [editingSongId, setEditingSongId] = useState<string | null>(null);
  const [editSongForm, setEditSongForm] = useState({ title: "", teamId: "", memberIds: [] as string[], leaderUserId: "" });
  const [editingMembers, setEditingMembers] = useState(false);
  const [draftMemberIds, setDraftMemberIds] = useState<string[]>(performanceMemberIds);
  const [performanceMemberSearch, setPerformanceMemberSearch] = useState("");
  const [songMemberTeamFilter, setSongMemberTeamFilter] = useState("all");
  const [songMemberSearch, setSongMemberSearch] = useState("");
  const filteredPerformanceUsers = useMemo(() => {
    const keyword = performanceMemberSearch.trim().toLowerCase();
    if (!keyword) return data.users;
    return data.users.filter((user) => {
      const team = data.teams.find((item) => item.id === user.teamId);
      return user.name.toLowerCase().includes(keyword) || user.username.toLowerCase().includes(keyword) || (team?.name ?? "").toLowerCase().includes(keyword);
    });
  }, [data.teams, data.users, performanceMemberSearch]);
  const filteredSongMembers = useMemo(() => {
    const keyword = songMemberSearch.trim().toLowerCase();
    return performanceMembers.filter((user) => {
      const team = data.teams.find((item) => item.id === user.teamId);
      const matchesTeam = songMemberTeamFilter === "all" || user.teamId === songMemberTeamFilter;
      const matchesSearch = !keyword || user.name.toLowerCase().includes(keyword) || user.username.toLowerCase().includes(keyword) || (team?.name ?? "").toLowerCase().includes(keyword);
      return matchesTeam && matchesSearch;
    });
  }, [data.teams, performanceMembers, songMemberSearch, songMemberTeamFilter]);

  useEffect(() => {
    setDescription(performance.description ?? "");
    setDraftMemberIds(performance.memberIds ?? []);
    setEditingMembers(false);
    setPerformanceMemberSearch("");
  }, [performance]);

  function updatePerformance(partial: Partial<Performance>) {
    persist({ ...data, performances: data.performances.map((item) => (item.id === performance.id ? { ...item, ...partial, updatedAt: nowIso() } : item)) });
  }

  function togglePerformanceMember(userId: string) {
    setDraftMemberIds((prev) => prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]);
  }

  function savePerformanceMembers() {
    updatePerformance({ memberIds: draftMemberIds });
    setEditingMembers(false);
  }

  function addPerformanceNotice() {
    if (!noticeText.trim()) return;
    const createdAt = nowIso();
    const notice: Notice = { id: uid("notice"), type: "PERFORMANCE", title: `${performance.title} 공지`, content: noticeText, targetPerformanceId: performance.id, pinned: false, createdBy: currentUser.id, createdAt, updatedAt: createdAt };
    persist({ ...data, notices: [...data.notices, notice], auditLogs: [...data.auditLogs, createAudit(currentUser, "CREATE_NOTICE", "notices", notice.id, notice)] });
    setNoticeText("");
  }

  function addSong() {
    if (!songTitle.trim() || songMemberIds.length === 0) return;
    const createdAt = nowIso();
    const leaderUserId = leaderIds[0] ?? songMemberIds[0];
    const song: Song = { id: uid("song"), performanceId: performance.id, teamId: songTeamId, title: songTitle, leaderUserId, requiredPracticeCount: 0, estimatedPracticeMinutes: 120, order: data.songs.length + 1, status: "ACTIVE", createdAt, updatedAt: createdAt };
    const memberships: SongMember[] = songMemberIds.map((userId) => ({ id: uid("member"), performanceId: performance.id, songId: song.id, userId, joinedAt: createdAt }));
    persist({ ...data, songs: [...data.songs, song], songMembers: [...data.songMembers, ...memberships], auditLogs: [...data.auditLogs, createAudit(currentUser, "CREATE_SONG", "songs", song.id, song)] });
    setSongTitle("");
    setSongMemberIds([]);
    setLeaderIds([]);
  }

  function startEditSong(song: Song) {
    const memberIds = data.songMembers.filter((member) => member.songId === song.id).map((member) => member.userId);
    setEditingSongId(song.id);
    setEditSongForm({ title: song.title, teamId: song.teamId, memberIds, leaderUserId: song.leaderUserId });
  }

  function saveSongEdit(songId: string) {
    if (!editSongForm.title.trim() || editSongForm.memberIds.length === 0) return;
    const updatedAt = nowIso();
    const leaderUserId = editSongForm.memberIds.includes(editSongForm.leaderUserId) ? editSongForm.leaderUserId : editSongForm.memberIds[0];
    const nextMemberships: SongMember[] = editSongForm.memberIds.map((userId) => ({ id: uid("member"), performanceId: performance.id, songId, userId, joinedAt: updatedAt }));
    const updatedSong = data.songs.find((song) => song.id === songId);
    persist({
      ...data,
      songs: data.songs.map((song) => song.id === songId ? { ...song, title: editSongForm.title, teamId: editSongForm.teamId, leaderUserId, updatedAt } : song),
      songMembers: [...data.songMembers.filter((member) => member.songId !== songId), ...nextMemberships],
      auditLogs: updatedSong ? [...data.auditLogs, createAudit(currentUser, "UPDATE_SONG", "songs", songId, { ...updatedSong, ...editSongForm, leaderUserId })] : data.auditLogs,
    });
    setEditingSongId(null);
  }

  function deleteSong(songId: string) {
    const target = data.songs.find((song) => song.id === songId);
    if (!target) return;
    const ok = window.confirm(`${target.title} 곡을 삭제할까요? 관련 조사, 후보, 일정도 함께 삭제됩니다.`);
    if (!ok) return;
    persist({
      ...data,
      songs: data.songs.filter((song) => song.id !== songId),
      songMembers: data.songMembers.filter((member) => member.songId !== songId),
      surveys: data.surveys.filter((survey) => survey.songId !== songId),
      availabilityResponses: data.availabilityResponses.filter((response) => !data.surveys.some((survey) => survey.songId === songId && survey.id === response.surveyId)),
      ambiguousTimes: data.ambiguousTimes.filter((time) => !data.surveys.some((survey) => survey.songId === songId && survey.id === time.surveyId)),
      practiceCandidates: data.practiceCandidates.filter((candidate) => candidate.songId !== songId),
      schedules: data.schedules.filter((schedule) => schedule.songId !== songId),
      auditLogs: [...data.auditLogs, createAudit(currentUser, "DELETE_SONG", "songs", songId, target)],
    });
    if (editingSongId === songId) setEditingSongId(null);
  }

  return (
    <Panel title={`${performance.title} 상세`}>
      <div className="mb-5 rounded-[1.25rem] bg-muted/50 p-4">
        <p className="mb-2 text-sm font-black">공연 설명 / 운영 메모</p>
        <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{performance.description || "아직 저장된 설명이 없습니다. 오른쪽 상세 공지 영역에서 설명을 저장할 수 있습니다."}</p>
      </div>
      <div className="grid gap-5 xl:grid-cols-3">
        <Panel title="공연 참여 인원" className="shadow-none">
          {!editingMembers ? (
            <div className="space-y-4">
              <div className="flex min-h-24 flex-wrap content-start gap-2">
                {performanceMembers.length === 0 && <p className="text-sm text-muted-foreground">아직 지정된 참여 인원이 없습니다.</p>}
                {performanceMembers.map((user) => <UserPill key={user.id} user={user} data={data} />)}
              </div>
              <PrimaryButton onClick={() => { setDraftMemberIds(performanceMemberIds); setEditingMembers(true); }}>지정하기</PrimaryButton>
            </div>
          ) : (
            <div className="space-y-4">
              <input
                className="w-full rounded-2xl border border-white/80 bg-white/70 px-4 py-3 text-sm font-bold outline-none transition placeholder:text-muted-foreground/70 focus:ring-4 focus:ring-primary/15"
                value={performanceMemberSearch}
                onChange={(event) => setPerformanceMemberSearch(event.target.value)}
                placeholder="이름, 아이디, 팀으로 검색"
              />
              <div className="grid max-h-80 gap-2 overflow-auto">
                {filteredPerformanceUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between gap-3 rounded-2xl px-3 py-2 text-sm font-semibold" style={{ backgroundColor: alpha(teamColor(data.teams.find((team) => team.id === user.teamId)), "2E") }}>
                    <UserPill user={user} data={data} />
                    <SoftCheckbox checked={draftMemberIds.includes(user.id)} label="선택" onToggle={() => togglePerformanceMember(user.id)} />
                  </div>
                ))}
                {filteredPerformanceUsers.length === 0 && <p className="rounded-2xl bg-white/50 p-4 text-sm font-bold text-muted-foreground">검색 결과가 없습니다.</p>}
              </div>
              <PrimaryButton onClick={savePerformanceMembers}>저장하기</PrimaryButton>
              <button className="w-full rounded-2xl bg-muted/70 px-4 py-3 text-sm font-bold" onClick={() => setEditingMembers(false)}>닫기</button>
            </div>
          )}
        </Panel>
        <Panel title="공연 곡 생성" className="shadow-none">
          <div className="space-y-3">
            <Select label="소속 팀" value={songTeamId} onChange={setSongTeamId} options={data.teams.map((team) => [team.id, team.name])} />
            <Field label="곡 / 무대 이름" value={songTitle} onChange={setSongTitle} />
            <div className="rounded-2xl bg-muted/50 p-3">
              <p className="mb-3 text-sm font-black">곡 참여 인원 / 팀장</p>
              <input
                className="mb-3 w-full rounded-2xl border border-white/80 bg-white/70 px-4 py-3 text-sm font-bold outline-none transition placeholder:text-muted-foreground/70 focus:ring-4 focus:ring-primary/15"
                value={songMemberSearch}
                onChange={(event) => setSongMemberSearch(event.target.value)}
                placeholder="이름이나 아이디로 검색"
              />
              <div className="mb-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className={cn("rounded-full px-3 py-2 text-xs font-black transition", songMemberTeamFilter === "all" ? "bg-primary text-white shadow-sm" : "bg-white/65 text-muted-foreground")}
                  onClick={() => setSongMemberTeamFilter("all")}
                >
                  전체
                </button>
                {data.teams.map((team) => (
                  <button
                    type="button"
                    key={team.id}
                    className={cn("rounded-full px-3 py-2 text-xs font-black transition", songMemberTeamFilter === team.id ? "text-white shadow-sm" : "text-foreground")}
                    style={{ backgroundColor: songMemberTeamFilter === team.id ? teamColor(team) : alpha(teamColor(team), "35") }}
                    onClick={() => setSongMemberTeamFilter(team.id)}
                  >
                    {team.name}팀만 보기
                  </button>
                ))}
              </div>
              <div className="grid max-h-44 gap-2 overflow-auto">
                {filteredSongMembers.map((user) => (
                  <div key={user.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-2xl bg-white/45 p-2 text-sm">
                    <UserPill user={user} data={data} />
                    <SoftCheckbox checked={songMemberIds.includes(user.id)} label="참여" onToggle={() => setSongMemberIds((prev) => prev.includes(user.id) ? prev.filter((id) => id !== user.id) : [...prev, user.id])} />
                    <SoftCheckbox checked={leaderIds.includes(user.id)} label="팀장" onToggle={() => setLeaderIds((prev) => prev.includes(user.id) ? prev.filter((id) => id !== user.id) : [...prev, user.id])} />
                  </div>
                ))}
                {filteredSongMembers.length === 0 && <p className="rounded-2xl bg-white/50 p-4 text-sm font-bold text-muted-foreground">조건에 맞는 참여 인원이 없습니다.</p>}
              </div>
            </div>
            <PrimaryButton onClick={addSong}>곡 생성</PrimaryButton>
          </div>
        </Panel>
        <Panel title="공연 상세 공지" className="shadow-none">
          <div className="space-y-3">
            <TextArea label="공연 설명 / 운영 메모" value={description} onChange={setDescription} />
            <PrimaryButton onClick={() => updatePerformance({ description })}>설명 저장</PrimaryButton>
            <TextArea label="참여 인원에게 보이는 공지" value={noticeText} onChange={setNoticeText} />
            <PrimaryButton onClick={addPerformanceNotice}>공지 추가</PrimaryButton>
          </div>
        </Panel>
      </div>
      <Panel title="생성된 공연 곡" className="mt-5 shadow-none">
        <div className="grid gap-3">
          {songs.map((song) => {
            const team = data.teams.find((item) => item.id === song.teamId);
            const members = data.songMembers.filter((member) => member.songId === song.id).map((member) => data.users.find((user) => user.id === member.userId)).filter(Boolean) as ClubUser[];
            const editing = editingSongId === song.id;
            return (
              <div key={song.id} className="rounded-3xl border p-4" style={{ borderColor: teamColor(team), backgroundColor: alpha(teamColor(team), "22") }}>
                {!editing ? (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-black">{song.title}</p>
                        <p className="text-sm text-muted-foreground">{team?.name ?? "팀 없음"} · 팀장 {data.users.find((user) => user.id === song.leaderUserId)?.name ?? "미지정"}</p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button type="button" className="rounded-full bg-white/70 px-3 py-2 text-xs font-black shadow-sm" onClick={() => startEditSong(song)}>수정</button>
                        <button type="button" className="rounded-full bg-destructive/10 px-3 py-2 text-xs font-black text-destructive" onClick={() => deleteSong(song.id)}>삭제</button>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {members.map((user) => <UserPill key={user.id} user={user} data={data} />)}
                    </div>
                  </>
                ) : (
                  <div className="space-y-3">
                    <Field label="곡 / 무대 이름" value={editSongForm.title} onChange={(value) => setEditSongForm({ ...editSongForm, title: value })} />
                    <Select label="소속 팀" value={editSongForm.teamId} onChange={(value) => setEditSongForm({ ...editSongForm, teamId: value })} options={data.teams.map((item) => [item.id, item.name])} />
                    <div className="rounded-2xl bg-white/45 p-3">
                      <p className="mb-2 text-sm font-black">곡 참여 인원 / 팀장</p>
                      <div className="grid max-h-56 gap-2 overflow-auto">
                        {performanceMembers.map((user) => (
                          <div key={user.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-2xl bg-white/50 p-2 text-sm">
                            <UserPill user={user} data={data} />
                            <SoftCheckbox
                              checked={editSongForm.memberIds.includes(user.id)}
                              label="참여"
                              onToggle={() => setEditSongForm((prev) => {
                                const memberIds = prev.memberIds.includes(user.id) ? prev.memberIds.filter((id) => id !== user.id) : [...prev.memberIds, user.id];
                                return { ...prev, memberIds, leaderUserId: memberIds.includes(prev.leaderUserId) ? prev.leaderUserId : memberIds[0] ?? "" };
                              })}
                            />
                            <SoftCheckbox
                              checked={editSongForm.leaderUserId === user.id}
                              label="팀장"
                              onToggle={() => setEditSongForm((prev) => ({ ...prev, leaderUserId: user.id, memberIds: prev.memberIds.includes(user.id) ? prev.memberIds : [...prev.memberIds, user.id] }))}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <PrimaryButton onClick={() => saveSongEdit(song.id)}>수정 저장</PrimaryButton>
                      <button type="button" className="rounded-2xl bg-white/70 px-4 py-3 text-sm font-black" onClick={() => setEditingSongId(null)}>취소</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Panel>
    </Panel>
  );
}
