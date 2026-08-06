import React from 'react';
import classNames from 'classnames';
import { FormattedMessage } from '../../../util/reactIntl';

import css from './HakoPriceByToggle.module.css';

/**
 * Hour / Day price unit toggle matching Figma Search Results sidebar.
 *
 * @param {Object} props
 * @param {'hour'|'day'} [props.value]
 * @param {Function} [props.onChange]
 * @param {string} [props.className]
 */
export const HakoPriceByToggle = props => {
  const { value = 'hour', onChange, className } = props;

  const setValue = next => {
    if (typeof onChange === 'function' && next !== value) {
      onChange(next);
    }
  };

  return (
    <div className={classNames(css.root, className)}>
      <p className={css.label}>
        <FormattedMessage id="HakoPriceByToggle.label" defaultMessage="Price by" />
      </p>
      <div className={css.toggle} role="group" aria-label="Price by">
        <button
          type="button"
          className={classNames(css.option, { [css.optionActive]: value === 'hour' })}
          aria-pressed={value === 'hour'}
          onClick={() => setValue('hour')}
        >
          <FormattedMessage id="HakoPriceByToggle.hour" defaultMessage="Hour" />
        </button>
        <button
          type="button"
          className={classNames(css.option, { [css.optionActive]: value === 'day' })}
          aria-pressed={value === 'day'}
          onClick={() => setValue('day')}
        >
          <FormattedMessage id="HakoPriceByToggle.day" defaultMessage="Day" />
        </button>
      </div>
    </div>
  );
};

export default HakoPriceByToggle;
