import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import { createPrimaryWaiverSession, getPrimaryWaiverStatus } from '../../../util/api';
import {
  areParticipantFieldsComplete,
  getParticipantCount,
  getPrimaryUserFromCurrentUser,
  parseSecondaryParticipantsFromForm,
} from '../../../util/waiverParticipants';
import { Heading, PrimaryButton, SecondaryButton, IconSpinner, Modal } from '../../../components';

import css from './PandaDocSigning.module.css';

const PANDADOC_COMPLETED_EVENT = 'session_view.document.completed';
const PANDADOC_EXCEPTION_EVENT = 'session_view.document.exception';
const MODAL_ID = 'PandaDocSigning.modal';

// Only trust postMessages that originate from PandaDoc.
const isPandaDocOrigin = origin => {
  try {
    const { hostname } = new URL(origin);
    return hostname === 'pandadoc.com' || hostname.endsWith('.pandadoc.com');
  } catch (e) {
    return false;
  }
};

const noop = () => {};

/**
 * Embedded PandaDoc signing for the primary renter before payment. Used for both
 * default-booking and subscription-rental checkout — the primary must sign
 * before the Pay button unlocks either way.
 *
 * The signing session is always rendered in an iframe inside a fullscreen
 * Modal, on every device. PandaDoc embedded sessions do not support redirects
 * (see https://developers.pandadoc.com/docs/embedded-signing), so a full-page
 * redirect would strand the user on PandaDoc's completion screen. Completion is
 * detected via PandaDoc's postMessage, with a server-side status check as a
 * fallback whenever the modal is closed.
 */
const PandaDocSigning = props => {
  const {
    maxParticipants = 1,
    currentUser,
    formValues,
    onSigned,
    onSessionCreated,
    primaryWaiverSigned,
    onManageDisableScrolling = noop,
  } = props;
  const intl = useIntl();
  const [sessionUrl, setSessionUrl] = useState(null);
  const [documentId, setDocumentId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [error, setError] = useState(null);
  const isMountedRef = useRef(true);

  const participantCount = getParticipantCount(formValues, maxParticipants);
  const secondaryCount = Math.max(0, participantCount - 1);
  const participantsComplete =
    secondaryCount === 0 || areParticipantFieldsComplete(formValues, participantCount);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleSigned = useCallback(() => {
    setIsModalOpen(false);
    onSigned(true);
  }, [onSigned]);

  // Listen for PandaDoc's completion message only while the iframe is open.
  useEffect(() => {
    if (!isModalOpen) {
      return undefined;
    }

    const handleMessage = event => {
      if (!isPandaDocOrigin(event.origin)) {
        return;
      }
      const data = event?.data;
      if (!data || typeof data !== 'object') {
        return;
      }
      const type = data.type || data.event;
      if (type === PANDADOC_COMPLETED_EVENT) {
        handleSigned();
      } else if (type === PANDADOC_EXCEPTION_EVENT) {
        setError(intl.formatMessage({ id: 'PandaDocSigning.signingError' }));
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [isModalOpen, handleSigned, intl]);

  // Fallback: ask the server whether the document was completed. Covers a
  // missed postMessage (tab backgrounded, modal closed right after signing).
  const checkStatus = useCallback(() => {
    if (!documentId) {
      return Promise.resolve(false);
    }
    setCheckingStatus(true);
    return getPrimaryWaiverStatus({ documentId })
      .then(response => {
        if (response?.signed && isMountedRef.current) {
          handleSigned();
          return true;
        }
        return false;
      })
      .catch(() => false)
      .finally(() => {
        if (isMountedRef.current) {
          setCheckingStatus(false);
        }
      });
  }, [documentId, handleSigned]);

  const handleModalClose = () => {
    setIsModalOpen(false);
    checkStatus();
  };

  const openSigning = () => {
    if (!participantsComplete || primaryWaiverSigned) {
      return;
    }

    // Reuse the existing session if the user closed the modal and came back,
    // so we don't create a duplicate document for the same renter.
    if (sessionUrl) {
      setError(null);
      setIsModalOpen(true);
      return;
    }

    setLoading(true);
    setError(null);

    const primaryUser = getPrimaryUserFromCurrentUser(currentUser);
    const secondaries = parseSecondaryParticipantsFromForm(formValues, secondaryCount);

    createPrimaryWaiverSession({
      primaryUser,
      secondaries,
      seats: participantCount,
    })
      .then(response => {
        if (!response?.enabled || !response?.sessionUrl) {
          throw new Error(intl.formatMessage({ id: 'PandaDocSigning.error' }));
        }
        if (!isMountedRef.current) {
          return;
        }
        setDocumentId(response.documentId);
        onSessionCreated(response.documentId);
        setSessionUrl(response.sessionUrl);
        setIsModalOpen(true);
      })
      .catch(e => {
        if (isMountedRef.current) {
          setError(e?.message || intl.formatMessage({ id: 'PandaDocSigning.error' }));
        }
      })
      .finally(() => {
        if (isMountedRef.current) {
          setLoading(false);
        }
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

  const busy = loading || checkingStatus;

  return (
    <div className={css.root}>
      <Heading as="h3" rootClassName={css.heading}>
        <FormattedMessage id="PandaDocSigning.title" />
      </Heading>
      <p className={css.info}>
        <FormattedMessage id="PandaDocSigning.info" />
      </p>

      <div className={css.actions}>
        <PrimaryButton
          type="button"
          className={css.startButton}
          inProgress={loading}
          disabled={!participantsComplete || busy}
          onClick={openSigning}
        >
          <FormattedMessage
            id={sessionUrl ? 'PandaDocSigning.continueButton' : 'PandaDocSigning.startButton'}
          />
        </PrimaryButton>

        {sessionUrl ? (
          <SecondaryButton
            type="button"
            className={css.checkStatusButton}
            inProgress={checkingStatus}
            disabled={busy}
            onClick={checkStatus}
          >
            <FormattedMessage id="PandaDocSigning.checkStatusButton" />
          </SecondaryButton>
        ) : null}
      </div>

      {sessionUrl && !isModalOpen ? (
        <p className={css.pendingMessage}>
          <FormattedMessage id="PandaDocSigning.pendingMessage" />
        </p>
      ) : null}

      {loading ? (
        <p className={css.loading}>
          <IconSpinner />
        </p>
      ) : null}

      {error ? <p className={css.error}>{error}</p> : null}

      <Modal
        id={MODAL_ID}
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onManageDisableScrolling={onManageDisableScrolling}
        usePortal
        containerClassName={css.modalContainer}
        contentClassName={css.modalContent}
        closeButtonMessage={intl.formatMessage({ id: 'PandaDocSigning.closeButton' })}
      >
        {sessionUrl ? (
          <iframe
            title={intl.formatMessage({ id: 'PandaDocSigning.iframeTitle' })}
            src={sessionUrl}
            className={css.iframe}
          />
        ) : null}
      </Modal>
    </div>
  );
};

export default PandaDocSigning;
