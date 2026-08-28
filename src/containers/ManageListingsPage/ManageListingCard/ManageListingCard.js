import React from 'react';
import classNames from 'classnames';

import { useConfiguration } from '../../../context/configurationContext';
import { useIntl, FormattedMessage } from '../../../util/reactIntl';
import {
  LISTING_STATE_DRAFT,
  LISTING_STATE_PENDING_APPROVAL,
  LISTING_STATE_CLOSED,
  LISTING_STATE_PUBLISHED,
  STOCK_MULTIPLE_ITEMS,
  propTypes,
} from '../../../util/types';
import { ensureOwnListing } from '../../../util/data';
import { displayPrice, isPriceVariationsEnabled, requireListingImage } from '../../../util/configHelpers';
import { formatMoney } from '../../../util/currency';
import {
  LISTING_PAGE_DRAFT_VARIANT,
  LISTING_PAGE_PENDING_APPROVAL_VARIANT,
  LISTING_PAGE_PARAM_TYPE_DRAFT,
  LISTING_PAGE_PARAM_TYPE_EDIT,
  createSlug,
} from '../../../util/urlHelpers';
import { isBookingProcessAlias, isPurchaseProcessAlias } from '../../../transactions/transaction';
import { listingTypeLabel } from '../../../util/hakoListingTypes';

import {
  NamedLink,
  IconSpinner,
  ResponsiveImage,
  AspectRatioWrapper,
} from '../../../components';

import Overlay from './Overlay';
import css from './ManageListingCard.module.css';

const getStatusMeta = state => {
  if (state === LISTING_STATE_PUBLISHED) {
    return { labelId: 'ManageListingCard.statusActive', labelDefault: 'Active', tone: 'active' };
  }
  if (state === LISTING_STATE_DRAFT) {
    return { labelId: 'ManageListingCard.statusDraft', labelDefault: 'Draft', tone: 'draft' };
  }
  if (state === LISTING_STATE_CLOSED) {
    return { labelId: 'ManageListingCard.statusPaused', labelDefault: 'Paused', tone: 'paused' };
  }
  if (state === LISTING_STATE_PENDING_APPROVAL) {
    return {
      labelId: 'ManageListingCard.statusPending',
      labelDefault: 'Pending',
      tone: 'pending',
    };
  }
  return { labelId: 'ManageListingCard.statusDraft', labelDefault: state, tone: 'draft' };
};

const formatPriceLabel = (price, publicData, listingTypeConfig, isBookable, intl, currency) => {
  if (!displayPrice(listingTypeConfig) || !price) {
    return null;
  }
  if (price.currency !== currency) {
    return `(${price.currency})`;
  }
  try {
    const formatted = formatMoney(intl, price);
    const isPriceVariationsInUse = isPriceVariationsEnabled(publicData, listingTypeConfig);
    const hasMultiple = isPriceVariationsInUse && publicData?.priceVariants?.length > 1;
    // Figma: "$200/day"
    const perUnit = isBookable && publicData?.unitType ? `/${publicData.unitType}` : '';
    const prefix = hasMultiple
      ? `${intl.formatMessage({
          id: 'ManageListingCard.priceStartingFromShort',
          defaultMessage: 'From',
        })} `
      : '';
    return `${prefix}${formatted}${perUnit}`;
  } catch (e) {
    return null;
  }
};

/**
 * Hako Manage listing card — status badge, stats, dual action buttons.
 */
export const ManageListingCard = props => {
  const config = useConfiguration();
  const intl = props.intl || useIntl();
  const {
    className,
    rootClassName,
    hasClosingError,
    hasDiscardingError,
    hasOpeningError,
    actionsInProgressListingId,
    listing,
    renderSizes,
    onCloseListing,
    onOpenListing,
    onDiscardDraft,
  } = props;

  const classes = classNames(rootClassName || css.root, className);
  const currentListing = ensureOwnListing(listing);
  const id = currentListing.id.uuid;
  const { title = '', state, publicData, price } = currentListing.attributes || {};
  const slug = createSlug(title);
  const isDraft = state === LISTING_STATE_DRAFT;
  const isClosed = state === LISTING_STATE_CLOSED;
  const isPublished = state === LISTING_STATE_PUBLISHED;
  const isPending = state === LISTING_STATE_PENDING_APPROVAL;

  const { listingType, transactionProcessAlias } = publicData || {};
  const listingTypeConfig = (config.listing.listingTypes || []).find(
    conf => conf.listingType === listingType
  );
  const isBookable = isBookingProcessAlias(transactionProcessAlias);
  const isProductOrder = isPurchaseProcessAlias(transactionProcessAlias);
  const hasStockManagement =
    isProductOrder && listingTypeConfig?.stockType === STOCK_MULTIPLE_ITEMS;

  const editListingLinkType = isDraft
    ? LISTING_PAGE_PARAM_TYPE_DRAFT
    : LISTING_PAGE_PARAM_TYPE_EDIT;

  const status = getStatusMeta(state);
  const priceLabel = formatPriceLabel(
    price,
    publicData,
    listingTypeConfig,
    isBookable,
    intl,
    config.currency
  );

  const showListingImage = requireListingImage(listingTypeConfig);
  const firstImage = currentListing.images?.[0] || null;
  const {
    aspectWidth = 1,
    aspectHeight = 1,
    variantPrefix = 'listing-card',
  } = config.layout.listingImage;
  const variants = firstImage
    ? Object.keys(firstImage?.attributes?.variants || {}).filter(k => k.startsWith(variantPrefix))
    : [];

  // Real values only — these used to fall back to invented figures (150 views,
  // 5 bookings, $2k earned) for every published listing. A stat is hidden until
  // the marketplace actually supplies it.
  const metadata = currentListing?.attributes?.metadata || {};
  const views = metadata.views ?? publicData?.views ?? null;
  const bookings = metadata.bookings ?? publicData?.bookings ?? null;
  const earned = metadata.earned ?? publicData?.earned ?? null;
  const hasStats = views != null || bookings != null || earned != null;

  // Spelled-out listing type so providers can tell day parking from monthly
  // storage at a glance (Console labels are abbreviated, e.g. "pr hour").
  const listingTypeName = listingTypeLabel(listingType, listingTypeConfig?.label);

  const hasError = hasOpeningError || hasClosingError || hasDiscardingError;
  const thisListingInProgress =
    actionsInProgressListingId && actionsInProgressListingId.uuid === id;

  const imageLinkProps =
    isDraft || isPending
      ? {
          name: 'ListingPageVariant',
          params: {
            id,
            slug,
            variant: isDraft ? LISTING_PAGE_DRAFT_VARIANT : LISTING_PAGE_PENDING_APPROVAL_VARIANT,
          },
        }
      : { name: 'ListingPage', params: { id, slug } };

  return (
    <article className={classes}>
      <div className={css.imageWrap}>
        <NamedLink className={css.imageLink} {...imageLinkProps} tabIndex={-1} aria-hidden="true">
          {showListingImage && firstImage ? (
            <AspectRatioWrapper width={aspectWidth} height={aspectHeight} className={css.aspect}>
              <ResponsiveImage
                rootClassName={css.image}
                alt={title}
                image={firstImage}
                variants={variants}
                sizes={renderSizes}
              />
            </AspectRatioWrapper>
          ) : (
            <div className={css.imagePlaceholder} aria-hidden="true" />
          )}
        </NamedLink>
        <span className={classNames(css.badge, css[`badge_${status.tone}`])}>
          {status.tone === 'active' ? <span className={css.badgeDot} aria-hidden="true" /> : null}
          <FormattedMessage id={status.labelId} defaultMessage={status.labelDefault} />
        </span>

        {thisListingInProgress ? (
          <Overlay>
            <IconSpinner />
          </Overlay>
        ) : hasError ? (
          <Overlay errorMessage={intl.formatMessage({ id: 'ManageListingCard.actionFailed' })} />
        ) : null}
      </div>

      <div className={css.info}>
        <div className={css.titleRow}>
          <NamedLink className={css.title} {...imageLinkProps}>
            {title}
          </NamedLink>
          {priceLabel ? <p className={css.price}>{priceLabel}</p> : null}
        </div>

        {listingTypeName ? (
          <p className={css.listingTypeLabel}>{listingTypeName}</p>
        ) : null}

        {isPublished && hasStats ? (
          <div className={css.metaRow}>
            <div className={css.stats}>
              {views != null ? (
                <div className={css.stat}>
                  <span className={css.statLabel}>
                    <FormattedMessage id="ManageListingCard.views" defaultMessage="Views" />
                  </span>
                  <span className={css.statValue}>{views}</span>
                </div>
              ) : null}
              {bookings != null ? (
                <div className={css.stat}>
                  <span className={css.statLabel}>
                    <FormattedMessage id="ManageListingCard.bookings" defaultMessage="Bookings" />
                  </span>
                  <span className={css.statValue}>{bookings}</span>
                </div>
              ) : null}
              {earned != null ? (
                <div className={css.stat}>
                  <span className={css.statLabel}>
                    <FormattedMessage id="ManageListingCard.earned" defaultMessage="Earned" />
                  </span>
                  <span className={css.statValue}>{earned}</span>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className={css.draftSpacer} aria-hidden="true" />
        )}

        <div className={css.actions}>
          {isDraft ? (
            <>
              <NamedLink
                className={classNames(css.actionBtn, css.actionPrimary)}
                name="EditListingPage"
                params={{ id, slug, type: editListingLinkType, tab: 'photos' }}
              >
                <FormattedMessage
                  id="ManageListingCard.finishListingDraft"
                  defaultMessage="Finish Listing"
                />
              </NamedLink>
              <button
                type="button"
                id={`discardButton_${id}`}
                className={classNames(css.actionBtn, css.actionOutline)}
                onClick={() => onDiscardDraft(currentListing.id)}
              >
                <FormattedMessage id="ManageListingCard.discard" defaultMessage="Discard" />
              </button>
            </>
          ) : isClosed ? (
            <>
              <button
                type="button"
                className={classNames(css.actionBtn, css.actionPrimary)}
                onClick={() => onOpenListing(currentListing.id)}
              >
                <FormattedMessage id="ManageListingCard.openListing" defaultMessage="Open listing" />
              </button>
              <NamedLink
                className={classNames(css.actionBtn, css.actionOutline)}
                name="EditListingPage"
                params={{ id, slug, type: editListingLinkType, tab: 'details' }}
              >
                <FormattedMessage id="ManageListingCard.editListingShort" defaultMessage="Edit" />
              </NamedLink>
            </>
          ) : (
            <>
              <NamedLink
                className={classNames(css.actionBtn, css.actionOutline)}
                name="EditListingPage"
                params={{ id, slug, type: editListingLinkType, tab: 'details' }}
              >
                <FormattedMessage id="ManageListingCard.editListingShort" defaultMessage="Edit" />
              </NamedLink>
              {isBookable ? (
                <NamedLink
                  className={classNames(css.actionBtn, css.actionOutline)}
                  name="EditListingPage"
                  params={{ id, slug, type: editListingLinkType, tab: 'availability' }}
                >
                  <FormattedMessage
                    id="ManageListingCard.availabilityShort"
                    defaultMessage="Availability"
                  />
                </NamedLink>
              ) : hasStockManagement ? (
                <NamedLink
                  className={classNames(css.actionBtn, css.actionOutline)}
                  name="EditListingPage"
                  params={{ id, slug, type: editListingLinkType, tab: 'pricing-and-stock' }}
                >
                  <FormattedMessage id="ManageListingCard.manageStockShort" defaultMessage="Stock" />
                </NamedLink>
              ) : (
                <button
                  type="button"
                  className={classNames(css.actionBtn, css.actionOutline)}
                  onClick={() => onCloseListing(currentListing.id)}
                >
                  <FormattedMessage id="ManageListingCard.pauseListing" defaultMessage="Pause" />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </article>
  );
};

ManageListingCard.propTypes = {
  listing: propTypes.ownListing.isRequired,
};

export default ManageListingCard;
