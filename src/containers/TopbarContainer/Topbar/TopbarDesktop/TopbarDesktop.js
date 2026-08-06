import React, { useState, useEffect } from 'react';
import classNames from 'classnames';

import { FormattedMessage } from '../../../../util/reactIntl';
import { ACCOUNT_SETTINGS_PAGES } from '../../../../routing/routeConfiguration';
import {
  Avatar,
  InlineTextButton,
  Menu,
  MenuLabel,
  MenuContent,
  MenuItem,
  NamedLink,
} from '../../../../components';

import TopbarSearchForm from '../TopbarSearchForm/TopbarSearchForm';
import { HAKO_ASSETS } from '../../../LandingPage/Hako/assets';

import css from './TopbarDesktop.module.css';

const HAKO_NAV_LINKS = [
  {
    id: 'day-parking',
    messageId: 'TopbarDesktop.dayParking',
    defaultMessage: 'Day Parking',
    name: 'SearchPage',
    to: { search: '?pub_listingType=day-parking' },
    match: ({ currentPage }) =>
      currentPage === 'LandingPage' || currentPage === 'SearchPage' || !currentPage,
  },
  {
    id: 'monthly-storage',
    messageId: 'TopbarDesktop.monthlyStorage',
    defaultMessage: 'Monthly Storage',
    name: 'SearchPage',
    to: { search: '?pub_listingType=monthly-storage' },
    match: () => false,
  },
  {
    id: 'post-listing',
    messageId: 'TopbarDesktop.postListing',
    defaultMessage: 'Post a Listing',
    name: 'NewListingPage',
    match: ({ currentPage }) =>
      currentPage === 'NewListingPage' || currentPage === 'EditListingPage',
  },
  {
    id: 'about-us',
    messageId: 'TopbarDesktop.aboutUs',
    defaultMessage: 'About Us',
    name: 'AboutPage',
    match: ({ currentPage }) => currentPage === 'AboutPage',
  },
  {
    id: 'faq',
    messageId: 'TopbarDesktop.faq',
    defaultMessage: 'FAQ',
    name: 'FAQPage',
    match: ({ currentPage }) => currentPage === 'FAQPage',
  },
];

const SignupLink = () => (
  <NamedLink id="signup-link" name="SignupPage" className={css.signupButton}>
    <FormattedMessage id="TopbarDesktop.signup" defaultMessage="Sign Up" />
  </NamedLink>
);

const LoginLink = () => (
  <NamedLink id="login-link" name="LoginPage" className={css.topbarLink}>
    <FormattedMessage id="TopbarDesktop.login" defaultMessage="Log In" />
  </NamedLink>
);

const BecomeAHostLink = () => (
  <NamedLink name="BecomeAHostPage" className={css.topbarLink}>
    <FormattedMessage id="TopbarDesktop.becomeAHost" defaultMessage="Become a Host" />
  </NamedLink>
);

const InboxLink = ({ notificationCount, inboxTab }) => {
  const notificationDot = notificationCount > 0 ? <div className={css.notificationDot} /> : null;
  return (
    <NamedLink
      id="inbox-link"
      className={css.topbarLink}
      name="InboxPage"
      params={{ tab: inboxTab }}
    >
      <span className={css.topbarLinkLabel}>
        <FormattedMessage id="TopbarDesktop.inbox" />
        {notificationDot}
      </span>
    </NamedLink>
  );
};

const ProfileMenu = ({ currentPage, currentUser, onLogout, showManageListingsLink, intl }) => {
  const currentPageClass = page => {
    const isAccountSettingsPage =
      page === 'AccountSettingsPage' && ACCOUNT_SETTINGS_PAGES.includes(currentPage);
    return currentPage === page || isAccountSettingsPage ? css.currentPage : null;
  };

  return (
    <Menu skipFocusOnNavigation={true}>
      <MenuLabel
        id="profile-menu-label"
        className={css.profileMenuLabel}
        isOpenClassName={css.profileMenuIsOpen}
        ariaLabel={intl.formatMessage({ id: 'TopbarDesktop.screenreader.profileMenu' })}
      >
        <Avatar className={css.avatar} user={currentUser} disableProfileLink />
      </MenuLabel>
      <MenuContent className={css.profileMenuContent}>
        {showManageListingsLink ? (
          <MenuItem key="ManageListingsPage">
            <NamedLink
              className={classNames(css.menuLink, currentPageClass('ManageListingsPage'))}
              name="ManageListingsPage"
            >
              <span className={css.menuItemBorder} />
              <FormattedMessage id="TopbarDesktop.yourListingsLink" />
            </NamedLink>
          </MenuItem>
        ) : null}
        <MenuItem key="ProfileSettingsPage">
          <NamedLink
            className={classNames(css.menuLink, currentPageClass('ProfileSettingsPage'))}
            name="ProfileSettingsPage"
          >
            <span className={css.menuItemBorder} />
            <FormattedMessage id="TopbarDesktop.profileSettingsLink" />
          </NamedLink>
        </MenuItem>
        <MenuItem key="AccountSettingsPage">
          <NamedLink
            className={classNames(css.menuLink, currentPageClass('AccountSettingsPage'))}
            name="AccountSettingsPage"
          >
            <span className={css.menuItemBorder} />
            <FormattedMessage id="TopbarDesktop.accountSettingsLink" />
          </NamedLink>
        </MenuItem>
        <MenuItem key="logout">
          <InlineTextButton rootClassName={css.logoutButton} onClick={onLogout}>
            <span className={css.menuItemBorder} />
            <FormattedMessage id="TopbarDesktop.logout" />
          </InlineTextButton>
        </MenuItem>
      </MenuContent>
    </Menu>
  );
};

const HakoLogo = ({ marketplaceName }) => (
  <NamedLink name="LandingPage" className={css.logoLink} id="logo-topbar-desktop">
    <img
      className={css.logoImage}
      src={HAKO_ASSETS.logoMark}
      alt={marketplaceName || 'Hako'}
      width={64}
      height={32}
    />
  </NamedLink>
);

const HakoNavLinks = ({ currentPage }) => (
  <div className={css.navLinks} role="navigation" aria-label="Primary">
    {HAKO_NAV_LINKS.map(link => {
      const isActive = link.match({ currentPage });
      return (
        <NamedLink
          key={link.id}
          name={link.name}
          params={link.params}
          to={link.to}
          className={classNames(css.navLink, { [css.navLinkActive]: isActive })}
        >
          <FormattedMessage id={link.messageId} defaultMessage={link.defaultMessage} />
        </NamedLink>
      );
    })}
  </div>
);

/**
 * Hako desktop topbar — Figma node 263:1925 / 259:1801
 * Layout: Logo | nav links | compact search | Become a Host | Log In | Sign Up
 */
const TopbarDesktop = props => {
  const {
    className,
    config,
    currentUser,
    currentPage,
    rootClassName,
    notificationCount = 0,
    intl,
    isAuthenticated,
    onLogout,
    onSearchSubmit,
    initialSearchFormValues = {},
    showSearchForm,
    showCreateListingsLink,
    inboxTab,
  } = props;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const marketplaceName = config.marketplaceName;
  const authenticatedOnClientSide = mounted && isAuthenticated;
  const isAuthenticatedOrJustHydrated = isAuthenticated || !mounted;
  const classes = classNames(rootClassName || css.root, className);

  const inboxLinkMaybe = authenticatedOnClientSide ? (
    <InboxLink notificationCount={notificationCount} inboxTab={inboxTab} />
  ) : null;

  const profileMenuMaybe = authenticatedOnClientSide ? (
    <ProfileMenu
      currentPage={currentPage}
      currentUser={currentUser}
      onLogout={onLogout}
      showManageListingsLink={showCreateListingsLink}
      intl={intl}
    />
  ) : null;

  const signupLinkMaybe = isAuthenticatedOrJustHydrated ? null : <SignupLink />;
  const loginLinkMaybe = isAuthenticatedOrJustHydrated ? null : <LoginLink />;
  const becomeAHostMaybe = isAuthenticatedOrJustHydrated ? null : <BecomeAHostLink />;

  const searchFormMaybe = showSearchForm ? (
    <TopbarSearchForm
      className={css.searchForm}
      desktopInputRoot={css.searchInputRoot}
      onSubmit={onSearchSubmit}
      initialValues={initialSearchFormValues}
      appConfig={config}
    />
  ) : (
    <div className={css.searchSpacer} />
  );

  return (
    <nav
      className={classes}
      aria-label={intl.formatMessage({ id: 'TopbarDesktop.screenreader.topbarNavigation' })}
    >
      <div className={css.left}>
        <HakoLogo marketplaceName={marketplaceName} />
        <HakoNavLinks currentPage={currentPage} />
      </div>

      {searchFormMaybe}

      <div className={css.right}>
        {becomeAHostMaybe}
        {inboxLinkMaybe}
        {profileMenuMaybe}
        {loginLinkMaybe}
        {signupLinkMaybe}
      </div>
    </nav>
  );
};

export default TopbarDesktop;
