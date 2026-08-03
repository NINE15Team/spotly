import React, { useState } from 'react';
import { func, string } from 'prop-types';
import classNames from 'classnames';
import { FormattedMessage } from '../../../../util/reactIntl';
import { HAKO_ASSETS } from '../assets';

import css from './SectionHero.module.css';

const MODE_DAY = 'day-parking';
const MODE_MONTHLY = 'monthly-storage';

/**
 * Homepage hero — Figma node 6:37
 */
export const SectionHero = props => {
  const {
    onSearch,
    locationLabel = 'San Franciso',
    dateLabel = 'April 18',
    hoursLabel = '3 hours',
    className,
  } = props;

  const [mode, setMode] = useState(MODE_DAY);

  const handleSearch = () => {
    if (typeof onSearch === 'function') {
      onSearch({ mode, locationLabel, dateLabel, hoursLabel });
    }
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

        <div className={css.searchBar}>
          <div className={css.fields}>
            <div className={css.field}>
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
                <span className={css.fieldValue}>{locationLabel}</span>
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
                <span className={classNames(css.fieldValue, css.fieldValueBold)}>{dateLabel}</span>
              </div>
            </div>
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
                <span className={classNames(css.fieldValue, css.fieldValueBold)}>{hoursLabel}</span>
              </div>
            </div>
          </div>
          <button type="button" className={css.searchButton} onClick={handleSearch}>
            <FormattedMessage id="HakoLanding.hero.search" defaultMessage="Search" />
          </button>
        </div>
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
