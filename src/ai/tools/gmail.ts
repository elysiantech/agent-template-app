
import {
  GmailCreateDraft,
  GmailGetMessage,
  GmailGetThread,
  GmailSearch,
  GmailSendMessage,
} from "@langchain/community/tools/gmail";

const gmailParams = {
    credentials: {
    clientEmail: process.env.GMAIL_CLIENT_EMAIL,
    privateKey: process.env.GMAIL_PRIVATE_KEY,
    // Either (privateKey + clientEmail) or accessToken is required
    accessToken: "an access token or function to get access token",
    },
    scopes: ["https://mail.google.com/"], // Not required if using access token
};
export const gmailTools = [
    new GmailSendMessage(gmailParams),
    new GmailGetMessage(gmailParams),
    new GmailGetThread(gmailParams),
    new GmailSearch(gmailParams),
    new GmailCreateDraft(gmailParams),
]
