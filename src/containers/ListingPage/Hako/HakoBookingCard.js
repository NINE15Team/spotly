import React from 'react';
import classNames from 'classnames';

import { FormattedMessage } from '../../../util/reactIntl';
import { HAKO_ASSETS } from '../../LandingPage/Hako/assets';

import css from './HakoBookingCard.module.css';

// Placeholder booking data from the Figma booking card. The panel is presentational until the
// real availability + pricing flow is wired back in.
const BOOKING_PREVIEW = {
  price: '$4',
  priceUnit: '/hr',
  rating: '4.9',
  date: 'April 18, 2026',
  duration: '3 hours',
  startTimes: [
    { label: '9:00 AM' },
    { label: '10:00 AM' },
    { label: '11:00 AM', selected: true },
    { label: '12:00 PM' },
    { label: '9:00 AM' },
    { label: '10:00 AM' },
    { label: '11:00 AM' },
    { label: '12:00 PM' },
  ],
  lineItems: [
    { label: '$4.00 × 3 hours', value: '$12.00' },
    { labelId: 'HakoBooking.serviceFee', labelDefault: 'Service Fee', value: '$1.80' },
  ],
  total: '$13.80',
};

/**
 * Static booking card for the Hako listing details page.
 * Mirrors the Figma booking panel; values are placeholders and nothing is submitted yet.
 */
export const HakoBookingCard = props => {
  const { className } = props;

  return (
    <section className={classNames(css.root, className)} aria-label="Booking summary">
      <div className={css.header}>
        <p className={css.price}>
          {BOOKING_PREVIEW.price}
          <span className={css.priceUnit}>{BOOKING_PREVIEW.priceUnit}</span>
        </p>
        <div className={css.rating}>
          <span className={css.stars} aria-hidden="true">
            {[0, 1, 2, 3, 4].map(i => (
              <img key={i} src={HAKO_ASSETS.star} alt="" width={14} height={14} />
            ))}
          </span>
          <span className={css.ratingValue}>{BOOKING_PREVIEW.rating}</span>
        </div>
      </div>

      <div className={css.fields}>
        <div className={css.field}>
          <span className={css.fieldLabel}>
            <FormattedMessage id="HakoBooking.dateLabel" defaultMessage="Date" />
          </span>
          <p className={css.fieldValue}>{BOOKING_PREVIEW.date}</p>
        </div>
        <div className={css.field}>
          <span className={css.fieldLabel}>
            <FormattedMessage id="HakoBooking.durationLabel" defaultMessage="Duration" />
          </span>
          <p className={css.fieldValue}>{BOOKING_PREVIEW.duration}</p>
        </div>
      </div>

      <p className={css.sectionLabel} id="hako-booking-start-time">
        <FormattedMessage id="HakoBooking.startTimeLabel" defaultMessage="Start time" />
      </p>
      <ul className={css.timeSlots} aria-labelledby="hako-booking-start-time">
        {BOOKING_PREVIEW.startTimes.map((slot, index) => (
          <li
            key={`${slot.label}-${index}`}
            className={classNames(css.timeSlot, {
              [css.timeSlotSelected]: slot.selected,
            })}
            aria-current={slot.selected ? 'true' : undefined}
          >
            {slot.label}
          </li>
        ))}
      </ul>

      <hr className={css.divider} />

      {BOOKING_PREVIEW.lineItems.map(item => (
        <p className={css.lineItem} key={item.labelId || item.label}>
          <span>
            {item.labelId ? (
              <FormattedMessage id={item.labelId} defaultMessage={item.labelDefault} />
            ) : (
              item.label
            )}
          </span>
          <span>{item.value}</span>
        </p>
      ))}

      <button type="button" className={css.reserveButton}>
        <FormattedMessage
          id="HakoBooking.reserve"
          defaultMessage="Reserve {total}"
          values={{ total: <span className={css.reserveTotal}>{BOOKING_PREVIEW.total}</span> }}
        />
      </button>
      <p className={css.note}>
        <FormattedMessage
          id="HakoBooking.notChargedYet"
          defaultMessage="You won't be charged yet"
        />
      </p>
    </section>
  );
};

export default HakoBookingCard;
