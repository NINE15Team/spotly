import React, { useState } from 'react';
import classNames from 'classnames';
import { Form as FinalForm, Field } from 'react-final-form';

import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import { Form, PrimaryButton } from '../../../components';
import { HAKO_ASSETS } from '../../LandingPage/Hako/assets';

import css from './HakoSearchBar.module.css';

/**
 * Top search/filter bar matching Figma Search Results (172:1144).
 * Fields: parking option, location, date, duration + Update CTA.
 */
export const HakoSearchBar = props => {
  const { className, initialValues = {}, onSubmit } = props;
  const intl = useIntl();
  const [optionOpen, setOptionOpen] = useState(false);

  const handleSubmit = values => {
    if (typeof onSubmit === 'function') {
      onSubmit(values);
    }
  };

  return (
    <section className={classNames(css.root, className)} aria-label="Search filters">
      <FinalForm
        initialValues={{
          parkingOption: initialValues.parkingOption || 'day-parking',
          location: initialValues.location || '',
          date: initialValues.date || '',
          duration: initialValues.duration || '',
        }}
        onSubmit={handleSubmit}
        render={({ handleSubmit: submit, values, form }) => (
          <Form className={css.form} onSubmit={submit}>
            <div className={css.fieldWrap}>
              <button
                type="button"
                className={css.field}
                aria-expanded={optionOpen}
                aria-haspopup="listbox"
                onClick={() => setOptionOpen(open => !open)}
              >
                <span className={css.fieldText}>
                  {values.parkingOption === 'monthly-storage'
                    ? intl.formatMessage({
                        id: 'HakoSearchBar.monthlyStorage',
                        defaultMessage: 'Monthly Storage',
                      })
                    : values.parkingOption === 'day-parking'
                    ? intl.formatMessage({
                        id: 'HakoSearchBar.dayParking',
                        defaultMessage: 'Day Parking',
                      })
                    : intl.formatMessage({
                        id: 'HakoSearchBar.chooseOption',
                        defaultMessage: 'Choose a parking option',
                      })}
                </span>
                <span className={css.chevron} aria-hidden="true">
                  ▾
                </span>
              </button>
              {optionOpen ? (
                <ul className={css.dropdown} role="listbox">
                  <li>
                    <button
                      type="button"
                      className={css.dropdownItem}
                      onClick={() => {
                        form.change('parkingOption', 'day-parking');
                        setOptionOpen(false);
                      }}
                    >
                      <FormattedMessage
                        id="HakoSearchBar.dayParking"
                        defaultMessage="Day Parking"
                      />
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      className={css.dropdownItem}
                      onClick={() => {
                        form.change('parkingOption', 'monthly-storage');
                        setOptionOpen(false);
                      }}
                    >
                      <FormattedMessage
                        id="HakoSearchBar.monthlyStorage"
                        defaultMessage="Monthly Storage"
                      />
                    </button>
                  </li>
                </ul>
              ) : null}
              <Field name="parkingOption" component="input" type="hidden" />
            </div>

            <label className={css.field}>
              <img
                className={css.icon}
                src={HAKO_ASSETS.location}
                alt=""
                width={20}
                height={20}
              />
              <Field
                name="location"
                render={({ input }) => (
                  <input
                    {...input}
                    className={css.input}
                    placeholder={intl.formatMessage({
                      id: 'HakoSearchBar.locationPlaceholder',
                      defaultMessage: 'Any city/region',
                    })}
                    aria-label={intl.formatMessage({
                      id: 'HakoSearchBar.location',
                      defaultMessage: 'Location',
                    })}
                  />
                )}
              />
            </label>

            <label className={css.field}>
              <img
                className={css.icon}
                src={HAKO_ASSETS.calendar}
                alt=""
                width={20}
                height={20}
              />
              <Field
                name="date"
                render={({ input }) => (
                  <input
                    {...input}
                    className={css.input}
                    placeholder={intl.formatMessage({
                      id: 'HakoSearchBar.datePlaceholder',
                      defaultMessage: 'Date',
                    })}
                    aria-label={intl.formatMessage({
                      id: 'HakoSearchBar.date',
                      defaultMessage: 'Date',
                    })}
                  />
                )}
              />
            </label>

            <label className={css.field}>
              <img
                className={css.icon}
                src={HAKO_ASSETS.schedule}
                alt=""
                width={20}
                height={20}
              />
              <Field
                name="duration"
                render={({ input }) => (
                  <input
                    {...input}
                    className={css.input}
                    placeholder={intl.formatMessage({
                      id: 'HakoSearchBar.durationPlaceholder',
                      defaultMessage: 'Duration',
                    })}
                    aria-label={intl.formatMessage({
                      id: 'HakoSearchBar.duration',
                      defaultMessage: 'Duration',
                    })}
                  />
                )}
              />
            </label>

            <PrimaryButton className={css.submit} type="submit">
              <span className={css.submitDesktop}>
                <FormattedMessage id="HakoSearchBar.update" defaultMessage="Update" />
              </span>
              <span className={css.submitMobile}>
                <FormattedMessage id="HakoSearchBar.search" defaultMessage="Search" />
              </span>
            </PrimaryButton>
          </Form>
        )}
      />
    </section>
  );
};

export default HakoSearchBar;
