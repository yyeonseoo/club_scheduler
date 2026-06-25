import type { AppData, AuditLog, ClubUser, Notice, Performance, Schedule, ScheduleSurvey, Song, SongMember, Team } from "@/types/domain";
import { uid } from "@/lib/utils";

export const STORAGE_KEY = "club-scheduler-local-data-v3";
export const SESSION_KEY = "club-scheduler-session-v3";

const now = () => new Date().toISOString();

export function createSeedData(): AppData {
  const createdAt = now();
  const teams: Team[] = [
    { id: "team_dance", name: "춤", color: "#7BC7F2", order: 1, isActive: true, createdAt, updatedAt: createdAt },
    { id: "team_rap", name: "랩", color: "#B8C8F8", order: 2, isActive: true, createdAt, updatedAt: createdAt },
    { id: "team_plan", name: "기획", color: "#F9C6D0", order: 3, isActive: true, createdAt, updatedAt: createdAt },
  ];

  const users: ClubUser[] = [
    {
      id: "user_admin",
      username: "admin",
      password: "admin1234",
      name: "관리자",
      teamId: "team_plan",
      teamColor: "#7BC7F2",
      performanceColors: {},
      role: "SUPER_ADMIN",
      mustChangePassword: false,
      status: "ACTIVE",
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: "user_leader",
      username: "leader",
      password: "leader1234",
      name: "팀장",
      teamId: "team_dance",
      teamColor: "#7BC7F2",
      performanceColors: {},
      role: "TEAM_ADMIN",
      mustChangePassword: false,
      status: "ACTIVE",
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: "user_member",
      username: "member",
      password: "member1234",
      name: "일반회원",
      teamId: "team_dance",
      teamColor: "#7BC7F2",
      performanceColors: {},
      role: "USER",
      mustChangePassword: false,
      status: "ACTIVE",
      createdAt,
      updatedAt: createdAt,
    },
  ];

  const performance: Performance = {
    id: "perf_sample",
    title: "샘플 정기공연",
    description: "공연 상세 설명과 운영 메모를 기록하는 공간입니다.",
    color: "#7BC7F2",
    startsAt: "2026-07-25T10:00:00.000Z",
    endsAt: "2026-07-25T12:00:00.000Z",
    location: "공연장",
    memberIds: ["user_admin", "user_leader", "user_member"],
    status: "ACTIVE",
    createdBy: "user_admin",
    createdAt,
    updatedAt: createdAt,
  };

  const song: Song = {
    id: "song_sample",
    performanceId: performance.id,
    teamId: "team_dance",
    title: "Sample Stage",
    leaderUserId: "user_leader",
    requiredPracticeCount: 0,
    estimatedPracticeMinutes: 120,
    order: 1,
    status: "ACTIVE",
    createdAt,
    updatedAt: createdAt,
  };

  const songMembers: SongMember[] = [
    { id: "member_1", performanceId: performance.id, songId: song.id, userId: "user_leader", joinedAt: createdAt },
    { id: "member_2", performanceId: performance.id, songId: song.id, userId: "user_member", joinedAt: createdAt },
  ];

  const schedules: Schedule[] = [
    {
      id: "schedule_perf",
      type: "PERFORMANCE",
      title: performance.title,
      startsAt: performance.startsAt,
      endsAt: performance.endsAt,
      color: performance.color,
      performanceId: performance.id,
      visibility: "PUBLIC",
      status: "CONFIRMED",
      createdBy: "user_admin",
      createdAt,
      updatedAt: createdAt,
    },
  ];

  const notices: Notice[] = [
    {
      id: "notice_pin",
      type: "GENERAL",
      title: "로컬 MVP 안내",
      content: "현재 데이터는 브라우저에 저장됩니다. Firebase 연결 전 기능 검증용입니다.",
      pinned: true,
      createdBy: "user_admin",
      createdAt,
      updatedAt: createdAt,
    },
  ];

  return {
    teams,
    users,
    performances: [performance],
    songs: [song],
    songMembers,
    schedules,
    surveys: [],
    availabilityResponses: [],
    ambiguousTimes: [],
    practiceCandidates: [],
    notices,
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
  return {
    ...parsed,
    performances: parsed.performances.map((performance) => ({ ...performance, memberIds: performance.memberIds ?? [] })),
    users: parsed.users.map((user) => ({
      ...user,
      teamColor: user.teamColor ?? "#7BC7F2",
      performanceColors: user.performanceColors ?? {},
    })),
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
