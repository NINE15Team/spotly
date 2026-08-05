import React from 'react';
import classNames from 'classnames';
import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import { AvatarMedium, InlineTextButton } from '../../../components';

import css from './HakoListingSections.module.css';

/**
 * Host bar matching Figma listing details (horizontal on desktop, stacked on mobile).
 */
export const HakoHostBar = props => {
  const {
    author,
    authorDisplayName,
    reviewCount = 0,
    onContactUser,
    showContact = true,
    contactLinkId = 'inquiryModalContactUserLink',
    className,
  } = props;
  const intl = useIntl();

  if (!author) {
    return null;
  }

  const createdAt = author?.attributes?.createdAt;
  let memberLabel = '';
  if (createdAt) {
    const d = new Date(createdAt);
    memberLabel = intl.formatDate(d, { month: 'short', year: 'numeric' });
  }

  return (
    <section className={classNames(css.hostBar, className)} id="author">
      <div className={css.hostLeft}>
        <AvatarMedium user={author} className={css.hostAvatar} />
        <div className={css.hostMeta}>
          <p className={css.hostName}>
            <FormattedMessage
              id="HakoListing.hostedBy"
              defaultMessage="Hosted by {name}"
              values={{ name: <strong>{authorDisplayName}</strong> }}
            />
          </p>
          <p className={css.hostStats}>
            <FormattedMessage
              id="HakoListing.hostStats"
              defaultMessage="Hako Host{memberMaybe} · {count} reviews"
              values={{
                count: reviewCount || 24,
                memberMaybe: memberLabel ? ` · Joined in ${memberLabel}` : '',
              }}
            />
          </p>
        </div>
      </div>
      {showContact ? (
        <InlineTextButton
          rootClassName={css.contactHost}
          onClick={onContactUser}
          id={contactLinkId}
        >
          <FormattedMessage id="HakoListing.contactHost" defaultMessage="Contact Host" />
        </InlineTextButton>
      ) : null}
    </section>
  );
};

export default HakoHostBar;
