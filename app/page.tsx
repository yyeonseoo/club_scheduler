"use client";

import { useEffect, useMemo, useState } from "react";
import {
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

const roleOptions: Role[] = ["SUPER_ADMIN", "VICE_ADMIN", "TEAM_ADMIN", "USER"];
const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const defaultBlue = "#7BC7F2";
const fixedTeamColors: Record<string, string> = {
  "춤": "#7BC7F2",
  "랩": "#B8C8F8",
  "기획": "#F9C6D0",
};
const palette = ["#7BC7F2", "#B8C8F8", "#F9C6D0", "#A8DADC", "#F8DFA8", "#C9E4CA", "#D7C0F7"];

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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "short" }).format(new Date(value));
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
  const [username, setUsername] = useState(mode === "admin" ? "admin" : "member");
  const [password, setPassword] = useState(mode === "admin" ? "admin1234" : "member1234");
  const [error, setError] = useState<string | null>(null);

  function switchMode(next: Portal) {
    setMode(next);
    setUsername(next === "admin" ? "admin" : "member");
    setPassword(next === "admin" ? "admin1234" : "member1234");
    setError(null);
  }

  return (
    <main className="soft-shell min-h-screen p-6 sm:p-10">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-[1500px] gap-14 lg:grid-cols-[minmax(0,1fr)_520px] lg:items-center">
        <section className="space-y-6">
          <button className="rounded-full border border-white/70 bg-white/75 p-3 shadow-sm backdrop-blur dark:bg-card/70" onClick={toggleTheme} aria-label="테마 변경">
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/75 px-4 py-2 text-sm font-semibold text-primary shadow-sm backdrop-blur dark:bg-card/70">
            <Sparkles size={16} />
            Club schedule manager
          </span>
          <h1 className="text-6xl font-black leading-tight sm:text-8xl">
            동아리 일정,
            <br />
            가볍게 정리.
          </h1>
          <p className="max-w-2xl text-xl leading-9 text-muted-foreground">공연, 팀 연습, 개인 일정을 한 캘린더에서 확인하고 관리하는 범용 동아리 일정 서비스입니다.</p>
        </section>

        <form
          className="rounded-[2rem] border border-white/70 bg-white/82 p-7 shadow-[0_24px_80px_rgba(86,144,183,0.14)] backdrop-blur dark:border-white/10 dark:bg-card/78"
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
          <div className="mt-5 rounded-2xl bg-muted/70 p-4 text-sm text-muted-foreground">샘플 계정: admin/admin1234, leader/leader1234, member/member1234</div>
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
  const [personalTitle, setPersonalTitle] = useState("");
  const [personalStart, setPersonalStart] = useState("18:00");
  const [personalEnd, setPersonalEnd] = useState("19:00");
  const visibleSchedules = useMemo(() => getVisibleSchedules(data, currentUser, adminMode), [adminMode, currentUser, data]);
  const monthDays = calendarDays(month);
  const selectedEvents = visibleSchedules.filter((schedule) => schedule.startsAt.slice(0, 10) === selectedDate);
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
            {selectedEvents.map((schedule) => <ScheduleRow key={schedule.id} schedule={schedule} data={data} currentUser={currentUser} />)}
          </div>
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
  const grouped = data.performances.map((performance) => ({ performance, songs: data.songs.filter((song) => song.performanceId === performance.id) })).filter((group) => group.songs.length > 0);
  const selectedSong = data.songs.find((song) => song.id === selectedSongId) ?? null;
  const selectedRequests = pending.filter((candidate) => candidate.songId === selectedSongId);
  const conflictGroups = findConflicts(pending);

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
        <Panel title={selectedSong ? `${selectedSong.title} 요청` : "곡을 선택하세요"}>
          <div className="space-y-3">
            {selectedRequests.length === 0 && <p className="text-sm text-muted-foreground">승인 대기 중인 연습 일정이 없습니다.</p>}
            {selectedRequests.map((request) => (
              <div key={request.id} className="rounded-[1.1rem] bg-muted/55 p-3">
                <p className="font-black">{request.title || "연습 요청"}</p>
                <p className="text-sm text-muted-foreground">{formatDateTime(request.startsAt)} - {formatDateTime(request.endsAt)}</p>
                {request.memo && <p className="mt-1 text-sm">{request.memo}</p>}
                <PrimaryButton className="mt-3" onClick={() => approveRequest(request)}><Check size={16} />확정</PrimaryButton>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="충돌 정리">
          <div className="space-y-3">
            {conflictGroups.length === 0 && <p className="text-sm text-muted-foreground">겹치는 대기 요청이 없습니다.</p>}
            {conflictGroups.map((group, index) => (
              <div key={index} className="rounded-[1.1rem] bg-muted/55 p-3 text-sm">
                <p className="font-black">추천: 먼저 온 요청 1개만 확정</p>
                {group.map((item) => <p key={item.id} className="text-muted-foreground">{data.songs.find((song) => song.id === item.songId)?.title} · {formatDateTime(item.startsAt)}</p>)}
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
  const [form, setForm] = useState({ songId: leaderSongs[0]?.id ?? "", startDate: today(), endDate: today(), timeStart: "18:00", timeEnd: "22:00" });
  const [request, setRequest] = useState({ songId: leaderSongs[0]?.id ?? "", title: "연습 일정", startsAt: `${today()}T19:00`, endsAt: `${today()}T21:00`, memo: "" });
  const [response, setResponse] = useState({ surveyId: openSurveys[0]?.id ?? "", available: true, date: today(), start: "18:00", end: "19:00", memo: "" });

  function addSurvey() {
    const song = data.songs.find((item) => item.id === form.songId);
    if (!song || song.leaderUserId !== currentUser.id) return;
    const createdAt = nowIso();
    const survey: ScheduleSurvey = { id: uid("survey"), performanceId: song.performanceId, songId: song.id, createdBy: currentUser.id, title: `${song.title} 일정 조사`, startDate: form.startDate, endDate: form.endDate, timeStart: form.timeStart, timeEnd: form.timeEnd, slotMinutes: 30, status: "OPEN", createdAt, updatedAt: createdAt };
    persist({ ...data, surveys: [...data.surveys, survey] });
    setResponse({ ...response, surveyId: survey.id });
  }

  function submitPracticeRequest() {
    const song = data.songs.find((item) => item.id === request.songId);
    if (!song || song.leaderUserId !== currentUser.id) return;
    const createdAt = nowIso();
    const members = data.songMembers.filter((member) => member.songId === song.id);
    const candidate: PracticeCandidate = { id: uid("candidate"), performanceId: song.performanceId, songId: song.id, proposedBy: currentUser.id, title: request.title, startsAt: new Date(request.startsAt).toISOString(), endsAt: new Date(request.endsAt).toISOString(), availableMemberCount: members.length, totalMemberCount: members.length, memo: request.memo, status: "PENDING", createdAt, updatedAt: createdAt };
    persist({ ...data, practiceCandidates: [...data.practiceCandidates, candidate] });
    setRequest({ ...request, memo: "" });
  }

  function submitResponse() {
    if (!response.surveyId) return;
    const submittedAt = nowIso();
    const availability: AvailabilityResponse = { id: uid("availability"), surveyId: response.surveyId, userId: currentUser.id, slots: [{ date: response.date, time: response.start, available: response.available }], submittedAt, updatedAt: submittedAt };
    const ambiguous: AmbiguousTime | null = response.memo.trim() ? { id: uid("ambiguous"), surveyId: response.surveyId, userId: currentUser.id, date: response.date, timeStart: response.start, timeEnd: response.end, memo: response.memo, createdAt: submittedAt } : null;
    persist({ ...data, availabilityResponses: [...data.availabilityResponses.filter((item) => !(item.surveyId === response.surveyId && item.userId === currentUser.id)), availability], ambiguousTimes: ambiguous ? [...data.ambiguousTimes, ambiguous] : data.ambiguousTimes });
    setResponse({ ...response, memo: "" });
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
        <Panel title="연습 일정 요청">
          {leaderSongs.length === 0 ? <p className="text-sm text-muted-foreground">팀장으로 지정된 곡이 없습니다.</p> : (
            <div className="space-y-3">
              <Select label="곡" value={request.songId} onChange={(value) => setRequest({ ...request, songId: value })} options={leaderSongs.map((song) => [song.id, song.title])} />
              <Field label="제목" value={request.title} onChange={(value) => setRequest({ ...request, title: value })} />
              <Field label="시작" type="datetime-local" value={request.startsAt} onChange={(value) => setRequest({ ...request, startsAt: value })} />
              <Field label="종료" type="datetime-local" value={request.endsAt} onChange={(value) => setRequest({ ...request, endsAt: value })} />
              <TextArea label="메모" value={request.memo} onChange={(value) => setRequest({ ...request, memo: value })} />
              <PrimaryButton onClick={submitPracticeRequest}>관리자에게 등록 요청</PrimaryButton>
            </div>
          )}
        </Panel>
      </div>
      <Panel title="조사 응답">
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-3">
            <Select label="참여 중인 조사" value={response.surveyId} onChange={(value) => setResponse({ ...response, surveyId: value })} options={openSurveys.map((survey) => [survey.id, survey.title])} />
            <label className="flex items-center gap-2 rounded-2xl bg-muted/60 px-4 py-3 text-sm font-bold"><input type="checkbox" checked={response.available} onChange={(event) => setResponse({ ...response, available: event.target.checked })} /> 이 시간에 가능</label>
            <Field label="날짜" type="date" value={response.date} onChange={(value) => setResponse({ ...response, date: value })} />
            <div className="grid grid-cols-2 gap-2">
              <Field label="시작" type="time" value={response.start} onChange={(value) => setResponse({ ...response, start: value })} />
              <Field label="종료" type="time" value={response.end} onChange={(value) => setResponse({ ...response, end: value })} />
            </div>
            <TextArea label="애매한 시간 메모" value={response.memo} onChange={(value) => setResponse({ ...response, memo: value })} />
            <PrimaryButton onClick={submitResponse}>응답 저장</PrimaryButton>
          </div>
          <DataList title="열린 조사" items={openSurveys.map((survey) => ({ id: survey.id, title: survey.title, meta: `${survey.startDate} - ${survey.endDate} · ${survey.timeStart}~${survey.timeEnd}` }))} />
        </div>
      </Panel>
    </section>
  );
}

function MyPagePanel({ data, currentUser, persist }: { data: AppData; currentUser: ClubUser; persist: (data: AppData) => void }) {
  const [form, setForm] = useState({ username: currentUser.username, password: currentUser.password });
  const [performanceColors, setPerformanceColors] = useState<Record<string, string>>(currentUser.performanceColors ?? {});

  function save() {
    persist({ ...data, users: data.users.map((user) => user.id === currentUser.id ? { ...user, ...form, performanceColors, updatedAt: nowIso() } : user) });
  }

  return (
    <Panel title="마이페이지" className="max-w-2xl">
      <div className="space-y-4">
        <Field label="아이디" value={form.username} onChange={(value) => setForm({ ...form, username: value })} />
        <Field label="비밀번호" type="password" value={form.password} onChange={(value) => setForm({ ...form, password: value })} />
        <div className="space-y-3 rounded-2xl bg-muted/50 p-4">
          <p className="text-sm font-black">공연별 곡 색상</p>
          {data.performances.map((performance) => (
            <ColorField key={performance.id} label={performance.title} value={performanceColors[performance.id] ?? defaultBlue} onChange={(value) => setPerformanceColors({ ...performanceColors, [performance.id]: value })} />
          ))}
        </div>
        <PrimaryButton onClick={save}>저장</PrimaryButton>
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

function eventColor(schedule: Schedule, data: AppData, currentUser: ClubUser) {
  if (schedule.type === "PERSONAL") return "#AAB2BD";
  if (schedule.performanceId) {
    const performance = data.performances.find((item) => item.id === schedule.performanceId);
    if (performance) return performanceColor(performance, currentUser);
  }
  return schedule.color ?? defaultBlue;
}

function findConflicts(candidates: PracticeCandidate[]) {
  const conflicts: PracticeCandidate[][] = [];
  candidates.forEach((candidate, index) => {
    const group = candidates.filter((other, otherIndex) => otherIndex > index && candidate.startsAt < other.endsAt && other.startsAt < candidate.endsAt);
    if (group.length > 0) conflicts.push([candidate, ...group]);
  });
  return conflicts;
}

function CalendarEventPill({ schedule, data, currentUser }: { schedule: Schedule; data: AppData; currentUser: ClubUser }) {
  const color = eventColor(schedule, data, currentUser);
  return <div className="truncate rounded-md px-2 py-1 text-[11px] font-black text-foreground shadow-sm" style={{ backgroundColor: `${color}55` }}><span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} />{schedule.title}</div>;
}

function ScheduleRow({ schedule, data, currentUser }: { schedule: Schedule; data: AppData; currentUser: ClubUser }) {
  const color = eventColor(schedule, data, currentUser);
  return <div className="flex gap-3 rounded-[1.1rem] bg-muted/55 p-3"><span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} /><div className="min-w-0"><p className="truncate font-black">{schedule.title}</p><p className="text-xs leading-5 text-muted-foreground">{formatDate(schedule.startsAt)}</p></div></div>;
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
        "inline-flex min-h-10 items-center gap-2 rounded-full border px-3 py-2 text-sm font-black transition",
        checked ? "border-primary/60 bg-primary/25 text-foreground shadow-sm" : "border-white/70 bg-white/60 text-muted-foreground hover:bg-white/85",
        className,
      )}
    >
      <span className={cn("grid h-5 w-5 place-items-center rounded-full border transition", checked ? "border-primary bg-primary text-white" : "border-primary/30 bg-white/75")}>
        {checked && <Check className="h-3.5 w-3.5" />}
      </span>
      {label}
    </button>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label className="block text-base font-bold">{label}<input className="mt-1 w-full rounded-2xl border border-white/80 bg-card/80 px-5 py-4 outline-none transition focus:ring-4 focus:ring-primary/15 dark:border-white/10" type={type} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block text-base font-bold">{label}<div className="mt-1 flex items-center gap-3 rounded-2xl border border-white/80 bg-card/80 px-5 py-4 dark:border-white/10"><input type="color" value={value} onChange={(event) => onChange(event.target.value)} /><span className="text-sm text-muted-foreground">{value}</span></div></label>;
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block text-base font-bold">{label}<textarea className="mt-1 min-h-32 w-full rounded-2xl border border-white/80 bg-card/80 px-5 py-4 outline-none transition focus:ring-4 focus:ring-primary/15 dark:border-white/10" value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[][] }) {
  return <label className="block text-base font-bold">{label}<select className="mt-1 w-full rounded-2xl border border-white/80 bg-card/80 px-5 py-4 outline-none transition focus:ring-4 focus:ring-primary/15 dark:border-white/10" value={value} onChange={(event) => onChange(event.target.value)}>{options.length === 0 && <option value="">없음</option>}{options.map(([optionValue, labelText]) => <option key={optionValue} value={optionValue}>{labelText}</option>)}</select></label>;
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
  const [selectedUserId, setSelectedUserId] = useState(data.users[0]?.id ?? "");
  const selectedUser = data.users.find((user) => user.id === selectedUserId) ?? null;
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
      mustChangePassword: true,
      status: "ACTIVE",
      createdAt,
      updatedAt: createdAt,
    };
    persist({ ...data, users: [...data.users, user], auditLogs: [...data.auditLogs, createAudit(currentUser, "CREATE_USER", "users", user.id, user)] });
    setForm({ name: "", username: "", password: "", teamId: data.teams[0]?.id ?? "", role: "USER" });
    setSelectedUserId(user.id);
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
          <div className="grid gap-3">
            {data.users.map((user) => (
              <button key={user.id} className={cn("rounded-[1.1rem] border p-4 text-left", selectedUserId === user.id ? "border-primary bg-primary/10" : "border-white/80 bg-card/68 dark:border-white/10")} onClick={() => setSelectedUserId(user.id)}>
                <p className="font-black">{user.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{user.username} · {roleLabel(user.role)} · {data.teams.find((team) => team.id === user.teamId)?.name ?? "팀 없음"}</p>
              </button>
            ))}
          </div>
        </Panel>
        {selectedUser && <MemberDetailPanel data={data} user={selectedUser} persist={persist} />}
      </div>
    </section>
  );
}

function MemberDetailPanel({ data, user, persist }: { data: AppData; user: ClubUser; persist: (data: AppData) => void }) {
  const [form, setForm] = useState({ name: user.name, username: user.username, password: user.password, teamId: user.teamId ?? "", role: user.role });
  const joinedSongIds = data.songMembers.filter((member) => member.userId === user.id).map((member) => member.songId);
  const joinedSongs = data.songs.filter((song) => joinedSongIds.includes(song.id));

  useEffect(() => {
    setForm({ name: user.name, username: user.username, password: user.password, teamId: user.teamId ?? "", role: user.role });
  }, [user]);

  function save() {
    const team = data.teams.find((item) => item.id === form.teamId);
    persist({
      ...data,
      users: data.users.map((item) =>
        item.id === user.id
          ? { ...item, ...form, role: form.role as Role, teamId: form.teamId || null, teamColor: item.teamColor || team?.color || defaultBlue, updatedAt: nowIso() }
          : item,
      ),
    });
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

  useEffect(() => {
    setDescription(performance.description ?? "");
    setDraftMemberIds(performance.memberIds ?? []);
    setEditingMembers(false);
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
          {songs.map((song) => {
            const team = data.teams.find((item) => item.id === song.teamId);
            const members = data.songMembers.filter((member) => member.songId === song.id).map((member) => data.users.find((user) => user.id === member.userId)).filter(Boolean) as ClubUser[];
            return (
              <div key={song.id} className="rounded-3xl border p-4" style={{ borderColor: teamColor(team), backgroundColor: alpha(teamColor(team), "22") }}>
                <p className="text-lg font-black">{song.title}</p>
                <p className="text-sm text-muted-foreground">{team?.name ?? "팀 없음"} · 팀장 {data.users.find((user) => user.id === song.leaderUserId)?.name ?? "미지정"}</p>
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
