/**
 * Pure participant model + helpers for the multi-participant waiver feature.
 * No I/O, no process coupling — fully unit-testable.
 */

const WAIVER_STATUS_PENDING = 'pending';
const WAIVER_STATUS_SIGNED = 'signed';
// Terminal, unsigned states surfaced from PandaDoc by reconciliation so the UI
// can show them accurately. No automatic re-issue — issuing a fresh waiver is a
// manual/support action (e.g. via the participant swap flow).
const WAIVER_STATUS_EXPIRED = 'expired';
const WAIVER_STATUS_VOIDED = 'voided';
const ROLE_PRIMARY = 'primary';
const ROLE_SECONDARY = 'secondary';

const isNonEmptyString = value => typeof value === 'string' && value.trim().length > 0;

const normalizeEmail = email => (isNonEmptyString(email) ? email.trim().toLowerCase() : null);

const splitName = fullName => {
  if (!isNonEmptyString(fullName)) {
    return { firstName: 'Participant', lastName: '' };
  }
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
};

const createParticipantEntry = ({ name, email, role, pandadocDocumentId = null }) => ({
  name: name?.trim(),
  email: normalizeEmail(email),
  pandadoc_document_id: pandadocDocumentId,
  waiver_status: WAIVER_STATUS_PENDING,
  role,
});

/**
 * Build participants array for protectedData from checkout payload.
 */
const buildParticipantsArray = ({ primaryUser, secondaries = [] }) => {
  const primaryName = primaryUser?.name;
  const primaryEmail = normalizeEmail(primaryUser?.email);

  if (!isNonEmptyString(primaryName) || !primaryEmail) {
    return null;
  }

  const participants = [
    createParticipantEntry({ name: primaryName, email: primaryEmail, role: ROLE_PRIMARY }),
  ];

  secondaries.forEach(secondary => {
    const name = secondary?.name;
    const email = normalizeEmail(secondary?.email);
    if (isNonEmptyString(name) && email) {
      participants.push(createParticipantEntry({ name, email, role: ROLE_SECONDARY }));
    }
  });

  return participants;
};

/**
 * Parse secondary participants from checkout form values.
 * Expects participant_0_name, participant_0_email, etc.
 */
const parseSecondaryParticipantsFromForm = (formValues, secondaryCount) => {
  const secondaries = [];
  for (let i = 0; i < secondaryCount; i += 1) {
    const name = formValues?.[`participant_${i}_name`];
    const email = formValues?.[`participant_${i}_email`];
    if (isNonEmptyString(name) && isNonEmptyString(email)) {
      secondaries.push({ name, email });
    }
  }
  return secondaries;
};

const validateParticipantsForCheckout = (participants, expectedSecondaryCount) => {
  if (!Array.isArray(participants) || participants.length === 0) {
    return 'Primary participant is required.';
  }

  const primary = participants[0];
  if (primary.role !== ROLE_PRIMARY || !primary.name || !primary.email) {
    return 'Primary participant is invalid.';
  }

  const secondaries = participants.filter(p => p.role === ROLE_SECONDARY);
  if (secondaries.length !== expectedSecondaryCount) {
    return 'All participant details must be filled in.';
  }

  const invalidSecondary = secondaries.find(p => !p.name || !p.email);
  if (invalidSecondary) {
    return 'All participant details must be filled in.';
  }

  return null;
};

const findParticipantIndexByDocumentId = (participants, documentId) => {
  if (!documentId || !Array.isArray(participants)) {
    return -1;
  }
  return participants.findIndex(p => p.pandadoc_document_id === documentId);
};

const updateParticipantAtIndex = (participants, index, updates) => {
  if (!Array.isArray(participants) || index < 0 || index >= participants.length) {
    return participants;
  }
  return participants.map((participant, i) =>
    i === index ? { ...participant, ...updates } : participant
  );
};

const markParticipantSigned = (participants, documentId) => {
  const index = findParticipantIndexByDocumentId(participants, documentId);
  if (index < 0) {
    return participants;
  }
  return updateParticipantAtIndex(participants, index, { waiver_status: WAIVER_STATUS_SIGNED });
};

const getSecondaryParticipants = participants =>
  (participants || []).filter(p => p.role === ROLE_SECONDARY);

const allParticipantsSigned = participants =>
  Array.isArray(participants) &&
  participants.length > 0 &&
  participants.every(p => p.waiver_status === WAIVER_STATUS_SIGNED);

module.exports = {
  WAIVER_STATUS_PENDING,
  WAIVER_STATUS_SIGNED,
  WAIVER_STATUS_EXPIRED,
  WAIVER_STATUS_VOIDED,
  ROLE_PRIMARY,
  ROLE_SECONDARY,
  splitName,
  buildParticipantsArray,
  parseSecondaryParticipantsFromForm,
  validateParticipantsForCheckout,
  findParticipantIndexByDocumentId,
  updateParticipantAtIndex,
  markParticipantSigned,
  getSecondaryParticipants,
  allParticipantsSigned,
};
