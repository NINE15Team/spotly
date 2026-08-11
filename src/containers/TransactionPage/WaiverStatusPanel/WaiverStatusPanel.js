import React, { useEffect, useState } from 'react';
import classNames from 'classnames';
import { Form as FinalForm } from 'react-final-form';
import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import * as validators from '../../../util/validators';
import { swapParticipant, refreshWaiverStatus } from '../../../util/api';
import { FieldTextInput, PrimaryButton, SecondaryButton } from '../../../components';

import css from './WaiverStatusPanel.module.css';

const WAIVER_STATUS_SIGNED = 'signed';

/**
 * Shows waiver signing status for all participants on a transaction (booking or
 * subscription). Re-syncs from PandaDoc on load (missed-webhook fallback) and
 * lets the customer swap a still-pending secondary participant.
 */
const WaiverStatusPanel = props => {
  const { participants, transactionId, isCustomer, onParticipantUpdated } = props;
  const intl = useIntl();
  const [editingIndex, setEditingIndex] = useState(null);
  const [swapInProgress, setSwapInProgress] = useState(false);
  const [swapError, setSwapError] = useState(null);
  // Statuses re-synced from PandaDoc on load; falls back to the props.
  const [syncedParticipants, setSyncedParticipants] = useState(null);

  const hasPending = participants?.some(p => p.waiver_status !== WAIVER_STATUS_SIGNED);
  const txId = transactionId?.uuid;

  // Fallback for missed/rejected PandaDoc webhooks: whenever this panel is
  // shown with a pending participant, re-check the documents against PandaDoc
  // and render the corrected statuses. No-op server-side when nothing changed.
  useEffect(() => {
    if (!txId || !hasPending) {
      return undefined;
    }

    let cancelled = false;

    refreshWaiverStatus({ transactionId })
      .then(result => {
        if (!cancelled && result?.participants?.length) {
          setSyncedParticipants(result.participants);
        }
      })
      .catch(() => {
        // Non-critical: keep showing the stored statuses.
      });

    return () => {
      cancelled = true;
    };
    // Keyed on the transaction id and whether anything is still pending, so this
    // re-checks once per transaction rather than on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txId, hasPending]);

  const participantList = syncedParticipants || participants;

  if (!participantList?.length) {
    return null;
  }

  const handleSwap = values => {
    setSwapInProgress(true);
    setSwapError(null);

    return swapParticipant({
      transactionId,
      participantIndex: editingIndex,
      name: values.name,
      email: values.email,
    })
      .then(() => {
        setEditingIndex(null);
        if (onParticipantUpdated) {
          onParticipantUpdated();
        }
      })
      .catch(e => {
        setSwapError(e?.message || intl.formatMessage({ id: 'WaiverStatusPanel.swapError' }));
      })
      .finally(() => {
        setSwapInProgress(false);
      });
  };

  return (
    <div className={css.root}>
      <h3 className={css.title}>
        <FormattedMessage id="WaiverStatusPanel.title" />
      </h3>
      <ul className={css.list}>
        {participantList.map((participant, index) => {
          const isSigned = participant.waiver_status === WAIVER_STATUS_SIGNED;
          const isPending = !isSigned;
          const showUpdate = isCustomer && isPending && participant.role === 'secondary';

          return (
            <li key={`${participant.email}-${index}`} className={css.item}>
              <div className={css.itemMain}>
                <span className={css.name}>{participant.name}</span>
                <span className={css.email}>{participant.email}</span>
                <span
                  className={classNames(css.badge, {
                    [css.badgeSigned]: isSigned,
                    [css.badgePending]: isPending,
                  })}
                >
                  {isSigned ? (
                    <FormattedMessage id="WaiverStatusPanel.statusSigned" />
                  ) : (
                    <FormattedMessage id="WaiverStatusPanel.statusPending" />
                  )}
                </span>
              </div>

              {showUpdate && editingIndex !== index ? (
                <SecondaryButton
                  type="button"
                  className={css.updateButton}
                  onClick={() => setEditingIndex(index)}
                >
                  <FormattedMessage id="WaiverStatusPanel.updateParticipant" />
                </SecondaryButton>
              ) : null}

              {editingIndex === index ? (
                <FinalForm
                  onSubmit={handleSwap}
                  initialValues={{ name: participant.name, email: participant.email }}
                  render={({ handleSubmit, invalid }) => (
                    <form className={css.swapForm} onSubmit={handleSubmit}>
                      <FieldTextInput
                        id={`swap-name-${index}`}
                        name="name"
                        type="text"
                        label={intl.formatMessage({ id: 'WaiverStatusPanel.nameLabel' })}
                        validate={validators.required(
                          intl.formatMessage({ id: 'WaiverStatusPanel.nameRequired' })
                        )}
                      />
                      <FieldTextInput
                        id={`swap-email-${index}`}
                        name="email"
                        type="email"
                        label={intl.formatMessage({ id: 'WaiverStatusPanel.emailLabel' })}
                        validate={validators.composeValidators(
                          validators.required(
                            intl.formatMessage({ id: 'WaiverStatusPanel.emailRequired' })
                          ),
                          validators.emailFormatValid(
                            intl.formatMessage({ id: 'WaiverStatusPanel.emailInvalid' })
                          )
                        )}
                      />
                      <div className={css.swapActions}>
                        <PrimaryButton type="submit" inProgress={swapInProgress} disabled={invalid}>
                          <FormattedMessage id="WaiverStatusPanel.saveParticipant" />
                        </PrimaryButton>
                        <SecondaryButton type="button" onClick={() => setEditingIndex(null)}>
                          <FormattedMessage id="WaiverStatusPanel.cancel" />
                        </SecondaryButton>
                      </div>
                      {swapError ? <p className={css.error}>{swapError}</p> : null}
                    </form>
                  )}
                />
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default WaiverStatusPanel;
