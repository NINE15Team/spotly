/**
 * Client-side helpers for waiver participant data at checkout.
 * Shared by both default-booking and subscription-rental checkout flows.
 */

const normalizeEmail = email => (typeof email === 'string' ? email.trim().toLowerCase() : '');

/**
 * Resolve the buyer-selected number of participants (including the primary
 * renter), clamped to the range 1..maxParticipants. Defaults to 1.
 */
export const getParticipantCount = (formValues, maxParticipants = 1) => {
  const max = Math.max(1, parseInt(maxParticipants, 10) || 1);
  const selected = parseInt(formValues?.waiverParticipantCount, 10);
  if (!selected || Number.isNaN(selected)) {
    return 1;
  }
  return Math.min(Math.max(1, selected), max);
};

export const parseSecondaryParticipantsFromForm = (formValues, secondaryCount) => {
  const secondaries = [];
  for (let i = 0; i < secondaryCount; i += 1) {
    const name = formValues?.[`participant_${i}_name`];
    const email = formValues?.[`participant_${i}_email`];
    if (name?.trim() && email?.trim()) {
      secondaries.push({ name: name.trim(), email: normalizeEmail(email) });
    }
  }
  return secondaries;
};

export const buildParticipantsForCheckout = (formValues, currentUser, seats = 1) => {
  const profile = currentUser?.attributes?.profile;
  const primaryName = profile
    ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim()
    : formValues?.name?.trim();
  const primaryEmail = currentUser?.attributes?.email || formValues?.email;

  const secondaryCount = Math.max(0, (seats || 1) - 1);
  const secondaries = parseSecondaryParticipantsFromForm(formValues, secondaryCount);

  const participants = [
    {
      name: primaryName,
      email: normalizeEmail(primaryEmail),
      pandadoc_document_id: null,
      waiver_status: 'pending',
      role: 'primary',
    },
  ];

  secondaries.forEach(secondary => {
    participants.push({
      name: secondary.name,
      email: secondary.email,
      pandadoc_document_id: null,
      waiver_status: 'pending',
      role: 'secondary',
    });
  });

  return participants;
};

export const areParticipantFieldsComplete = (formValues, seats = 1) => {
  const secondaryCount = Math.max(0, (seats || 1) - 1);
  const secondaries = parseSecondaryParticipantsFromForm(formValues, secondaryCount);
  return secondaries.length === secondaryCount;
};

export const getPrimaryUserFromCurrentUser = currentUser => {
  const profile = currentUser?.attributes?.profile;
  return {
    name: profile ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() : '',
    email: currentUser?.attributes?.email || '',
  };
};
