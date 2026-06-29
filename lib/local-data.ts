import type { AppData, ArchiveSong, AuditLog, ClubUser, Performance, ScheduleSurvey, Song, SongMember, Team } from "@/types/domain";
import { uid } from "@/lib/utils";

export const STORAGE_KEY = "club-scheduler-local-data-v4";
export const SESSION_KEY = "club-scheduler-session-v4";

const now = () => new Date().toISOString();
const danceTeamColor = "#7BC7F2";
const memberAliases: Record<string, string> = {
  "리아": "유리아",
  "김예림": "김예닮",
};

type DanceArchiveRow = {
  performanceTitle: string;
  songTitle: string;
  memberNames: readonly string[];
};

type CurrentSongRow = {
  title: string;
  memberNames: readonly string[];
  durationSeconds: number;
};

const currentRap515DayRows: readonly CurrentSongRow[] = [
  { title: "Flip flap", memberNames: ["전규민", "유현성", "서민규"], durationSeconds: 161 },
  { title: "quit it", memberNames: ["정윤철", "전규민"], durationSeconds: 123 },
  { title: "drive me crazy", memberNames: ["정윤철", "고강희"], durationSeconds: 204 },
  { title: "Wake up again", memberNames: ["정윤철"], durationSeconds: 162 },
  { title: "Don't call me", memberNames: ["정윤철", "최승혜"], durationSeconds: 171 },
  { title: "chocolate attack", memberNames: ["윤성혁", "박하민"], durationSeconds: 132 },
  { title: "elastic love", memberNames: ["박하민", "박현태"], durationSeconds: 205 },
  { title: "뱅어", memberNames: ["정세훈", "문정인"], durationSeconds: 148 },
  { title: "Where u at?", memberNames: ["유현성", "서민규"], durationSeconds: 110 },
  { title: "Rap0rtrap", memberNames: ["유현성", "정윤철", "전규민"], durationSeconds: 202 },
  { title: "Bloodhound", memberNames: ["유현성", "정윤철"], durationSeconds: 166 },
  { title: "hit u up", memberNames: ["정윤철", "전규민"], durationSeconds: 225 },
];

const completedDanceArchive2025Rows: readonly DanceArchiveRow[] = [
  { performanceTitle: "515DAY", songTitle: "With the IE (way up)", memberNames: ["노영훈", "이지용"] },
  { performanceTitle: "동아리박람회", songTitle: "Luther", memberNames: ["정서현", "노영훈"] },
  { performanceTitle: "광음", songTitle: "LV Bag & Dumb", memberNames: ["안현서", "김가영(미컴)"] },
  { performanceTitle: "광음", songTitle: "Automatic remix & Flipflop & 무서워", memberNames: ["강유진", "김예원"] },
  { performanceTitle: "동아리밤", songTitle: "Talk dirty", memberNames: ["정서현", "강유진", "김예원"] },
  { performanceTitle: "광음", songTitle: "Spend it & Diet Pepsi", memberNames: ["김보민", "강유진"] },
  { performanceTitle: "광음", songTitle: "Body party & Personal", memberNames: ["남지원", "윤연서"] },
  { performanceTitle: "동아리박람회", songTitle: "Gucci", memberNames: ["박은지", "정서현"] },
  { performanceTitle: "광음", songTitle: "Rodeo remix", memberNames: ["정서현", "홍서연"] },
  { performanceTitle: "축제", songTitle: "Lovely Remix", memberNames: ["김가영(미컴)", "김가영(산심)"] },
  { performanceTitle: "광음", songTitle: "C-SPOT", memberNames: ["박준수", "김가영(산심)", "노영훈", "백예빈", "양서은", "윤연서", "이진", "정서현", "홍서연"] },
  { performanceTitle: "새로배움터", songTitle: "Richman", memberNames: ["박준수", "권하늘", "김가영(미컴)", "노영훈", "안현서", "양서은", "이지용", "정서현", "최희원"] },
  { performanceTitle: "515DAY", songTitle: "Yeah", memberNames: ["안현서", "김민철", "김예원", "김준재", "남지원", "박은지", "박하연", "양서은", "우상규", "윤연서", "이혜원", "정다현", "정서현", "홍다영"] },
  { performanceTitle: "축제", songTitle: "Big & Throw a fit", memberNames: ["안현서", "김가영(미컴)", "박은지", "정서현", "홍서연"] },
  { performanceTitle: "축제", songTitle: "나를돌아봐", memberNames: ["정서현", "김가영(미컴)", "김가희", "김민철", "김보민", "김예원", "노영훈", "백예빈", "이지용", "홍다영", "홍서연", "안현서", "유이정"] },
  { performanceTitle: "광음", songTitle: "WISE", memberNames: ["윤연서", "김가영(미컴)", "김민철", "김보민", "김예원", "안현서", "양서은", "이지용", "이현수", "정서현", "김우재", "박은지", "박하연", "이심현", "이진", "홍다영"] },
  { performanceTitle: "광음", songTitle: "Like this & Momma I Hit a Lick", memberNames: ["홍예나", "강유진", "김가영(미컴)", "안현서", "양서은"] },
  { performanceTitle: "광음", songTitle: "Ayo & Baby Gurl(ver.1)", memberNames: ["김가영(미컴)", "안현서", "이지용", "최희원", "홍다영", "정서현", "김보민", "박준수"] },
  { performanceTitle: "광음", songTitle: "Let It Lead & 99 Problems", memberNames: ["안현서", "권하늘", "김가영(산심)", "김예원", "홍다영", "김가영(미컴)", "노영훈"] },
  { performanceTitle: "광음", songTitle: "Sekkle&Bob & Baby Gurl(ver.2)", memberNames: ["최효우", "리아", "양서은", "이지용"] },
  { performanceTitle: "광음", songTitle: "Bounce & Say I", memberNames: ["김예원", "박은지", "박하연", "백예빈", "안현서", "정서현", "홍다영"] },
  { performanceTitle: "광음", songTitle: "Hall of Fame", memberNames: ["이혜원", "권하늘", "남지원", "리아", "최희원"] },
  { performanceTitle: "광음", songTitle: "Mek it Bunx Up", memberNames: ["정서현", "강유진", "김예원", "박은지", "안현서", "양서은", "윤연서"] },
  { performanceTitle: "축제", songTitle: "Banji", memberNames: ["박하연", "김가영(산심)", "김예원", "양서은", "차승연", "홍서연"] },
  { performanceTitle: "광음", songTitle: "In N Out", memberNames: ["박은지", "강유진", "김가희", "김민주", "김예원", "남지원", "리아", "백예빈", "양혜원", "이혜원", "정서현", "홍다영"] },
  { performanceTitle: "축제", songTitle: "Alphas", memberNames: ["박은지", "강유진", "김예원", "남지원", "양서은", "윤연서"] },
  { performanceTitle: "515DAY", songTitle: "Sushi", memberNames: ["김예원", "강유진", "김가영(산심)", "김민주", "김보민", "남지원", "리아", "박하연", "양연우", "윤연서", "이수민", "이심현", "이혜원"] },
  { performanceTitle: "광음", songTitle: "Toxic", memberNames: ["김예원", "강유진", "김가영(산심)", "리아", "박하연", "윤연서"] },
  { performanceTitle: "동아리밤", songTitle: "Drug", memberNames: ["홍서연", "강유진", "남지원", "백예빈", "양서은", "홍다영"] },
  { performanceTitle: "광음", songTitle: "ExtraL*창작", memberNames: ["김보민", "남지원", "리아", "정서현", "최희원"] },
  { performanceTitle: "광음", songTitle: "Abracadabra*창작", memberNames: ["김가영(산심)", "박하연", "백예빈", "양서은"] },
  { performanceTitle: "광음", songTitle: "Instruction & Sticky", memberNames: ["윤연서", "김예원", "남지원", "박은지", "정서현"] },
  { performanceTitle: "새로배움터", songTitle: "God It & Anxiety Kills", memberNames: ["김보민", "강유진", "김나라", "박하연", "유이정", "이혜원", "홍다영"] },
  { performanceTitle: "새로배움터", songTitle: "Lazarus", memberNames: ["김예원", "김우재", "김준재", "박은지", "박하연", "안현서", "양서은", "우상규", "윤연서", "정서현", "홍다영", "홍서연"] },
  { performanceTitle: "축제", songTitle: "Oh My Gawd", memberNames: ["정서현", "김준재", "백예빈", "박은지", "안현서", "우상규", "양서은", "홍다영", "김가영(산심)", "김예원", "남지원", "박하연", "윤연서", "이혜원", "정다현", "홍서연"] },
  { performanceTitle: "GNCS", songTitle: "Pose!*창작", memberNames: ["김가영(산심)", "김가희", "김보민", "김카린", "리아", "양혜원", "이심현", "이현수", "정서현", "홍다영"] },
  { performanceTitle: "동아리밤", songTitle: "I Love You Kung Fu & The Search", memberNames: ["정서현", "강유진", "김예원", "노영훈", "윤연서", "이지용", "최효우"] },
  { performanceTitle: "광음", songTitle: "Runaway Baby", memberNames: ["김가영(미컴)", "강유진", "남지원", "노영훈", "양연우"] },
  { performanceTitle: "광음", songTitle: "Ridin’& Friday Night", memberNames: ["홍다영", "김가영(미컴)", "백예빈", "유이정"] },
  { performanceTitle: "광음", songTitle: "Chill & Timeless", memberNames: ["윤연서", "강유진", "김가희", "리아", "박은지"] },
  { performanceTitle: "광음", songTitle: "섹시느낌*창작", memberNames: ["김민철", "권하늘", "노영훈", "박준수", "이지용", "최효우", "최희원"] },
  { performanceTitle: "광음", songTitle: "Circle", memberNames: ["정서현", "강유진", "김나라", "김보민", "박은지"] },
];

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
    archiveSongs: dedupeArchiveSongs(parsed.archiveSongs ?? []),
    practiceCandidates: dedupePracticeCandidates(parsed.practiceCandidates ?? []),
    performances: parsed.performances.map((performance) => ({ ...performance, memberIds: performance.memberIds ?? [] })),
    users: parsed.users.map((user) => ({
      ...user,
      teamColor: user.teamColor ?? danceTeamColor,
      performanceColors: user.performanceColors ?? {},
      activeYears: user.activeYears ?? inferActiveYears(user, archive2025MemberNames, activeCurrentUserIds),
    })),
  };
  const completedArchiveData = withCompletedDanceArchive(
    withCompletedDanceArchive(normalizedData, completedDanceArchive2025Rows, 2025, "2025 춤팀 곡 목록.pdf"),
    completedDanceArchive2026Rows,
    2026,
    "2026 춤팀 완료 곡",
  );
  const aliasNormalizedData = normalizeMemberAliases(completedArchiveData);
  const currentRapData = withCurrentRap515Day(aliasNormalizedData);
  const currentArchiveData = syncCurrentSongsToArchive(currentRapData);
  const migratedData = { ...currentArchiveData, archiveSongs: dedupeArchiveSongs(currentArchiveData.archiveSongs) };
  if (JSON.stringify(migratedData) !== JSON.stringify(normalizedData)) writeData(migratedData);
  return migratedData;
}

function dedupePracticeCandidates(candidates: AppData["practiceCandidates"]) {
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    const key = `${candidate.songId}::${candidate.startsAt}::${candidate.endsAt}::${candidate.status}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function inferActiveYears(user: ClubUser, archiveMemberNames: Set<string>, activeCurrentUserIds: Set<string>) {
  const years = new Set<number>();
  const appearsInArchive = archiveMemberNames.has(user.name);
  if (appearsInArchive) years.add(2025);
  if (!appearsInArchive || activeCurrentUserIds.has(user.id) || user.role !== "USER" || user.username !== user.name || user.password !== "1234") years.add(2026);
  return Array.from(years).sort();
}

function dedupeArchiveSongs(archiveSongs: ArchiveSong[]) {
  const seen = new Set<string>();
  return archiveSongs.map((song) => ({ ...song, years: song.years ?? inferArchiveYears(song) })).filter((song) => {
    const memberKey = [...song.memberNames].map((name) => name.trim()).sort((a, b) => a.localeCompare(b, "ko")).join("|");
    const key = [
      song.performanceTitle.trim(),
      song.songTitle.trim(),
      song.leaderName.trim(),
      song.teamId,
      song.source ?? "",
      memberKey,
    ].join("::");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function syncCurrentSongsToArchive(data: AppData): AppData {
  const existingByKey = new Map(data.archiveSongs.map((song) => [song.archiveKey, song]));
  const linkedCurrentSongIds = new Set(data.archiveSongs.flatMap((song) => song.linkedCurrentSongIds ?? []));
  const currentArchives = data.songs.flatMap((song) => {
    if (linkedCurrentSongIds.has(song.id)) return [];
    const performance = data.performances.find((item) => item.id === song.performanceId);
    if (!performance) return [];

    const archiveKey = `current-${performance.id}-${song.id}`;
    const existing = existingByKey.get(archiveKey);
    const memberNames = Array.from(new Set(
      data.songMembers
        .filter((member) => member.songId === song.id)
        .map((member) => data.users.find((user) => user.id === member.userId)?.name)
        .filter((name): name is string => Boolean(name)),
    ));
    const leaderName = data.users.find((user) => user.id === song.leaderUserId)?.name ?? memberNames[0] ?? "";
    const comparable = {
      performanceTitle: performance.title,
      teamId: song.teamId,
      songTitle: song.title,
      leaderName,
      memberNames,
      durationSeconds: song.durationSeconds,
      years: [2026],
      source: "현재 진행 곡",
    };
    const unchanged = existing
      && existing.performanceTitle === comparable.performanceTitle
      && existing.teamId === comparable.teamId
      && existing.songTitle === comparable.songTitle
      && existing.leaderName === comparable.leaderName
      && JSON.stringify(existing.memberNames) === JSON.stringify(comparable.memberNames)
      && existing.durationSeconds === comparable.durationSeconds
      && JSON.stringify(existing.years) === JSON.stringify(comparable.years)
      && existing.source === comparable.source;

    return [{
      ...existing,
      id: existing?.id ?? `archive_current_${song.id}`,
      archiveKey,
      ...comparable,
      createdAt: existing?.createdAt ?? song.createdAt,
      updatedAt: unchanged ? existing.updatedAt : song.updatedAt,
    } satisfies ArchiveSong];
  });

  const currentKeys = new Set(currentArchives.map((song) => song.archiveKey));
  const archivedOnly = data.archiveSongs.filter((song) => !song.archiveKey.startsWith("current-") && !currentKeys.has(song.archiveKey));
  const archiveSongs = [...archivedOnly, ...currentArchives];

  return { ...data, archiveSongs };
}

function canonicalMemberName(name: string) {
  return memberAliases[name] ?? name;
}

function normalizeMemberAliases(data: AppData): AppData {
  const usersByName = new Map(data.users.map((user) => [user.name, user]));
  const aliasUserIdToCanonicalId = new Map<string, string>();
  const mergedUserByCanonicalName = new Map<string, ClubUser>();

  for (const user of data.users) {
    const canonicalName = canonicalMemberName(user.name);
    const existing = mergedUserByCanonicalName.get(canonicalName) ?? usersByName.get(canonicalName);
    const normalizedUser: ClubUser = {
      ...user,
      name: canonicalName,
      username: user.username === user.name ? canonicalName : user.username,
      activeYears: user.activeYears ?? [],
    };

    if (!existing) {
      mergedUserByCanonicalName.set(canonicalName, { ...normalizedUser, activeYears: Array.from(new Set(normalizedUser.activeYears)).sort() });
      aliasUserIdToCanonicalId.set(user.id, user.id);
      continue;
    }

    const activeYears = Array.from(new Set([...(existing.activeYears ?? []), ...(normalizedUser.activeYears ?? [])])).sort();
    if (existing.id === user.id) {
      mergedUserByCanonicalName.set(canonicalName, { ...existing, ...normalizedUser, activeYears });
      aliasUserIdToCanonicalId.set(user.id, user.id);
      continue;
    }

    mergedUserByCanonicalName.set(canonicalName, {
      ...existing,
      name: canonicalName,
      username: existing.username === existing.name ? canonicalName : existing.username,
      activeYears,
      updatedAt: now(),
    });
    aliasUserIdToCanonicalId.set(user.id, existing.id);
    aliasUserIdToCanonicalId.set(existing.id, existing.id);
  }

  const mapUserId = (userId: string) => aliasUserIdToCanonicalId.get(userId) ?? userId;
  const dedupeIds = (ids: string[]) => Array.from(new Set(ids.map(mapUserId)));
  const songMemberKeys = new Set<string>();
  const songMembers = data.songMembers.flatMap((member) => {
    const userId = mapUserId(member.userId);
    const key = `${member.songId}:${userId}`;
    if (songMemberKeys.has(key)) return [];
    songMemberKeys.add(key);
    return [{ ...member, userId }];
  });

  return {
    ...data,
    users: Array.from(mergedUserByCanonicalName.values()),
    performances: data.performances.map((performance) => ({ ...performance, memberIds: dedupeIds(performance.memberIds) })),
    songMembers,
    availabilityResponses: data.availabilityResponses.map((response) => ({ ...response, userId: mapUserId(response.userId) })),
    ambiguousTimes: data.ambiguousTimes.map((time) => ({ ...time, userId: mapUserId(time.userId) })),
    schedules: data.schedules.map((schedule) => ({ ...schedule, ownerUserId: schedule.ownerUserId ? mapUserId(schedule.ownerUserId) : schedule.ownerUserId })),
    archiveSongs: data.archiveSongs.map((song) => ({
      ...song,
      leaderName: canonicalMemberName(song.leaderName),
      memberNames: Array.from(new Set(song.memberNames.map(canonicalMemberName))),
    })),
  };
}

function normalizeSongTitle(value: string) {
  return value.toLocaleLowerCase("en").replace(/\s+/g, "").trim();
}

function withCurrentRap515Day(data: AppData): AppData {
  const createdAt = now();
  const rapTeam = data.teams.find((team) => team.name === "랩") ?? {
    id: "team_rap",
    name: "랩",
    color: "#B8C8F8",
    order: data.teams.length + 1,
    isActive: true,
    createdAt,
    updatedAt: createdAt,
  } satisfies Team;
  const hasRapTeam = data.teams.some((team) => team.id === rapTeam.id);
  const existingPerformance = data.performances.find((performance) => normalizeSongTitle(performance.title) === normalizeSongTitle("515DAY"));
  const fallbackEndsAt = new Date(new Date(createdAt).getTime() + 2 * 60 * 60 * 1000).toISOString();
  const performance: Performance = existingPerformance ?? {
    id: "performance_2026_515day",
    title: "515DAY",
    description: "",
    color: "#7BC7F2",
    startsAt: createdAt,
    endsAt: fallbackEndsAt,
    location: "",
    memberIds: [],
    status: "ACTIVE",
    createdBy: data.users.find((user) => user.role === "SUPER_ADMIN")?.id ?? data.users[0]?.id ?? "system",
    createdAt,
    updatedAt: createdAt,
  };
  const allMemberNames = new Set(currentRap515DayRows.flatMap((row) => row.memberNames));
  const users = data.users.map((user) => {
    if (!allMemberNames.has(user.name)) return user;
    const activeYears = Array.from(new Set([...(user.activeYears ?? []), 2026])).sort();
    const changed = user.teamId !== rapTeam.id || activeYears.length !== (user.activeYears ?? []).length;
    return changed ? { ...user, teamId: rapTeam.id, activeYears, updatedAt: createdAt } : user;
  });
  const existingNames = new Set(users.map((user) => user.name));
  const missingUsers: ClubUser[] = Array.from(allMemberNames)
    .filter((name) => !existingNames.has(name))
    .map((name, index) => ({
      id: `user_2026_515day_rap_${index + 1}`,
      username: name,
      password: "1234",
      name,
      teamId: rapTeam.id,
      teamColor: rapTeam.color,
      performanceColors: {},
      activeYears: [2026],
      role: "USER",
      mustChangePassword: true,
      status: "ACTIVE",
      createdAt,
      updatedAt: createdAt,
    }));
  const allUsers = [...users, ...missingUsers];
  const userByName = new Map(allUsers.map((user) => [user.name, user]));
  const performanceSongs = data.songs.filter((song) => song.performanceId === performance.id);
  const targetSongIds = new Set<string>();
  const targetSongs: Song[] = currentRap515DayRows.map((row, index) => {
    const existing = performanceSongs.find((song) => normalizeSongTitle(song.title) === normalizeSongTitle(row.title));
    const memberIds = row.memberNames.map((name) => userByName.get(name)?.id).filter((id): id is string => Boolean(id));
    const leaderUserId = memberIds[0] ?? existing?.leaderUserId ?? "";
    const songId = existing?.id ?? `song_2026_515day_rap_${index + 1}`;
    targetSongIds.add(songId);
    const unchanged = existing
      && existing.title === row.title
      && existing.teamId === rapTeam.id
      && existing.durationSeconds === row.durationSeconds
      && existing.leaderUserId === leaderUserId;
    return {
      ...existing,
      id: songId,
      performanceId: performance.id,
      teamId: rapTeam.id,
      title: row.title,
      durationSeconds: row.durationSeconds,
      leaderUserId,
      requiredPracticeCount: existing?.requiredPracticeCount ?? 0,
      estimatedPracticeMinutes: existing?.estimatedPracticeMinutes ?? 120,
      order: existing?.order ?? data.songs.length + index + 1,
      status: existing?.status ?? "ACTIVE",
      createdAt: existing?.createdAt ?? createdAt,
      updatedAt: unchanged ? existing.updatedAt : createdAt,
    };
  });
  const targetMemberships: SongMember[] = currentRap515DayRows.flatMap((row, rowIndex) => {
    const song = targetSongs[rowIndex];
    return row.memberNames.flatMap((name, memberIndex) => {
      const user = userByName.get(name);
      if (!user) return [];
      return [{
        id: `song_member_2026_515day_rap_${rowIndex + 1}_${memberIndex + 1}`,
        performanceId: performance.id,
        songId: song.id,
        userId: user.id,
        joinedAt: song.createdAt,
      }];
    });
  });
  const memberIds = Array.from(new Set([...(performance.memberIds ?? []), ...targetMemberships.map((membership) => membership.userId)]));
  const performanceChanged = memberIds.length !== (performance.memberIds ?? []).length;
  const nextPerformance = performanceChanged ? { ...performance, memberIds, updatedAt: createdAt } : performance;

  return {
    ...data,
    teams: hasRapTeam ? data.teams : [...data.teams, rapTeam],
    users: allUsers,
    performances: existingPerformance
      ? data.performances.map((item) => item.id === performance.id ? nextPerformance : item)
      : [...data.performances, nextPerformance],
    songs: [...data.songs.filter((song) => !targetSongIds.has(song.id)), ...targetSongs],
    songMembers: [...data.songMembers.filter((membership) => !targetSongIds.has(membership.songId)), ...targetMemberships],
  };
}

function inferArchiveYears(song: ArchiveSong) {
  const value = `${song.source ?? ""} ${song.archiveKey ?? ""}`;
  return [
    value.includes("2025") || /\b25\b/.test(value) ? 2025 : null,
    value.includes("2026") || /\b26\b/.test(value) || value.includes("현재 진행 곡") ? 2026 : null,
  ].filter((year): year is number => Boolean(year));
}

function withCompletedDanceArchive(data: AppData, archiveRows: readonly DanceArchiveRow[], year: number, source: string): AppData {
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
  const rows = archiveRows.map((row, index) => ({
    ...row,
    archiveKey: `${year}-dance-completed-${index + 1}-${row.performanceTitle}-${row.songTitle}`,
    archiveId: `archive_${year}_dance_completed_${index + 1}`,
  }));
  const allNames: Set<string> = new Set(rows.flatMap((row) => row.memberNames));
  const existingUserNames = new Set(data.users.map((user) => user.name));
  const missingUserNames = Array.from(allNames).filter((name) => !existingUserNames.has(name));
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
      years: [year],
      source,
      createdAt,
      updatedAt: createdAt,
    }));
  const newUsers: ClubUser[] = archiveSongs.length === 0
    ? []
    : missingUserNames.map((name) => ({
        id: uid("user"),
        username: name,
        password: "1234",
        name,
        teamId: danceTeam.id,
        teamColor: danceTeam.color,
        performanceColors: {},
        activeYears: [year],
        role: "USER",
        mustChangePassword: true,
        status: "ACTIVE",
        createdAt,
        updatedAt: createdAt,
      }));
  let activeYearChanged = false;
  const usersWithActiveYears = data.users.map((user) => {
    if (!allNames.has(user.name)) return user;
    const activeYears = Array.from(new Set([...(user.activeYears ?? []), year])).sort();
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
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(syncCurrentSongsToArchive(data)));
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
