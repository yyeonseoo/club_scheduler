export type Role = "SUPER_ADMIN" | "VICE_ADMIN" | "TEAM_ADMIN" | "USER";

export type UserStatus = "ACTIVE" | "INACTIVE";

export type Team = {
  id: string;
  name: string;
  color: string;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ClubUser = {
  id: string;
  username: string;
  password: string;
  name: string;
  teamId: string | null;
  teamColor: string;
  performanceColors?: Record<string, string>;
  role: Role;
  mustChangePassword: boolean;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
};

export type PerformanceStatus = "DRAFT" | "ACTIVE" | "COMPLETED" | "CANCELED";

export type Performance = {
  id: string;
  title: string;
  description?: string;
  color: string;
  startsAt: string;
  endsAt: string;
  location?: string;
  memberIds: string[];
  status: PerformanceStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type Song = {
  id: string;
  performanceId: string;
  teamId: string;
  title: string;
  artist?: string;
  leaderUserId: string;
  requiredPracticeCount: number;
  estimatedPracticeMinutes: number;
  order: number;
  status: "ACTIVE" | "ARCHIVED";
  createdAt: string;
  updatedAt: string;
};

export type SongMember = {
  id: string;
  performanceId: string;
  songId: string;
  userId: string;
  joinedAt: string;
};

export type ScheduleType = "PERFORMANCE" | "PRACTICE" | "PERSONAL" | "MEETING";
export type ScheduleVisibility = "PUBLIC" | "MEMBERS_ONLY" | "ADMINS_ONLY" | "PRIVATE";

export type Schedule = {
  id: string;
  type: ScheduleType;
  title: string;
  startsAt: string;
  endsAt: string;
  color?: string;
  performanceId?: string;
  songId?: string;
  ownerUserId?: string;
  visibility: ScheduleVisibility;
  status: "CONFIRMED" | "CANCELED";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type ScheduleSurvey = {
  id: string;
  performanceId: string;
  songId: string;
  createdBy: string;
  title: string;
  startDate: string;
  endDate: string;
  timeStart: string;
  timeEnd: string;
  slotMinutes: number;
  status: "OPEN" | "CLOSED";
  createdAt: string;
  updatedAt: string;
};

export type AvailabilityResponse = {
  id: string;
  surveyId: string;
  userId: string;
  slots: Array<{ date: string; time: string; available: boolean }>;
  submittedAt: string;
  updatedAt: string;
};

export type AmbiguousTime = {
  id: string;
  surveyId: string;
  userId: string;
  date: string;
  timeStart: string;
  timeEnd: string;
  memo?: string;
  createdAt: string;
};

export type PracticeCandidate = {
  id: string;
  performanceId: string;
  songId: string;
  surveyId?: string;
  proposedBy: string;
  startsAt: string;
  endsAt: string;
  availableMemberCount: number;
  totalMemberCount: number;
  memo?: string;
  title?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type Notice = {
  id: string;
  type: "GENERAL" | "PERFORMANCE" | "SONG" | "MEETING";
  title: string;
  content: string;
  targetPerformanceId?: string;
  targetSongId?: string;
  pinned: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type AuditLog = {
  id: string;
  actorUserId: string;
  actorRole: Role;
  action: string;
  targetType: string;
  targetId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  createdAt: string;
};

export type AppData = {
  teams: Team[];
  users: ClubUser[];
  performances: Performance[];
  songs: Song[];
  songMembers: SongMember[];
  schedules: Schedule[];
  surveys: ScheduleSurvey[];
  availabilityResponses: AvailabilityResponse[];
  ambiguousTimes: AmbiguousTime[];
  practiceCandidates: PracticeCandidate[];
  notices: Notice[];
  auditLogs: AuditLog[];
};
