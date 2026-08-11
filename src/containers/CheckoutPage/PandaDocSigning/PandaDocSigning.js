import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import { createPrimaryWaiverSession } from '../../../util/api';
import { isMobileSafari } from '../../../util/userAgent';
import {
  areParticipantFieldsComplete,
  getParticipantCount,
  getPrimaryUserFromCurrentUser,
  parseSecondaryParticipantsFromForm,
} from '../../../util/waiverParticipants';
import { Heading, PrimaryButton, IconSpinner } from '../../../components';

import css from './PandaDocSigning.module.css';

const PANDADOC_COMPLETED_EVENT = 'session_view.document.completed';

/**
 * Embedded PandaDoc signing for the primary renter before payment. Used for both
 * default-booking and subscription-rental checkout — the primary must sign
 * before the Pay button unlocks either way.
 */
const PandaDocSigning = props => {
  const {
    maxParticipants = 1,
    currentUser,
    formValues,
    onSigned,
    onSessionCreated,
    primaryWaiverSigned,
  } = props;
  const intl = useIntl();
  const [sessionUrl, setSessionUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const messageHandlerRef = useRef(null);

  const participantCount = getParticipantCount(formValues, maxParticipants);
  const secondaryCount = Math.max(0, participantCount - 1);
  const participantsComplete =
    secondaryCount === 0 || areParticipantFieldsComplete(formValues, participantCount);

  const handlePandaDocMessage = useCallback(
    event => {
      if (!event?.data || typeof event.data !== 'object') {
        return;
      }
      if (
        event.data.type === PANDADOC_COMPLETED_EVENT ||
        event.data.event === PANDADOC_COMPLETED_EVENT
      ) {
        onSigned(true);
      }
    },
    [onSigned]
  );

  useEffect(() => {
    return () => {
      if (messageHandlerRef.current) {
        window.removeEventListener('message', messageHandlerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('waiverSigned') === 'true') {
      onSigned(true);
    }
  }, [onSigned]);

  const startSigning = () => {
    if (!participantsComplete || primaryWaiverSigned) {
      return;
    }

    setLoading(true);
    setError(null);

    const primaryUser = getPrimaryUserFromCurrentUser(currentUser);
    const secondaries = parseSecondaryParticipantsFromForm(formValues, secondaryCount);

    createPrimaryWaiverSession({ primaryUser, secondaries, seats: participantCount })
      .then(response => {
        if (!response?.enabled) {
          throw new Error('Waiver signing is not available');
        }

        onSessionCreated(response.documentId);

        if (isMobileSafari()) {
          const returnUrl = `${window.location.pathname}${window.location.search}`;
          const redirectUrl = `${returnUrl}${returnUrl.includes('?') ? '&' : '?'}waiverSigned=true`;
          window.location.href = `${response.sessionUrl}?redirect_url=${encodeURIComponent(
            `${window.location.origin}${redirectUrl}`
          )}`;
          return;
        }

        setSessionUrl(response.sessionUrl);
        messageHandlerRef.current = handlePandaDocMessage;
        window.addEventListener('message', handlePandaDocMessage);
      })
      .catch(e => {
        setError(e?.message || intl.formatMessage({ id: 'PandaDocSigning.error' }));
      })
      .finally(() => {
        setLoading(false);
      });
  };

  if (primaryWaiverSigned) {
    return (
      <div className={css.root}>
        <p className={css.signedMessage}>
          <FormattedMessage id="PandaDocSigning.signedMessage" />
        </p>
      </div>
    );
  }

  return (
    <div className={css.root}>
      <Heading as="h3" rootClassName={css.heading}>
        <FormattedMessage id="PandaDocSigning.title" />
      </Heading>
      <p className={css.info}>
        <FormattedMessage id="PandaDocSigning.info" />
      </p>

      {!sessionUrl ? (
        <PrimaryButton
          type="button"
          className={css.startButton}
          inProgress={loading}
          disabled={!participantsComplete || loading}
          onClick={startSigning}
        >
          <FormattedMessage id="PandaDocSigning.startButton" />
        </PrimaryButton>
      ) : (
        <iframe
          title={intl.formatMessage({ id: 'PandaDocSigning.iframeTitle' })}
          src={sessionUrl}
          className={css.iframe}
        />
      )}

      {loading ? (
        <p className={css.loading}>
          <IconSpinner />
        </p>
      ) : null}

      {error ? <p className={css.error}>{error}</p> : null}
    </div>
  );
};

export default PandaDocSigning;
