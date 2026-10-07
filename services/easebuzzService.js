const axios = require("axios");
const crypto = require("crypto");

class EasebuzzService {
    constructor() {
        this.key = process.env.EASEBUZZ_KEY || "PCG0NDPL0";
        this.salt = process.env.EASEBUZZ_SALT || "S4KSFDOFV";
        this.env = (process.env.EASEBUZZ_ENV || "test").toLowerCase();
        this.baseUrl = this.env === "prod"
            ? "https://pay.easebuzz.in"
            : "https://testpay.easebuzz.in";
    }

    /**
     * Generate SHA-512 hash for Easebuzz Initiate Payment API
     * Sequence:
     * key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5|udf6|udf7|udf8|udf9|udf10|salt
     */
    generateInitiateHash({ txnid, amount, productinfo, firstname, email, udf1 = "", udf2 = "", udf3 = "", udf4 = "", udf5 = "", udf6 = "", udf7 = "" }) {
        const amtStr = parseFloat(amount).toFixed(2);
        const hashSequence = [
            this.key,
            txnid,
            amtStr,
            productinfo || "Canteen Payment",
            firstname || "Customer",
            email || "canteen@wb.gov.in",
            udf1 || "",
            udf2 || "",
            udf3 || "",
            udf4 || "",
            udf5 || "",
            udf6 || "",
            udf7 || "",
            "", // udf8
            "", // udf9
            "", // udf10
            this.salt
        ].join("|");

        return crypto.createHash("sha512").update(hashSequence).digest("hex");
    }

    /**
     * Verify reverse SHA-512 hash returned in Easebuzz response
     * Sequence:
     * salt|status|udf10|udf9|udf8|udf7|udf6|udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key
     */
    verifyResponseHash(responseBody) {
        if (!responseBody || !responseBody.hash) {
            return false;
        }

        const amtStr = parseFloat(responseBody.amount || 0).toFixed(2);
        const reverseSequence = [
            this.salt,
            responseBody.status || "",
            responseBody.udf10 || "",
            responseBody.udf9 || "",
            responseBody.udf8 || "",
            responseBody.udf7 || "",
            responseBody.udf6 || "",
            responseBody.udf5 || "",
            responseBody.udf4 || "",
            responseBody.udf3 || "",
            responseBody.udf2 || "",
            responseBody.udf1 || "",
            responseBody.email || "",
            responseBody.firstname || "",
            responseBody.productinfo || "",
            amtStr,
            responseBody.txnid || "",
            this.key
        ].join("|");

        const calculatedHash = crypto.createHash("sha512").update(reverseSequence).digest("hex");
        const isValid = calculatedHash.toLowerCase() === (responseBody.hash || "").toLowerCase();

        if (!isValid) {
            console.warn("[Easebuzz] Reverse hash mismatch. Expected:", calculatedHash, "Received:", responseBody.hash);
        }
        return isValid;
    }

    /**
     * Initiate Payment via Easebuzz API
     * Returns { success: boolean, access_key: string, txnid: string, key: string, message?: string }
     */
    async initiatePayment({
        txnid,
        amount,
        productinfo,
        firstname,
        phone,
        email,
        surl,
        furl,
        udf1 = "",
        udf2 = "",
        udf3 = "",
        udf4 = "",
        udf5 = ""
    }) {
        try {
            const formattedAmount = parseFloat(amount).toFixed(2);
            const safePhone = phone && phone.replace(/[^0-9]/g, "").length >= 10
                ? phone.replace(/[^0-9]/g, "").slice(-10)
                : "9999999999";
            const safeEmail = email && email.includes("@")
                ? email.trim()
                : "canteen@wb.gov.in";
            const safeName = (firstname || "Employee").trim();

            const hash = this.generateInitiateHash({
                txnid,
                amount: formattedAmount,
                productinfo,
                firstname: safeName,
                email: safeEmail,
                udf1,
                udf2,
                udf3,
                udf4,
                udf5
            });

            const params = new URLSearchParams();
            params.append("key", this.key);
            params.append("txnid", txnid);
            params.append("amount", formattedAmount);
            params.append("productinfo", productinfo);
            params.append("firstname", safeName);
            params.append("phone", safePhone);
            params.append("email", safeEmail);
            params.append("surl", surl);
            params.append("furl", furl);
            params.append("hash", hash);
            params.append("udf1", udf1);
            params.append("udf2", udf2);
            params.append("udf3", udf3);
            params.append("udf4", udf4);
            params.append("udf5", udf5);

            const initiateUrl = `${this.baseUrl}/payment/initiateLink`;

            console.log(`[Easebuzz] Initiating payment for txnid: ${txnid}, amount: ₹${formattedAmount} at ${initiateUrl}`);

            const response = await axios.post(initiateUrl, params.toString(), {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Accept": "application/json"
                },
                timeout: 15000
            });

            if (response.data && response.data.status === 1 && response.data.data) {
                return {
                    success: true,
                    access_key: response.data.data,
                    txnid,
                    key: this.key,
                    env: this.env
                };
            } else {
                const errMsg = typeof response.data?.data === "string"
                    ? response.data.data
                    : JSON.stringify(response.data?.data || "Failed to generate access key");
                console.error("[Easebuzz] Initiate error response:", response.data);
                return {
                    success: false,
                    message: errMsg
                };
            }
        } catch (error) {
            console.error("[Easebuzz] Request error:", error.response?.data || error.message);
            return {
                success: false,
                message: error.response?.data?.data || error.message
            };
        }
    }
}

module.exports = new EasebuzzService();
