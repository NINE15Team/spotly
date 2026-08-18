import React, { useState } from 'react';
import classNames from 'classnames';
import { Form as FinalForm, Field } from 'react-final-form';

import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import {
  isMonthlyListingType,
  MONTHLY_STORAGE_LISTING_TYPE,
  DAY_PARKING_LISTING_TYPE,
} from '../../../util/hakoListingTypes';
import { Form, PrimaryButton, LocationAutocompleteInput } from '../../../components';
import { HAKO_ASSETS } from '../../LandingPage/Hako/assets';

import css from './HakoSearchBar.module.css';

const identity = v => v;
const HOUR_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

const toISODate = date => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseHoursValue = value => {
  const match = String(value || '').match(/\d+/);
  return match ? match[0] : '';
};

/**
 * Top search/filter bar matching Figma Search Results (172:1144).
 * Date opens a date picker. Duration opens an hours select.
 * Monthly storage keeps a start-date field and hides duration.
 */
export const HakoSearchBar = props => {
  const { className, initialValues = {}, onSubmit } = props;
  const intl = useIntl();
  const [optionOpen, setOptionOpen] = useState(false);
  const todayISO = toISODate(new Date());

  const handleSubmit = values => {
    if (typeof onSubmit === 'function') {
      onSubmit(values);
    }
  };

  const selectParkingOption = (form, parkingOption) => {
    form.change('parkingOption', parkingOption);
    setOptionOpen(false);
    const values = form.getState().values;
    handleSubmit({ ...values, parkingOption });
  };

  return (
    <section className={classNames(css.root, className)} aria-label="Search filters">
      <FinalForm
        enableReinitialize
        initialValues={{
          parkingOption: initialValues.parkingOption || DAY_PARKING_LISTING_TYPE,
          location: initialValues.location || null,
          date: initialValues.date || '',
          duration: parseHoursValue(initialValues.duration),
        }}
        onSubmit={handleSubmit}
        render={({ handleSubmit: submit, values, form }) => {
          const isMonthly = isMonthlyListingType(values.parkingOption);
          const dateLabel = isMonthly
            ? intl.formatMessage({
                id: 'HakoSearchBar.startDate',
                defaultMessage: 'Start date',
              })
            : intl.formatMessage({
                id: 'HakoSearchBar.date',
                defaultMessage: 'Date',
              });
          return (
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
                    {isMonthly
                      ? intl.formatMessage({
                          id: 'HakoSearchBar.monthlyStorage',
                          defaultMessage: 'Monthly Storage',
                        })
                      : values.parkingOption === DAY_PARKING_LISTING_TYPE
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
                        onClick={() => selectParkingOption(form, DAY_PARKING_LISTING_TYPE)}
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
                        onClick={() => selectParkingOption(form, MONTHLY_STORAGE_LISTING_TYPE)}
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

              <div className={classNames(css.field, css.locationField)}>
                <img
                  className={css.icon}
                  src={HAKO_ASSETS.location}
                  alt=""
                  width={20}
                  height={20}
                />
                <Field
                  name="location"
                  format={identity}
                  render={({ input, meta }) => (
                    <LocationAutocompleteInput
                      className={css.locationInputRoot}
                      iconClassName={css.locationIconHidden}
                      inputClassName={css.locationInput}
                      predictionsClassName={css.locationPredictions}
                      placeholder={intl.formatMessage({
                        id: 'HakoSearchBar.locationPlaceholder',
                        defaultMessage: 'Any city/region',
                      })}
                      closeOnBlur
                      input={input}
                      meta={meta}
                      useDarkText
                    />
                  )}
                />
              </div>

              <label className={classNames(css.field, css.selectorField)}>
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
                    <>
                      <input
                        {...input}
                        type="date"
                        min={todayISO}
                        className={classNames(css.input, css.dateInput, {
                          [css.dateInputEmpty]: !input.value,
                        })}
                        aria-label={dateLabel}
                        onClick={event => {
                          if (typeof event.target.showPicker === 'function') {
                            try {
                              event.target.showPicker();
                            } catch (e) {
                              // Some browsers only allow showPicker from a direct user gesture.
                            }
                          }
                        }}
                      />
                      {!input.value ? (
                        <span className={css.datePlaceholder} aria-hidden="true">
                          {dateLabel}
                        </span>
                      ) : null}
                    </>
                  )}
                />
                <span className={css.chevron} aria-hidden="true">
                  ▾
                </span>
              </label>

              {!isMonthly ? (
                <label className={classNames(css.field, css.selectorField)}>
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
                      <select
                        {...input}
                        className={classNames(css.input, css.durationSelect)}
                        aria-label={intl.formatMessage({
                          id: 'HakoSearchBar.duration',
                          defaultMessage: 'Duration',
                        })}
                      >
                        <option value="">
                          {intl.formatMessage({
                            id: 'HakoSearchBar.durationPlaceholder',
                            defaultMessage: 'Duration',
                          })}
                        </option>
                        {HOUR_OPTIONS.map(count => (
                          <option key={count} value={String(count)}>
                            {intl.formatMessage(
                              {
                                id: 'HakoSearchBar.hoursOption',
                                defaultMessage: '{count, plural, one {# hour} other {# hours}}',
                              },
                              { count }
                            )}
                          </option>
                        ))}
                      </select>
                    )}
                  />
                  <span className={css.chevron} aria-hidden="true">
                    ▾
                  </span>
                </label>
              ) : null}

              <PrimaryButton className={css.submit} type="submit">
                <span className={css.submitDesktop}>
                  <FormattedMessage id="HakoSearchBar.update" defaultMessage="Update" />
                </span>
                <span className={css.submitMobile}>
                  <FormattedMessage id="HakoSearchBar.search" defaultMessage="Search" />
                </span>
              </PrimaryButton>
            </Form>
          );
        }}
      />
    </section>
  );
};

export default HakoSearchBar;
