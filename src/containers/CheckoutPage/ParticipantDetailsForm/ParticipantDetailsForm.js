import React from 'react';
import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import * as validators from '../../../util/validators';
import { getParticipantCount } from '../../../util/waiverParticipants';
import { FieldTextInput, FieldSelect, Heading } from '../../../components';

import css from './ParticipantDetailsForm.module.css';

/**
 * Collects the number of participants and a name + email for each secondary
 * participant. The buyer chooses how many people will use the rental, up to the
 * maximum the provider set on the listing (waiverMaxParticipants).
 */
const ParticipantDetailsForm = props => {
  const { maxParticipants = 1, formValues, formId } = props;
  const intl = useIntl();

  const max = Math.max(1, parseInt(maxParticipants, 10) || 1);
  const selectedCount = getParticipantCount(formValues, max);
  const secondaryCount = Math.max(0, selectedCount - 1);

  const nameRequired = validators.required(
    intl.formatMessage({ id: 'ParticipantDetailsForm.nameRequired' })
  );
  const emailRequired = validators.required(
    intl.formatMessage({ id: 'ParticipantDetailsForm.emailRequired' })
  );
  const emailValid = validators.emailFormatValid(
    intl.formatMessage({ id: 'ParticipantDetailsForm.emailInvalid' })
  );

  return (
    <div className={css.root}>
      <Heading as="h3" rootClassName={css.heading}>
        <FormattedMessage id="ParticipantDetailsForm.title" />
      </Heading>

      {max > 1 ? (
        <FieldSelect
          id={`${formId}.waiverParticipantCount`}
          name="waiverParticipantCount"
          className={css.field}
          label={intl.formatMessage({ id: 'ParticipantDetailsForm.countLabel' })}
        >
          {Array.from({ length: max }).map((_, index) => {
            const count = index + 1;
            return (
              <option key={count} value={count}>
                {intl.formatMessage({ id: 'ParticipantDetailsForm.countOption' }, { count })}
              </option>
            );
          })}
        </FieldSelect>
      ) : null}

      {secondaryCount > 0 ? (
        <p className={css.info}>
          <FormattedMessage id="ParticipantDetailsForm.info" values={{ count: secondaryCount }} />
        </p>
      ) : null}

      {Array.from({ length: secondaryCount }).map((_, index) => (
        <div key={`participant-${index}`} className={css.participantBlock}>
          <p className={css.participantLabel}>
            <FormattedMessage
              id="ParticipantDetailsForm.participantLabel"
              values={{ number: index + 2 }}
            />
          </p>
          <FieldTextInput
            id={`${formId}.participant_${index}_name`}
            name={`participant_${index}_name`}
            className={css.field}
            type="text"
            label={intl.formatMessage({ id: 'ParticipantDetailsForm.nameLabel' })}
            placeholder={intl.formatMessage({ id: 'ParticipantDetailsForm.namePlaceholder' })}
            validate={nameRequired}
          />
          <FieldTextInput
            id={`${formId}.participant_${index}_email`}
            name={`participant_${index}_email`}
            className={css.field}
            type="email"
            label={intl.formatMessage({ id: 'ParticipantDetailsForm.emailLabel' })}
            placeholder={intl.formatMessage({ id: 'ParticipantDetailsForm.emailPlaceholder' })}
            validate={validators.composeValidators(emailRequired, emailValid)}
          />
        </div>
      ))}
    </div>
  );
};

export default ParticipantDetailsForm;
