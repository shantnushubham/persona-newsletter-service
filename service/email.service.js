const nodemailer = require("nodemailer");
const { SENDER_EMAIL } = require("../constants");
const subscriberService = require("../service/subscriber.service");
const newsContentService = require("../service/news-content.service");

const transporter = nodemailer.createTransport({
  service: "outlook",
  auth: {
    user: SENDER_EMAIL,
    pass: process.env.EMAIL_PASSWORD,
  },
});

/**
 * Sends the emails to the subscribers on the basis of their subscribed topics
 *
 * @param {*} newsContentList the list of news content instances on the basis of which
 * emails are to be sent
 */
const sendEmailsToSubscribers = async (newsContentList) => {
  const topicVsSubscriberListMap = new Map();
  for (const newsContent of newsContentList) {
    let subscriberList;
    if (!topicVsSubscriberListMap.has(newsContent.topic)) {
      subscriberList = await subscriberService.getSubscribersBySubscribedTopic(
        newsContent.topic
      );
      topicVsSubscriberListMap.set(newsContent.topic, subscriberList);
    } else {
      subscriberList = topicVsSubscriberListMap.get(newsContent.topic);
    }
    const emailIdList = subscriberList.map((subscriber) => subscriber.email);
    sendEmail(
      emailIdList,
      `New Story in ${newsContent.topic}`,
      newsContent.content
    );
  }
  if (newsContentList.length) {
    newsContentService.updateSentStatusOfNewsContent(newsContentList);
  }
};

/**
 * This function sends emails to the given list of emails.
 *
 * @param {*} emailIdList the list of email address to which emails are to be sent.
 * @param {*} subject the subject of the email
 * @param {*} text the email body
 */

// TODO: It is preferred that it is handled using SendGrid, Brevo or
// something similar.
const sendEmail = async (emailIdList, subject, text) => {
  let emailsFailed = [];
  for (const email of emailIdList) {
    const mailOptions = {
      from: SENDER_EMAIL,
      to: email,
      subject,
      text,
    };
    try {
      await transporter.sendMail(mailOptions);
    } catch (err) {
      emailsFailed.push(email);
    }
  }
  console.info(
    `Sent ${emailIdList.length - emailsFailed.length} emails out of ${
      emailIdList.length
    } successfully.`
  );
  if (emailsFailed.length) {
    console.warn(
      `The emails could not be sent to ${emailsFailed.length} emails. They are:`,
      emailsFailed
    );
  }
};

module.exports = { sendEmailsToSubscribers, sendEmail };
