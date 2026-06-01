// Module: users
// Canonical wrappers for profile reads.
export { listProfilesByUserIds } from './services/listProfilesByUserIds';
export type { ListProfilesByUserIdsOptions } from './services/listProfilesByUserIds';
export { getProfileByUserId } from './services/getProfileByUserId';
export type { GetProfileByUserIdOptions } from './services/getProfileByUserId';
export { getProfileForContractParty } from './services/getProfileForContractParty';
export type { GetProfileForContractPartyOptions } from './services/getProfileForContractParty';
export { getProfileByEmail } from './services/getProfileByEmail';
export type { GetProfileByEmailOptions } from './services/getProfileByEmail';
export { countProfiles } from './services/countProfiles';
export type { CountProfilesOptions, CountProfilesFilter } from './services/countProfiles';
export { listProfiles } from './services/listProfiles';
export type { ListProfilesOptions } from './services/listProfiles';
export { updateProfile } from './services/updateProfile';
export type { UpdateProfileOptions } from './services/updateProfile';
export { updateProfileById } from './services/updateProfileById';
export type { UpdateProfileByIdOptions } from './services/updateProfileById';
export { updateProfilesByIds } from './services/updateProfilesByIds';
export type { UpdateProfilesByIdsOptions } from './services/updateProfilesByIds';
export { insertProfile } from './services/insertProfile';
export type { InsertProfileOptions } from './services/insertProfile';
export { updateOnboardingProgress } from './services/updateOnboardingProgress';
export type { UpdateOnboardingProgressOptions } from './services/updateOnboardingProgress';
export { adminSearchUsersForTransfer } from './services/adminSearchUsersForTransfer';
export type {
  AdminTransferUserHit,
  AdminSearchUsersForTransferOptions,
} from './services/adminSearchUsersForTransfer';

// WRAPPER-ISOLATION-BACKLOG-1
export { getProfileByRefId } from './services/getProfileByRefId';
export type { GetProfileByRefIdOptions } from './services/getProfileByRefId';
export { searchProfilesByOr } from './services/searchProfilesByOr';
export type { SearchProfilesByOrOptions } from './services/searchProfilesByOr';

// STAB-1A — isolation cleanup wrappers
export { listProfilesByCreatedRange } from './services/listProfilesByCreatedRange';
export type { ListProfilesByCreatedRangeOptions } from './services/listProfilesByCreatedRange';
export { getProfileByEmailIlike } from './services/getProfileByEmailIlike';
export type { GetProfileByEmailIlikeOptions } from './services/getProfileByEmailIlike';