import type { AppData, ArchiveSong, AuditLog, ClubUser, ScheduleSurvey, Team } from "@/types/domain";
import { uid } from "@/lib/utils";

export const STORAGE_KEY = "club-scheduler-local-data-v4";
export const SESSION_KEY = "club-scheduler-session-v4";

const now = () => new Date().toISOString();
const danceTeamColor = "#7BC7F2";

const completedDanceArchive2026Rows = [
  { performanceTitle: "새로배움터", songTitle: "The Search", memberNames: ["정서현", "윤연서", "강유진", "김예원", "노영훈", "이지용", "최효우", "홍다영"] },
  { performanceTitle: "새로배움터", songTitle: "EAT THEM APPLES", memberNames: ["김보민", "강유진", "백예빈", "윤연서", "정서현", "홍다영"] },
  { performanceTitle: "새로배움터", songTitle: "WCE", memberNames: ["최효우", "김가희", "김민철", "김보민", "노영훈", "양서은", "이지용", "백원진"] },
  { performanceTitle: "오디션축하무대", songTitle: "Circle", memberNames: ["정서현", "강유진", "김나라", "김보민", "박은지"] },
  { performanceTitle: "오디션축하무대", songTitle: "Throw a fit", memberNames: ["안현서", "김가영(미컴)", "박은지", "정서현", "홍서연", "김가영(산심)"] },
  { performanceTitle: "동아리박람회", songTitle: "Diet Pepsi", memberNames: ["강유진", "김보민"] },
  { performanceTitle: "동아리박람회", songTitle: "Extra L (창작)", memberNames: ["김보민", "남지원", "유리아", "정서현", "최희원"] },
  { performanceTitle: "동아리박람회", songTitle: "fashion", memberNames: ["백원진", "정서현", "최효우"] },
  { performanceTitle: "동아리박람회", songTitle: "Luther", memberNames: ["정서현", "노영훈"] },
  { performanceTitle: "동아리박람회", songTitle: "with the IE", memberNames: ["노영훈", "이지용"] },
  { performanceTitle: "동아리박람회", songTitle: "worst behaviour explicit", memberNames: ["김가영(미컴)", "윤연서"] },
  { performanceTitle: "축제", songTitle: "Bounce + say I", memberNames: ["김예원", "강유진", "김나라", "박은지", "백예빈", "정서현", "홍다영"] },
  { performanceTitle: "축제", songTitle: "난 알아요", memberNames: ["최효우", "강유진", "김가희", "김기주", "김세은", "김예원", "백원진", "정서현", "송인애", "이지용", "장혜린", "홍다영", "유리아"] },
  { performanceTitle: "축제", songTitle: "FEIN (창작)", memberNames: ["김예림", "김가영(산심)", "김민철", "김보민", "백원진", "최희원"] },
  { performanceTitle: "축제", songTitle: "입춘", memberNames: ["윤연서", "김가영(미컴)", "김민주", "김예닮", "양서은", "유소연", "정서현", "최효우", "홍다영"] },
  { performanceTitle: "축제", songTitle: "BUU", memberNames: ["노영훈", "안현서", "김가영(미컴)", "박준수", "백원진"] },
  { performanceTitle: "축제", songTitle: "협업 (창작)", memberNames: ["김가영(산심)", "안현서", "김세은", "노영훈", "박은지", "백예빈", "이지용", "홍다영"] },
] as const;

export function createSeedData(): AppData {
  const createdAt = now();
  const teams: Team[] = [
    { id: "team_dance", name: "춤", color: "#7BC7F2", order: 1, isActive: true, createdAt, updatedAt: createdAt },
    { id: "team_rap", name: "랩", color: "#B8C8F8", order: 2, isActive: true, createdAt, updatedAt: createdAt },
    { id: "team_plan", name: "기획", color: "#8BDDD6", order: 3, isActive: true, createdAt, updatedAt: createdAt },
  ];

  const users: ClubUser[] = [
    {
      id: "user_admin",
      username: "admin",
      password: "admin1234",
      name: "관리자",
      teamId: "team_plan",
      teamColor: "#8BDDD6",
      performanceColors: {},
      activeYears: [2026],
      role: "SUPER_ADMIN",
      mustChangePassword: false,
      status: "ACTIVE",
      createdAt,
      updatedAt: createdAt,
    },
  ];

  return {
    teams,
    users,
    performances: [],
    songs: [],
    songMembers: [],
    archiveSongs: [],
    schedules: [],
    surveys: [],
    availabilityResponses: [],
    ambiguousTimes: [],
    practiceCandidates: [],
    notices: [],
    auditLogs: [],
  };
}

export function readData(): AppData {
  if (typeof window === "undefined") return createSeedData();
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seed = createSeedData();
    writeData(seed);
    return seed;
  }
  const parsed = JSON.parse(raw) as AppData;
  const archive2025MemberNames = new Set(
    (parsed.archiveSongs ?? [])
      .filter((song) => song.archiveKey?.includes("2025") || song.source?.includes("2025"))
      .flatMap((song) => song.memberNames ?? []),
  );
  const activeCurrentUserIds = new Set([
    ...(parsed.songMembers ?? []).map((member) => member.userId),
    ...(parsed.performances ?? []).flatMap((performance) => performance.memberIds ?? []),
  ]);
  const normalizedData: AppData = {
    ...parsed,
    archiveSongs: parsed.archiveSongs ?? [],
    performances: parsed.performances.map((performance) => ({ ...performance, memberIds: performance.memberIds ?? [] })),
    users: parsed.users.map((user) => ({
      ...user,
      teamColor: user.teamColor ?? danceTeamColor,
      performanceColors: user.performanceColors ?? {},
      activeYears: user.activeYears ?? inferActiveYears(user, archive2025MemberNames, activeCurrentUserIds),
    })),
  };
  const migratedData = withCompletedDanceArchive2026(normalizedData);
  if (JSON.stringify(migratedData) !== JSON.stringify(normalizedData)) writeData(migratedData);
  return migratedData;
}

function inferActiveYears(user: ClubUser, archiveMemberNames: Set<string>, activeCurrentUserIds: Set<string>) {
  const years = new Set<number>();
  const appearsInArchive = archiveMemberNames.has(user.name);
  if (appearsInArchive) years.add(2025);
  if (!appearsInArchive || activeCurrentUserIds.has(user.id) || user.role !== "USER" || user.username !== user.name || user.password !== "1234") years.add(2026);
  return Array.from(years).sort();
}

function withCompletedDanceArchive2026(data: AppData): AppData {
  const createdAt = now();
  const danceTeam = data.teams.find((team) => team.name === "춤") ?? {
    id: "team_dance",
    name: "춤",
    color: danceTeamColor,
    order: data.teams.length + 1,
    isActive: true,
    createdAt,
    updatedAt: createdAt,
  };
  const hasDanceTeam = data.teams.some((team) => team.id === danceTeam.id);
  const archiveKeys = new Set(data.archiveSongs.map((song) => song.archiveKey));
  const rows = completedDanceArchive2026Rows.map((row, index) => ({
    ...row,
    archiveKey: `2026-dance-completed-${index + 1}-${row.performanceTitle}-${row.songTitle}`,
    archiveId: `archive_2026_dance_completed_${index + 1}`,
  }));
  const allNames: Set<string> = new Set(rows.flatMap((row) => row.memberNames));
  const existingUserNames = new Set(data.users.map((user) => user.name));
  const newUsers: ClubUser[] = Array.from(allNames)
    .filter((name) => !existingUserNames.has(name))
    .map((name) => ({
      id: uid("user"),
      username: name,
      password: "1234",
      name,
      teamId: danceTeam.id,
      teamColor: danceTeam.color,
      performanceColors: {},
      activeYears: [2026],
      role: "USER",
      mustChangePassword: true,
      status: "ACTIVE",
      createdAt,
      updatedAt: createdAt,
    }));
  const archiveSongs: ArchiveSong[] = rows
    .filter((row) => !archiveKeys.has(row.archiveKey))
    .map((row) => ({
      id: row.archiveId,
      archiveKey: row.archiveKey,
      performanceTitle: row.performanceTitle,
      teamId: danceTeam.id,
      songTitle: row.songTitle,
      leaderName: row.memberNames[0] ?? "",
      memberNames: [...row.memberNames],
      source: "2026 춤팀 완료 곡",
      createdAt,
      updatedAt: createdAt,
    }));
  let activeYearChanged = false;
  const usersWithActiveYears = data.users.map((user) => {
    if (!allNames.has(user.name)) return user;
    const activeYears = Array.from(new Set([...(user.activeYears ?? []), 2026])).sort();
    const currentYears = user.activeYears ?? [];
    const hasSameYears = activeYears.length === currentYears.length && activeYears.every((year) => currentYears.includes(year));
    if (hasSameYears) return user;
    activeYearChanged = true;
    return { ...user, activeYears };
  });
  if (!archiveSongs.length && !newUsers.length && hasDanceTeam && !activeYearChanged) return data;
  return {
    ...data,
    teams: hasDanceTeam ? data.teams : [...data.teams, danceTeam],
    users: [
      ...usersWithActiveYears,
      ...newUsers,
    ],
    archiveSongs: [...data.archiveSongs, ...archiveSongs],
  };
}

export function writeData(data: AppData) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function resetData() {
  const seed = createSeedData();
  writeData(seed);
  return seed;
}

export function createAudit(actor: ClubUser, action: string, targetType: string, targetId: string, after?: Record<string, unknown>): AuditLog {
  return {
    id: uid("audit"),
    actorUserId: actor.id,
    actorRole: actor.role,
    action,
    targetType,
    targetId,
    after,
    createdAt: now(),
  };
}

export function makeSurvey(input: Omit<ScheduleSurvey, "id" | "status" | "createdAt" | "updatedAt">): ScheduleSurvey {
  const createdAt = now();
  return {
    ...input,
    id: uid("survey"),
    status: "OPEN",
    createdAt,
    updatedAt: createdAt,
  };
}
