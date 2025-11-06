import axios from "axios";
import dotenv from "dotenv";
import { getAccessToken } from "./getAccessToken.js";

dotenv.config();

export const initiateSTKPush = async (phone, amount, accountReference, transactionDesc) => {
  const token = await getAccessToken();
  const shortcode = process.env.MPESA_SHORTCODE;
  const passkey = process.env.MPESA_PASSKEY;

  // Timestamp in format yyyyMMddHHmmss
  const timestamp = new Date()
    .toISOString()
    .replace(/[-T:.Z]/g, "")
    .slice(0, 14);

  const password = Buffer.from(shortcode + passkey + timestamp).toString("base64");

  const payload = {
    BusinessShortCode: shortcode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: amount,
    PartyA: phone, // Customer's phone number
    PartyB: shortcode,
    PhoneNumber: phone,
    CallBackURL: "https://your-server-domain.com/api/mpesa/callback", // use your server’s callback endpoint
    AccountReference: accountReference,
    TransactionDesc: transactionDesc,
  };

  try {
    const response = await axios.post(
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    console.log("STK Push response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error initiating STK Push:", error.response?.data || error.message);
  }
};
