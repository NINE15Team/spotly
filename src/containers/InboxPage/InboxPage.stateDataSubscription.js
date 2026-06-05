import {
  TX_TRANSITION_ACTOR_CUSTOMER as CUSTOMER,
  TX_TRANSITION_ACTOR_PROVIDER as PROVIDER,
  CONDITIONAL_RESOLVER_WILDCARD,
  ConditionalResolver,
} from '../../transactions/transaction';

export const getStateDataForSubscriptionProcess = (txInfo, processInfo) => {
  const { transactionRole } = txInfo;
  const { processName, processState, states } = processInfo;
  const _ = CONDITIONAL_RESOLVER_WILDCARD;

  return new ConditionalResolver([processState, transactionRole])
    .cond([states.PENDING_PAYMENT, CUSTOMER], () => ({
      processName,
      processState,
      actionNeeded: true,
    }))
    .cond([states.PAYMENT_OVERDUE, CUSTOMER], () => ({
      processName,
      processState,
      actionNeeded: true,
    }))
    .cond([states.PAYMENT_CONFIRMED, CUSTOMER], () => ({
      processName,
      processState,
      actionNeeded: true,
    }))
    .cond([states.PAYMENT_EXPIRED, _], () => ({
      processName,
      processState,
      isFinal: true,
    }))
    .cond([states.CANCELLED, _], () => ({
      processName,
      processState,
      isFinal: true,
    }))
    .cond([states.EXPIRED, _], () => ({
      processName,
      processState,
      isFinal: true,
    }))
    .cond([states.ACTIVE, _], () => ({
      processName,
      processState,
    }))
    .default(() => ({
      processName,
      processState,
    }))
    .resolve();
};
