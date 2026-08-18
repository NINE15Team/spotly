import React, { useState } from 'react';
import { func, string } from 'prop-types';
import classNames from 'classnames';
import { Form as FinalForm, Field } from 'react-final-form';

import { FormattedMessage, useIntl } from '../../../../util/reactIntl';
import {
  DAY_PARKING_LISTING_TYPE,
  MONTHLY_STORAGE_LISTING_TYPE,
} from '../../../../util/hakoListingTypes';
import { LocationAutocompleteInput } from '../../../../components';
import { HAKO_ASSETS } from '../assets';

import css from './SectionHero.module.css';

const MODE_DAY = DAY_PARKING_LISTING_TYPE;
const MODE_MONTHLY = MONTHLY_STORAGE_LISTING_TYPE;
const identity = v => v;
const HOUR_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const DEFAULT_HOURS = 3;

const toISODate = date => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseHoursValue = value => {
  const match = String(value || '').match(/\d+/);
  return match ? match[0] : String(DEFAULT_HOURS);
};

/**
 * Homepage hero — Figma node 6:37
 * Location opens autocomplete. Date opens a date picker. Hours opens a duration select.
 * Hours field is hidden for monthly storage.
 */
export const SectionHero = props => {
  const {
    onSearch,
    locationLabel = 'San Francisco',
    dateLabel,
    hoursLabel = String(DEFAULT_HOURS),
    className,
  } = props;

  const intl = useIntl();
  const [mode, setMode] = useState(MODE_DAY);
  const todayISO = toISODate(new Date());
  const initialDate = dateLabel && /^\d{4}-\d{2}-\d{2}$/.test(dateLabel) ? dateLabel : todayISO;

  const handleSearch = values => {
    if (typeof onSearch !== 'function') {
      return;
    }
    const locationValue = values?.location;
    const selectedPlace = locationValue?.selectedPlace;
    onSearch({
      mode,
      location: locationValue,
      locationLabel: selectedPlace?.address || locationValue?.search || locationLabel,
      dateLabel: values?.date || initialDate,
      hoursLabel: values?.hours || hoursLabel,
      origin: selectedPlace?.origin,
      bounds: selectedPlace?.bounds,
    });
  };

  return (
    <section className={classNames(css.root, className)} aria-label="Hero">
      <div className={css.background} aria-hidden="true">
        <img className={css.backgroundImage} src={HAKO_ASSETS.hero} alt="" />
        <div className={css.overlayDark} />
        <div className={css.overlayMultiply} />
        <div className={css.overlayGradient} />
      </div>

      <h1 className={css.headline}>
        <span className={css.headlineLine}>
          <FormattedMessage id="HakoLanding.hero.line1" defaultMessage="Find parking &" />
        </span>
        <span className={css.headlineLine}>
          <FormattedMessage id="HakoLanding.hero.line2" defaultMessage="storage " />
          <span className={css.accent}>
            <FormattedMessage id="HakoLanding.hero.accent" defaultMessage="near you" />
          </span>
        </span>
      </h1>

      <div className={css.searchBlock}>
        <div className={css.modeTabs} role="group" aria-label="Listing type">
          <button
            type="button"
            className={classNames(css.modeTab, { [css.modeTabActive]: mode === MODE_DAY })}
            aria-pressed={mode === MODE_DAY}
            onClick={() => setMode(MODE_DAY)}
          >
            <FormattedMessage id="HakoLanding.hero.dayParking" defaultMessage="Day Parking" />
          </button>
          <button
            type="button"
            className={classNames(css.modeTab, { [css.modeTabActive]: mode === MODE_MONTHLY })}
            aria-pressed={mode === MODE_MONTHLY}
            onClick={() => setMode(MODE_MONTHLY)}
          >
            <FormattedMessage
              id="HakoLanding.hero.monthlyStorage"
              defaultMessage="Monthly Storage"
            />
          </button>
        </div>

        <FinalForm
          onSubmit={handleSearch}
          initialValues={{
            location: {
              search: locationLabel,
              selectedPlace: { address: locationLabel },
            },
            date: initialDate,
            hours: parseHoursValue(hoursLabel),
          }}
          render={({ handleSubmit }) => (
            <form className={css.searchBar} onSubmit={handleSubmit}>
              <div className={css.fields}>
                <div className={classNames(css.field, css.locationField)}>
                  <img
                    className={css.fieldIcon}
                    src={HAKO_ASSETS.location}
                    alt=""
                    width={20}
                    height={20}
                  />
                  <div className={css.fieldText}>
                    <span className={css.fieldLabel}>
                      <FormattedMessage id="HakoLanding.hero.location" defaultMessage="Location" />
                    </span>
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
                            id: 'HakoLanding.hero.locationPlaceholder',
                            defaultMessage: 'Enter a city or address',
                          })}
                          closeOnBlur
                          input={input}
                          meta={meta}
                          useDarkText
                        />
                      )}
                    />
                  </div>
                </div>
                <div className={css.divider} aria-hidden="true" />
                <label className={classNames(css.field, css.dateField)}>
                  <img
                    className={css.fieldIcon}
                    src={HAKO_ASSETS.calendar}
                    alt=""
                    width={20}
                    height={20}
                  />
                  <div className={css.fieldText}>
                    <span className={css.fieldLabel}>
                      <FormattedMessage id="HakoLanding.hero.date" defaultMessage="Date" />
                    </span>
                    <Field
                      name="date"
                      render={({ input }) => (
                        <input
                          {...input}
                          type="date"
                          min={todayISO}
                          className={classNames(css.fieldValueInput, css.fieldValueBold, css.dateInput)}
                          aria-label={intl.formatMessage({
                            id: 'HakoLanding.hero.date',
                            defaultMessage: 'Date',
                          })}
                        />
                      )}
                    />
                  </div>
                </label>
                {mode === MODE_DAY ? (
                  <>
                    <div className={css.divider} aria-hidden="true" />
                    <label className={classNames(css.field, css.hoursField)}>
                      <img
                        className={css.fieldIcon}
                        src={HAKO_ASSETS.schedule}
                        alt=""
                        width={20}
                        height={20}
                      />
                      <div className={css.fieldText}>
                        <span className={css.fieldLabel}>
                          <FormattedMessage id="HakoLanding.hero.hours" defaultMessage="Hours" />
                        </span>
                        <Field
                          name="hours"
                          render={({ input }) => (
                            <select
                              {...input}
                              className={classNames(
                                css.fieldValueInput,
                                css.fieldValueBold,
                                css.hoursSelect
                              )}
                              aria-label={intl.formatMessage({
                                id: 'HakoLanding.hero.hours',
                                defaultMessage: 'Hours',
                              })}
                            >
                              {HOUR_OPTIONS.map(count => (
                                <option key={count} value={String(count)}>
                                  {intl.formatMessage(
                                    {
                                      id: 'HakoLanding.hero.hoursOption',
                                      defaultMessage:
                                        '{count, plural, one {# hour} other {# hours}}',
                                    },
                                    { count }
                                  )}
                                </option>
                              ))}
                            </select>
                          )}
                        />
                      </div>
                    </label>
                  </>
                ) : null}
              </div>
              <button type="submit" className={css.searchButton}>
                <FormattedMessage id="HakoLanding.hero.search" defaultMessage="Search" />
              </button>
            </form>
          )}
        />
      </div>
    </section>
  );
};

SectionHero.propTypes = {
  onSearch: func,
  locationLabel: string,
  dateLabel: string,
  hoursLabel: string,
  className: string,
};

export default SectionHero;
