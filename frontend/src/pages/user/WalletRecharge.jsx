import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    FaArrowLeft,
    FaWallet,
    FaMobileAlt,
    FaQrcode,
    FaCheckCircle,
    FaSignOutAlt,
    FaClipboardList,
    FaTicketAlt,
    FaHome,
    FaCopy,
    FaExternalLinkAlt
} from "react-icons/fa";
import axios from "axios";

import "./WalletRecharge.css";

// NOTE on iOS scheme reliability: iOS has no equivalent of Android's
// "intent" targeting. A generic upi://pay link cannot be pointed at a
// specific app on iPhone — the OS just hands it to whichever installed
// app claims the "upi" scheme (commonly WhatsApp, if installed, regardless
// of what the user picked in this dropdown). To actually target a specific
// app on iOS, each app's OWN distinct custom scheme must be used instead.
// Amazon Pay / SuperMoney do not publish a reliable public iOS scheme, so
// those fall back to the generic upi:// link (and may still open whichever
// app iOS resolves it to) — QR code is the safer path for those on iPhone.
// Master List of UPI Apps
// Set active: true/false to enable or disable individual apps.
// Currently only "All Device UPI Apps / System Chooser" is active as requested.
const ALL_UPI_APPS = [
    {
        id: "phonepe",
        name: "PhonePe",
        icon: "/images/phonepe.png",
        intentPackage: "com.phonepe.app",       // Android intent package
        iosUrlPrefix: "phonepe://pay?",         // iOS app-specific scheme
        active: false
    },
    {
        id: "gpay",
        name: "Google Pay (GPay)",
        icon: "/images/gpay.png",
        intentPackage: "com.google.android.apps.nbu.paisa.user", // Correct Package ID for Google Pay India (Tez)
        iosUrlPrefix: "gpay://upi/pay?",
        active: true

    },
    {
        id: "whatsapp",
        name: "WhatsApp Pay",
        icon: "/images/whatsapp.png",
        intentPackage: "com.whatsapp",
        iosUrlPrefix: "whatsapp://upi/pay?",
        active: false
    },
    {
        id: "cred",
        name: "CRED UPI",
        icon: "/images/cred.png",
        intentPackage: "com.cred.club",
        iosUrlPrefix: "credpay://upi/pay?",
        active: false
    },
    {
        id: "paytm",
        name: "Paytm UPI",
        icon: "/images/paytm.png",
        intentPackage: "net.one97.paytm",
        iosUrlPrefix: "paytmmp://pay?",
        active: false
    },
    {
        id: "amazonpay",
        name: "Amazon Pay",
        icon: "/images/amazonpay.png",
        intentPackage: "in.amazon.mShop.android.shopping",
        iosUrlPrefix: null,
        active: false
    },
    {
        id: "supermoney",
        name: "SuperMoney",
        icon: "/images/supermoney.png",
        intentPackage: "com.supermoney.app",
        iosUrlPrefix: null,
        active: false
    },
    {
        id: "bhim",
        name: "BHIM UPI",
        icon: "/images/bhim.png",
        intentPackage: "in.org.npci.upiapp",
        iosUrlPrefix: "bhim://upi/pay?",
        active: false
    },
    {
        id: "other",
        name: "All Device UPI Apps / System Chooser",
        icon: "",
        intentPackage: "",
        iosUrlPrefix: null,
        active: true
    }
];

const UPI_APPS = ALL_UPI_APPS.filter(app => app.active);



// ---- Platform detection helpers ----
const isIOS = () =>
    typeof navigator !== "undefined" &&
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !window.MSStream;

// Set to true whenever you want to re-enable "Select UPI App" mode
const ENABLE_SELECT_UPI_APP = false;

function WalletRecharge() {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem("user")) || {};

    const [currentBalance, setCurrentBalance] = useState(0.00);
    const [rechargeAmount, setRechargeAmount] = useState(null);
    const [customAmount, setCustomAmount] = useState("");
    const [paymentMode, setPaymentMode] = useState("EASEBUZZ"); // "EASEBUZZ", "QR_CODE", "UPI_APP"
    const [selectedUpiApp, setSelectedUpiApp] = useState("other");

    const [utrNumber, setUtrNumber] = useState("");
    const [utrError, setUtrError] = useState("");
    const [copiedUpi, setCopiedUpi] = useState(false);
    const [copiedMobile, setCopiedMobile] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [appOpened, setAppOpened] = useState(false);
    const [isOpeningApp, setIsOpeningApp] = useState(false);
    const [upiGatewayEnabled, setUpiGatewayEnabled] = useState(
        () => localStorage.getItem("setting_upi_gateway") !== "Disabled"
    );

    const upiVpa = "agcanteen@indianbk";
    const mobileNo = "";
    const payeeName = "CANTEEN OFFICE OF THE PRINCIPAL ACCOUNTANT GENERAL";

    useEffect(() => {
        if (!user.employee_id) {
            navigate("/login");
            return;
        }
        fetchCurrentBalance();
        fetchSettings();
    }, []);

    const fetchCurrentBalance = async () => {
        try {
            const res = await axios.get(
                (window.API_BASE_URL || "http://localhost:5000") + `/api/wallet/balance/${user.employee_id}`
            );
            setCurrentBalance(parseFloat(res.data.balance || 0));
        } catch (err) {
            console.error("Error fetching balance:", err);
        }
    };

    const fetchSettings = async () => {
        try {
            const res = await axios.get(
                (window.API_BASE_URL || "http://localhost:5000") + "/api/admin-stats/settings"
            );
            if (res.data.success && res.data.settings) {
                setUpiGatewayEnabled(res.data.settings.setting_upi_gateway !== "Disabled");
            }
        } catch (err) {
            console.error("Error fetching settings:", err);
        }
    };

    const handleAmountPreset = (amt) => {
        setRechargeAmount(amt);
        setCustomAmount(amt.toString());
    };

    const handleCustomAmountChange = (e) => {
        const val = e.target.value;
        setCustomAmount(val);
        const num = parseFloat(val);
        if (!isNaN(num) && num > 0) {
            setRechargeAmount(num);
        } else {
            setRechargeAmount(null);
        }
    };

    const handleUtrChange = (e) => {
        // Allow flexible alphanumeric characters of any length (letters, numbers, -, /, ., _, @, space)
        const val = e.target.value.replace(/[^a-zA-Z0-9\-\/\.\_\@\s]/g, "");
        setUtrNumber(val);
        setUtrError("");
    };


    const handleCopyUpi = () => {
        navigator.clipboard.writeText(upiVpa);
        setCopiedUpi(true);
        setTimeout(() => setCopiedUpi(false), 2000);
    };

    const handleCopyMobile = () => {
        navigator.clipboard.writeText(mobileNo);
        setCopiedMobile(true);
        setTimeout(() => setCopiedMobile(false), 2000);
    };


    // Builds the query-string portion shared by every UPI link variant.
    const buildUpiQuery = (amtVal) => {
        const amt = (amtVal || 0).toFixed(2);
        const txnId = "TXN" + Date.now();
        const encodedName = encodeURIComponent(payeeName);
        const encodedNote = encodeURIComponent("CanteenRecharge");
        return `pa=${upiVpa}&pn=${encodedName}&tr=${txnId}&am=${amt}&cu=INR&tn=${encodedNote}`;
    };

    // Standard, generic UPI deep link (upi://pay?...). On Android every UPI
    // app registers this scheme and Android can also target a specific one
    // via intent://. On iOS this generic link is ambiguous — iOS just hands
    // it to whichever installed app claims the "upi" scheme (commonly
    // WhatsApp), ignoring which app the user picked. Used as the QR-code
    // fallback and for apps with no known iOS-specific scheme.
    const getUpiUrl = () => {
        const amtVal = parseFloat(customAmount) || 0;
        return `upi://pay?${buildUpiQuery(amtVal)}`;
    };

    const handleOpenUpiApp = () => {
        const amtVal = parseFloat(customAmount);
        if (isNaN(amtVal) || amtVal <= 0) {
            alert("Please enter a valid recharge amount.");
            return;
        }

        if (isOpeningApp) return; // guard against rapid double-clicks
        setIsOpeningApp(true);
        setAppOpened(true);

        const standardUpiUrl = getUpiUrl();
        const selectedAppObj = UPI_APPS.find(a => a.id === selectedUpiApp);

        // --- iOS: use the SELECTED APP'S OWN custom scheme ---
        // Safari does NOT understand the Android "intent://...#Intent;...;end"
        // syntax, so that link previously failed silently on iPhone.
        // Critically, the generic "upi://pay" link does NOT let iOS target a
        // specific app either — iOS just hands it to whichever installed app
        // claims the "upi" scheme (often WhatsApp), ignoring the dropdown
        // selection entirely. To actually open the chosen app on iOS, we
        // must use that app's own distinct scheme (phonepe://, gpay://,
        // paytmmp://, etc.) instead.
        if (isIOS()) {
            if (selectedAppObj && selectedAppObj.iosUrlPrefix) {
                const iosUrl = `${selectedAppObj.iosUrlPrefix}${buildUpiQuery(amtVal)}`;
                window.location.href = iosUrl;
            } else {
                // No known iOS-specific scheme for this app (Amazon Pay,
                // SuperMoney, "other") — fall back to the generic link.
                // Note: on iOS this generic link may still resolve to
                // whichever app the OS picks (e.g. WhatsApp), not
                // necessarily the one selected. QR code is more reliable
                // for these apps on iPhone.
                window.location.href = standardUpiUrl;
            }
            setTimeout(() => setIsOpeningApp(false), 1000);
            return;
        }

        // --- Non-Android (desktop/unknown), "other", or no package: plain link ---
        if (!isAndroid() || !selectedAppObj || selectedAppObj.id === "other" || !selectedAppObj.intentPackage) {
            window.location.href = standardUpiUrl;
            setTimeout(() => setIsOpeningApp(false), 1000);
            return;
        }

        // --- Android: target the specific app via intent:// ---
        // browser_fallback_url is embedded directly in the intent string so
        // Chrome itself falls back to the plain upi:// link if the targeted
        // app isn't installed. This replaces the old blind setTimeout, which
        // could misfire when the tab was backgrounded (app in foreground)
        // and then re-fire on resume right after the user had already paid.
        const txnId = "TXN" + Date.now();
        const amtStr = amtVal.toFixed(2);
        const encodedName = encodeURIComponent(payeeName);
        const encodedNote = encodeURIComponent("CanteenRecharge");

        const androidIntentUrl =
            `intent://pay?pa=${upiVpa}&pn=${encodedName}&tr=${txnId}&tn=${encodedNote}&am=${amtStr}&cu=INR` +
            `#Intent;scheme=upi;package=${selectedAppObj.intentPackage};` +
            `S.browser_fallback_url=${encodeURIComponent(standardUpiUrl)};end`;

        try {
            window.location.href = androidIntentUrl;
        } catch (e) {
            window.location.href = standardUpiUrl;
        } finally {
            setTimeout(() => setIsOpeningApp(false), 1000);
        }
    };

    const handleEasebuzzRecharge = async () => {
        const finalAmount = parseFloat(customAmount);
        if (isNaN(finalAmount) || finalAmount <= 0) {
            alert("Please enter a valid recharge amount (minimum ₹1).");
            return;
        }

        if (isProcessing) return;
        setIsProcessing(true);

        try {
            const initiateRes = await axios.post(
                (window.API_BASE_URL || "http://localhost:5000") + "/api/payments/easebuzz-initiate",
                {
                    amount: finalAmount,
                    type: "WALLET_RECHARGE",
                    employee_id: user.employee_id,
                    customer_name: user.full_name || user.username,
                    customer_email: user.email || user.google_email,
                    customer_phone: user.mobile
                }
            );

            if (!initiateRes.data.success || !initiateRes.data.access_key) {
                alert(initiateRes.data.message || "Failed to initiate online recharge.");
                setIsProcessing(false);
                return;
            }

            if (!window.EasebuzzCheckout) {
                alert("Easebuzz Checkout SDK could not be loaded. Please check your internet connection.");
                setIsProcessing(false);
                return;
            }

            const easebuzzCheckout = new window.EasebuzzCheckout(initiateRes.data.key, initiateRes.data.env || "test");
            const options = {
                access_key: initiateRes.data.access_key,
                onResponse: async (response) => {
                    console.log("[Easebuzz Wallet Recharge onResponse]:", response);
                    if (response.status === "success") {
                        try {
                            const verifyRes = await axios.post(
                                (window.API_BASE_URL || "http://localhost:5000") + "/api/payments/easebuzz-verify",
                                {
                                    easebuzz_response: response,
                                    type: "WALLET_RECHARGE",
                                    employee_id: user.employee_id
                                }
                            );

                            if (verifyRes.data.success) {
                                setSuccessMessage(verifyRes.data.message || `Wallet recharged with ₹${finalAmount.toFixed(2)}!`);
                                setCurrentBalance(verifyRes.data.newBalance);
                                setTimeout(() => {
                                    navigate("/wallet");
                                }, 1800);
                            } else {
                                alert(verifyRes.data.message || "Payment verification failed.");
                            }
                        } catch (vErr) {
                            console.error("Verification error:", vErr);
                            alert(vErr.response?.data?.message || "Error verifying payment with server.");
                        }
                    } else if (response.status === "userCancelled" || response.status === "cancelled") {
                        alert("Recharge cancelled by user.");
                    } else {
                        alert("Recharge payment failed: " + (response.error_desc || response.status || "Unknown error"));
                    }
                    setIsProcessing(false);
                }
            };

            easebuzzCheckout.initiatePayment(options);

        } catch (err) {
            console.error("Easebuzz recharge error:", err);
            alert(err.response?.data?.message || "Failed to start payment gateway.");
            setIsProcessing(false);
        }
    };

    const handleProceedPayment = async () => {
        const finalAmount = parseFloat(customAmount);
        if (isNaN(finalAmount) || finalAmount <= 0) {
            alert("Please enter a valid recharge amount (minimum ₹1).");
            return;
        }

        if (!utrNumber || utrNumber.trim().length === 0) {
            setUtrError("Please enter your Transaction Ref / UTR No.");
            return;
        }

        if (isProcessing) return;

        setIsProcessing(true);


        const selectedAppObj = UPI_APPS.find(a => a.id === selectedUpiApp);
        const methodName = paymentMode === "QR_CODE"
            ? "Scan QR Code"
            : (selectedAppObj ? selectedAppObj.name : "UPI App");

        try {
            // NOTE (per your request): this submits the amount + UTR as
            // self-reported by the user. Since you're reconciling actual
            // credits manually against net banking, treat whatever this
            // endpoint records as "pending" / unverified until you've
            // checked it against your bank statement — the server has no
            // independent confirmation that the UPI payment actually
            // succeeded for this amount.
            const rechargeRes = await axios.post(
                (window.API_BASE_URL || "http://localhost:5000") + "/api/wallet/recharge",
                {
                    employee_id: user.employee_id,
                    amount: finalAmount,
                    payment_method: methodName,
                    utr_number: utrNumber.trim()
                }
            );

            if (rechargeRes.data.success) {
                setSuccessMessage(rechargeRes.data.message);
                setTimeout(() => {
                    navigate("/wallet");
                }, 1800);
            } else {
                alert(rechargeRes.data.message || "Failed to recharge wallet.");
            }
        } catch (err) {
            console.error("Recharge error:", err);
            alert(err.response?.data?.message || "Error processing wallet recharge. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleLogout = () => {
        localStorage.clear();
        navigate("/login");
    };

    const parsedAmount = parseFloat(customAmount);
    const isValidAmount = !isNaN(parsedAmount) && parsedAmount > 0;
    const isProceedDisabled = !upiGatewayEnabled || isProcessing || !isValidAmount || (paymentMode !== "EASEBUZZ" && (!utrNumber || utrNumber.trim().length === 0));


    return (
        <div className="wallet-recharge-page">
            <div className="recharge-main-card">

                {/* HEADER */}
                <div className="department-header">
                    <img
                        src="/images/images.png"
                        alt="Government Logo"
                        className="dept-logo"
                    />

                    <div className="dept-title">
                        <h1>
                            Office of the Principal
                            Accountant General (A&E), W.B.
                        </h1>
                        <p>
                            Treasury Buildings, Kolkata - 700001
                        </p>
                    </div>

                    <img
                        src="/images/IA&AS_Logo.png"
                        alt="IAAS Logo"
                        className="dept-logo"
                    />
                </div>

                {/* CONTENT */}
                <div className="recharge-content">
                    <button
                        className="back-button"
                        onClick={() => navigate("/wallet")}
                    >
                        <FaArrowLeft /> Back to Wallet
                    </button>

                    <div className="recharge-title-section">
                        <h2>Wallet Recharge</h2>
                        <p>
                            Top up your canteen wallet using PhonePe, GPay, Amazon Pay, SuperMoney, or QR Scan
                        </p>
                    </div>

                    {/* SUCCESS BANNER */}
                    {successMessage && (
                        <div className="success-banner">
                            <FaCheckCircle className="success-icon" />
                            <span>{successMessage} Redirecting...</span>
                        </div>
                    )}

                    {/* AMOUNT SELECTION CARD */}
                    <div className="recharge-card">
                        <h3>1. Enter Recharge Amount</h3>

                        <div className="preset-amounts">
                            {[100, 200, 500, 1000].map((amt) => (
                                <button
                                    key={amt}
                                    type="button"
                                    className={`preset-btn ${rechargeAmount === amt ? "active" : ""}`}
                                    onClick={() => handleAmountPreset(amt)}
                                >
                                    + ₹{amt}
                                </button>
                            ))}
                        </div>

                        <div className="custom-amount-wrapper">
                            <label htmlFor="custom-amount-input">Custom Amount (₹):</label>
                            <div className="input-group">
                                <span className="currency-symbol">₹</span>
                                <input
                                    id="custom-amount-input"
                                    type="number"
                                    min="1"
                                    step="1"
                                    placeholder="Enter amount"
                                    value={customAmount}
                                    onChange={handleCustomAmountChange}
                                />
                            </div>
                        </div>
                    </div>

                    {/* PAYMENT MODE SELECTION */}
                    <div className="recharge-card">
                        <h3>2. Choose Payment Mode</h3>

                        {!upiGatewayEnabled ? (
                            <div className="gateway-disabled-banner" style={{
                                background: "linear-gradient(135deg, #fef2f2, #fee2e2)",
                                border: "2px solid #ef4444",
                                borderRadius: "14px",
                                padding: "20px",
                                textAlign: "center",
                                boxShadow: "0 4px 14px rgba(239, 68, 68, 0.1)"
                            }}>
                                <h4 style={{ color: "#991b1b", margin: "0 0 8px 0", fontSize: "16px", fontWeight: "700" }}>
                                    ⚠️ Online UPI Recharge Offline
                                </h4>
                                <p style={{ fontSize: "14px", color: "#b91c1c", margin: "0", fontWeight: "500", lineHeight: "1.5" }}>
                                    Online wallet recharge via UPI / QR Code is currently disabled by the Admin. <br />
                                    Please visit the canteen counter to recharge your wallet with Cash.
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="mode-tabs">
                                    <button
                                        type="button"
                                        className={`mode-tab ${paymentMode === "EASEBUZZ" ? "active" : ""}`}
                                        onClick={() => setPaymentMode("EASEBUZZ")}
                                        style={{ fontWeight: "700" }}
                                    >
                                        ⚡ Instant Online (Easebuzz)
                                    </button>
                                    <button
                                        type="button"
                                        className={`mode-tab ${paymentMode === "QR_CODE" ? "active" : ""}`}
                                        onClick={() => setPaymentMode("QR_CODE")}
                                    >
                                        <FaQrcode /> Manual QR Code
                                    </button>
                                    <button
                                        type="button"
                                        className={`mode-tab ${paymentMode === "UPI_APP" ? "active" : ""} ${!ENABLE_SELECT_UPI_APP ? "disabled-tab" : ""}`}
                                        onClick={() => {
                                            if (ENABLE_SELECT_UPI_APP) {
                                                setPaymentMode("UPI_APP");
                                            }
                                        }}
                                        disabled={!ENABLE_SELECT_UPI_APP}
                                        style={!ENABLE_SELECT_UPI_APP ? {
                                            opacity: 0.55,
                                            cursor: "not-allowed",
                                            background: "#f1f5f9",
                                            color: "#64748b",
                                            borderColor: "#cbd5e1"
                                        } : {}}
                                        title={!ENABLE_SELECT_UPI_APP ? "Temporarily Unavailable" : ""}
                                    >
                                        <FaMobileAlt /> Direct App {!ENABLE_SELECT_UPI_APP && <span style={{ fontSize: "10px", background: "#ef4444", color: "white", padding: "2px 6px", borderRadius: "10px", marginLeft: "6px", fontWeight: "700" }}>Off</span>}
                                    </button>
                                </div>

                                {/* MODE: EASEBUZZ INSTANT RECHARGE */}
                                {paymentMode === "EASEBUZZ" && (
                                    <div className="easebuzz-recharge-preview" style={{ background: "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)", border: "1.5px solid #86efac", borderRadius: "14px", padding: "18px", marginTop: "14px" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                                            <FaCheckCircle style={{ color: "#16a34a", fontSize: "20px" }} />
                                            <h4 style={{ margin: 0, color: "#166534", fontSize: "16px", fontWeight: "700" }}>Instant Wallet Top-Up via Easebuzz</h4>
                                        </div>
                                        <p style={{ fontSize: "13px", color: "#15803d", margin: "0 0 10px 0", lineHeight: "1.5" }}>
                                            Pay instantly via <strong>Google Pay, PhonePe, Paytm, BHIM UPI, Debit/Credit Card, or Net Banking</strong>.
                                        </p>
                                        <div style={{ background: "#ffffff", padding: "12px 14px", borderRadius: "8px", border: "1px dashed #86efac", fontSize: "12px", color: "#166534" }}>
                                            ⚡ <strong>Zero Wait Time:</strong> Your wallet balance will be credited automatically immediately upon payment confirmation without needing admin manual review or UTR entry.
                                        </div>
                                    </div>
                                )}

                                {/* MODE: UPI APP DROPDOWN / SELECTION */}
                                {paymentMode === "UPI_APP" && (
                                    <div className="upi-app-selection-section">
                                        <label className="select-label">Select Installed UPI App:</label>
                                        <select
                                            className="upi-app-dropdown"
                                            value={selectedUpiApp}
                                            onChange={(e) => setSelectedUpiApp(e.target.value)}
                                        >
                                            {UPI_APPS.map((app) => (
                                                <option key={app.id} value={app.id}>
                                                    {app.name}
                                                </option>
                                            ))}
                                        </select>

                                        {isIOS() && (
                                            <p style={{ fontSize: "12px", color: "#6b7280", margin: "6px 0 0 0" }}>
                                                {UPI_APPS.find(a => a.id === selectedUpiApp)?.iosUrlPrefix
                                                    ? "On iPhone, this will open the selected app directly."
                                                    : "This app doesn't support direct opening on iPhone — please use the QR code below instead for a reliable payment."}
                                            </p>
                                        )}

                                        <div className="open-app-banner">
                                            <p>Click below to open <strong>{UPI_APPS.find(a => a.id === selectedUpiApp)?.name}</strong> on your phone{isValidAmount ? <> for paying <strong>₹{customAmount}</strong></> : ""}:</p>
                                            <button
                                                type="button"
                                                className="open-app-btn"
                                                onClick={handleOpenUpiApp}
                                                disabled={isOpeningApp}
                                            >
                                                <FaExternalLinkAlt /> Open {UPI_APPS.find(a => a.id === selectedUpiApp)?.name} to Pay
                                            </button>

                                            {appOpened && (
                                                <div className="app-opened-guidance" style={{
                                                    background: "linear-gradient(135deg, #f0fdf4, #dcfce7)",
                                                    border: "2px solid #16a34a",
                                                    borderRadius: "14px",
                                                    padding: "16px",
                                                    marginTop: "16px",
                                                    textAlign: "center",
                                                    boxShadow: "0 4px 14px rgba(22, 163, 74, 0.15)"
                                                }}>
                                                    <h4 style={{ color: "#15803d", margin: "0 0 8px 0", fontSize: "15px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                                                        <FaCheckCircle style={{ color: "#16a34a" }} /> Entered UPI PIN in App?
                                                    </h4>
                                                    <p style={{ fontSize: "13px", color: "#166534", margin: "0 0 12px 0", fontWeight: "500" }}>
                                                        Please check your payment receipt SMS / App and enter your <strong>12-digit UTR / Reference ID</strong> below, then click <strong>Proceed & Confirm Payment</strong>!
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* MODE: QR CODE PREVIEW */}
                                {(paymentMode === "QR_CODE" || paymentMode === "UPI_APP") && (
                                    <div className="qr-preview-container">
                                        <h4>Official Canteen / UPI Payment QR Code{isValidAmount ? ` (₹${customAmount})` : ""}</h4>
                                        <div className="qr-box" style={{ background: "#ffffff", padding: "16px", borderRadius: "16px", boxShadow: "0 6px 20px rgba(0,0,0,0.12)", border: "2px solid #143d73", display: "inline-block" }}>
                                            <img
                                                src="/images/upi_qr.png"
                                                alt="Canteen Office UPI QR Code"
                                                style={{ width: "230px", height: "230px", objectFit: "contain", borderRadius: "10px", display: "block", margin: "0 auto" }}
                                            />
                                            <p style={{ marginTop: "10px", fontSize: "12px", fontWeight: "700", color: "#143d73", marginBottom: "0", maxWidth: "260px", lineHeight: "1.3" }}>
                                                CANTEEN OFFICE OF THE PRINCIPAL ACCOUNTANT GENERAL
                                            </p>
                                        </div>


                                        <div className="upi-vpa-copy" style={{ display: "flex", flexDirection: "column", gap: "10px", alignItems: "center" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                                <span>UPI ID: <strong>{upiVpa}</strong></span>
                                                <button type="button" className="copy-btn" onClick={handleCopyUpi}>
                                                    <FaCopy /> {copiedUpi ? "Copied!" : "Copy UPI ID"}
                                                </button>
                                            </div>
                                            {mobileNo && (
                                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                                    <span>Mobile No: <strong>{mobileNo}</strong></span>
                                                    <button type="button" className="copy-btn" onClick={handleCopyMobile} style={{ background: "#2563eb" }}>
                                                        <FaCopy /> {copiedMobile ? "Copied!" : "Copy Mobile No"}
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <p className="qr-instructions" style={{ marginTop: "12px" }}>
                                            <strong>💡 Easy Payment Options:</strong><br />
                                            1. 📸 <strong>Scan QR Code above</strong> with any UPI app like GPay / PhonePe / Paytm camera (100% works without decline).<br />
                                            2. 📱 Enter UPI ID <strong>{upiVpa}</strong> directly inside your UPI App!
                                        </p>
                                    </div>
                                )}
                            </>
                        )}

                    </div>

                    {/* MANDATORY UTR / TRANSACTION REF NO INPUT CARD FOR MANUAL UPI/QR */}
                    {upiGatewayEnabled && paymentMode !== "EASEBUZZ" && (
                        <div className="recharge-card utr-input-card">
                            <h3>3. Enter UPI Transaction / UTR Ref No.</h3>

                            <p className="utr-help-text">
                                After completing payment in your UPI App / QR Code, check your payment receipt and paste the <strong>UPI Transaction / UTR Reference No. (alphanumeric)</strong> below. This entry will be reconciled manually against net banking records.
                            </p>

                            <div className="utr-input-wrapper">
                                <input
                                    type="text"
                                    className={`utr-input ${utrError ? "invalid" : ""}`}
                                    placeholder="Enter Transaction Ref / UTR No. (e.g. 423589123456 or PAYTM123)"
                                    value={utrNumber}
                                    onChange={handleUtrChange}
                                />
                            </div>


                            {utrError && <p className="error-text">{utrError}</p>}
                        </div>
                    )}

                    {/* RECHARGE SUMMARY CARD */}
                    <div className="recharge-card summary-card">
                        <h3>Summary</h3>

                        <div className="summary-row">
                            <span>Current Balance:</span>
                            <strong>₹{currentBalance.toFixed(2)}</strong>
                        </div>

                        <div className="summary-row">
                            <span>Recharge Amount:</span>
                            <strong className="recharge-highlight">
                                {isValidAmount ? `+ ₹${parsedAmount.toFixed(2)}` : "₹0.00"}
                            </strong>
                        </div>

                        {paymentMode !== "EASEBUZZ" && (
                            <div className="summary-row">
                                <span>UTR Reference No:</span>
                                <strong>{utrNumber || "Pending input..."}</strong>
                            </div>
                        )}

                        <div className="summary-row total-row">
                            <span>New Balance After Recharge:</span>
                            <strong className="new-balance-highlight">
                                ₹{(currentBalance + (isValidAmount ? parsedAmount : 0)).toFixed(2)}
                            </strong>
                        </div>
                    </div>

                    {/* ACTION BUTTON */}
                    {upiGatewayEnabled && (
                        <div className="recharge-action">
                            <button
                                type="button"
                                className="proceed-recharge-btn"
                                onClick={paymentMode === "EASEBUZZ" ? handleEasebuzzRecharge : handleProceedPayment}
                                disabled={isProceedDisabled}
                                style={paymentMode === "EASEBUZZ" ? { background: "linear-gradient(135deg, #16a34a, #15803d)" } : {}}
                            >
                                {isProcessing ? "Processing Gateway..." : (
                                    paymentMode === "EASEBUZZ"
                                        ? (isValidAmount ? `Recharge ₹${customAmount} Instantly with Easebuzz` : "Enter Amount to Recharge")
                                        : (isValidAmount ? `Proceed & Confirm Payment (₹${customAmount})` : "Enter Amount to Proceed")
                                )}
                            </button>
                        </div>
                    )}
                </div>

                {/* FOOTER */}
                <div className="bottom-footer">
                    <div
                        className="footer-item"
                        onClick={() => navigate("/home")}
                    >
                        <FaHome />
                        <span>Home</span>
                    </div>

                    <div
                        className="footer-item"
                        onClick={() => navigate("/orders")}
                    >
                        <FaClipboardList />
                        <span>Orders</span>
                    </div>

                    <div
                        className="footer-item"
                        onClick={() => navigate("/coupons")}
                    >
                        <FaTicketAlt />
                        <span>Coupons</span>
                    </div>

                    <div
                        className="footer-item"
                        onClick={() => navigate("/wallet")}
                    >
                        <FaWallet />
                        <span>Wallet</span>
                    </div>

                    <div
                        className="footer-item"
                        onClick={handleLogout}
                    >
                        <FaSignOutAlt />
                        <span>Logout</span>
                    </div>
                </div>

            </div>
        </div>
    );
}

export default WalletRecharge;
