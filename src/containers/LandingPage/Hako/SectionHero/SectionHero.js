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

/**
 * Homepage hero — Figma node 6:37
 * Location is editable via LocationAutocompleteInput.
 * Hours field is hidden for monthly storage.
 */
export const SectionHero = props => {
  const {
    onSearch,
    locationLabel = 'San Francisco',
    dateLabel = 'April 18',
    hoursLabel = '3 hours',
    className,
  } = props;

  const intl = useIntl();
  const [mode, setMode] = useState(MODE_DAY);

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
      dateLabel: values?.date || dateLabel,
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
            date: dateLabel,
            hours: hoursLabel,
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
                <div className={css.field}>
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
                          className={classNames(css.fieldValueInput, css.fieldValueBold)}
                          aria-label={intl.formatMessage({
                            id: 'HakoLanding.hero.date',
                            defaultMessage: 'Date',
                          })}
                        />
                      )}
                    />
                  </div>
                </div>
                {mode === MODE_DAY ? (
                  <>
                    <div className={css.divider} aria-hidden="true" />
                    <div className={classNames(css.field, css.hoursField)}>
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
                            <input
                              {...input}
                              className={classNames(css.fieldValueInput, css.fieldValueBold)}
                              aria-label={intl.formatMessage({
                                id: 'HakoLanding.hero.hours',
                                defaultMessage: 'Hours',
                              })}
                            />
                          )}
                        />
                      </div>
                    </div>
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
