import React, { useState } from 'react';
import { Form as FinalForm } from 'react-final-form';

import {
  Form,
  PrimaryButton,
  SecondaryButton,
  FieldTextInput,
  FieldSelect,
  Page,
  LayoutSingleColumn,
} from '../../components';
import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';
import { HAKO_ASSETS } from '../LandingPage/Hako/assets';

import css from './ContactPage.module.css';

const required = message => value => (value ? undefined : message);

/**
 * Destination for Contact Us enquiries.
 *
 * Set REACT_APP_HAKO_CONTACT_EMAIL in the environment (and in .env-template)
 * before this page is useful in production. There is no server-side mail
 * delivery: the form hands the composed message to the customer's own mail
 * client, and the customer sends it themselves.
 */
export const CONTACT_EMAIL = process.env.REACT_APP_HAKO_CONTACT_EMAIL || '';

const SUBJECT_OPTIONS = [
  { value: 'drivers', label: 'Driver support' },
  { value: 'hosts', label: 'Host support' },
  { value: 'billing', label: 'Billing & account' },
  { value: 'other', label: 'Other' },
];

const subjectLabel = value =>
  (SUBJECT_OPTIONS.find(option => option.value === value) || {}).label || 'Other';

/**
 * Turn submitted form values into the pieces of a mailto: handoff.
 */
export const composeEnquiry = (values = {}, to = CONTACT_EMAIL) => {
  const { name = '', email = '', subject = '', message = '' } = values;
  const label = subjectLabel(subject);

  const mailSubject = `Hako enquiry: ${label}`;
  const mailBody = [
    `Name: ${name}`,
    `Email: ${email}`,
    `Subject: ${label}`,
    '',
    'Message:',
    message,
  ].join('\n');

  const href = to
    ? `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(
        mailSubject
      )}&body=${encodeURIComponent(mailBody)}`
    : null;

  return { to, subject: mailSubject, body: mailBody, href };
};

/**
 * Contact Us — layout & copy from Figma Contact Us desktop/mobile screenshots.
 *
 * Submitting does not send anything from the server. It opens the customer's
 * mail client with the enquiry pre-filled, matching the Gearly behaviour, and
 * falls back to copyable text when no mail client handles the link.
 */
export const ContactPageComponent = props => {
  const { onSubmit } = props;
  const [enquiry, setEnquiry] = useState(null);
  const [copied, setCopied] = useState(false);

  const openMailClient = href => {
    if (href && typeof window !== 'undefined') {
      window.location.href = href;
    }
  };

  const handleSubmit = values => {
    if (typeof onSubmit === 'function') {
      onSubmit(values);
    }
    const composed = composeEnquiry(values);
    setEnquiry(composed);
    setCopied(false);
    openMailClient(composed.href);
  };

  const handleCopy = async () => {
    if (!enquiry) {
      return;
    }
    const text = `To: ${enquiry.to}\nSubject: ${enquiry.subject}\n\n${enquiry.body}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch (e) {
      // Clipboard unavailable (insecure context, older browser, denied
      // permission). The text stays on screen for manual selection.
      setCopied(false);
    }
  };

  return (
    <Page title="Contact Us | Hako" scrollingDisabled={false}>
      <LayoutSingleColumn topbar={<TopbarContainer />} footer={<FooterContainer />}>
        <section className={css.hero} aria-label="Contact hero">
          <img className={css.heroImage} src={HAKO_ASSETS.hero} alt="" role="presentation" />
          <div className={css.heroOverlay} aria-hidden="true" />
          <div className={css.heroContent}>
            <p className={css.eyebrow}>Support</p>
            <h1 className={css.heroTitle}>Contact Us</h1>
            <p className={css.heroSubtitle}>
              Have a question or need help? We&apos;d love to hear from you. We typically respond
              within 24 hours.
            </p>
          </div>
        </section>

        <section className={css.content}>
          <div className={css.formCard}>
            {enquiry ? (
              <div className={css.handoff} role="status">
                <p className={css.success}>
                  {enquiry.href
                    ? 'We’ve opened your email app with your message ready to go. Your enquiry isn’t sent until you press send there.'
                    : 'Your message is ready below. Please copy it into an email to our team.'}
                </p>

                <div className={css.fallback}>
                  <p className={css.fallbackIntro}>
                    Email app didn’t open? Copy the message below and send it to{' '}
                    {enquiry.to ? (
                      <a className={css.fallbackAddress} href={`mailto:${enquiry.to}`}>
                        {enquiry.to}
                      </a>
                    ) : (
                      'our support team'
                    )}
                    .
                  </p>
                  <pre className={css.fallbackText}>{enquiry.body}</pre>
                  <div className={css.fallbackActions}>
                    <SecondaryButton type="button" className={css.copyButton} onClick={handleCopy}>
                      {copied ? 'Copied' : 'Copy message'}
                    </SecondaryButton>
                    {enquiry.href ? (
                      <SecondaryButton
                        type="button"
                        className={css.copyButton}
                        onClick={() => openMailClient(enquiry.href)}
                      >
                        Try email app again
                      </SecondaryButton>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : (
              <FinalForm
                onSubmit={handleSubmit}
                render={formRenderProps => {
                  const { handleSubmit: submit, invalid, submitting } = formRenderProps;
                  return (
                    <Form className={css.form} onSubmit={submit}>
                      <FieldTextInput
                        className={css.field}
                        type="text"
                        id="contactName"
                        name="name"
                        label="Your Name"
                        placeholder="Jane"
                        validate={required('Name is required')}
                      />
                      <FieldTextInput
                        className={css.field}
                        type="email"
                        id="contactEmail"
                        name="email"
                        label="Email Address"
                        placeholder="you@example.com"
                        validate={required('Email is required')}
                      />
                      <FieldSelect
                        className={css.field}
                        id="contactSubject"
                        name="subject"
                        label="Subject"
                        validate={required('Subject is required')}
                      >
                        <option disabled value="">
                          Select a subject
                        </option>
                        {SUBJECT_OPTIONS.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </FieldSelect>
                      <FieldTextInput
                        className={css.field}
                        type="textarea"
                        id="contactMessage"
                        name="message"
                        label="Message"
                        placeholder="Tell us how we can help you..."
                        validate={required('Message is required')}
                      />
                      <PrimaryButton
                        className={css.submit}
                        type="submit"
                        disabled={invalid || submitting}
                      >
                        Send Message
                      </PrimaryButton>
                    </Form>
                  );
                }}
              />
            )}
          </div>
        </section>
      </LayoutSingleColumn>
    </Page>
  );
};

const ContactPage = ContactPageComponent;
export default ContactPage;
