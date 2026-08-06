import React, { useState } from 'react';
import { Form as FinalForm } from 'react-final-form';

import {
  Form,
  PrimaryButton,
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
 * Contact Us — layout & copy from Figma Contact Us desktop/mobile screenshots.
 */
export const ContactPageComponent = props => {
  const { onSubmit } = props;
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = values => {
    if (typeof onSubmit === 'function') {
      onSubmit(values);
    }
    setSubmitted(true);
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
            {submitted ? (
              <p className={css.success} role="status">
                Thanks — your message has been recorded. Our team will follow up soon.
              </p>
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
                        <option value="drivers">Driver support</option>
                        <option value="hosts">Host support</option>
                        <option value="billing">Billing &amp; account</option>
                        <option value="other">Other</option>
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
