/** Compatibility re-exports — prefer referralStatusMachine / maskNationalId. */
export {
  REFERRAL_TRANSITIONS,
  assertReferralTransition,
  assertCctvCannotClose,
  assertCctvCannotOverwriteResolution,
  canCancelBeforeReceive,
  assertPermitDateRange,
  isForbiddenExtension,
} from './referralStatusMachine.js';
export { maskNationalId } from './maskNationalId.js';
