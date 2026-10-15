import React, { useState, useEffect } from "react";
import {
    useLocation,
    useNavigate,
} from "react-router-dom";

import {
    FaArrowLeft,
    FaUser,
    FaClipboardList,
    FaTicketAlt,
    FaWallet,
    FaSignOutAlt,
    FaMobileAlt,
    FaQrcode,
    FaExternalLinkAlt,
    FaCopy,
    FaCheckCircle
} from "react-icons/fa";
import { QRCodeCanvas } from "qrcode.react";
import axios from "axios";

import "./Payment.css";

// Master List of UPI Apps
// Set active: true/false to enable or disable individual apps.
// Currently only "All Device UPI Apps / System Chooser" and "Scan QR Code" are active as requested.
const ALL_UPI_APPS = [
    {
        id: "PhonePe",
        name: "PhonePe",
        intentPackage: "com.phonepe.app",       // Android intent package
        iosUrlPrefix: "phonepe://pay?",         // iOS app-specific scheme
        active: false
    },
    {
        id: "Google Pay",
        name: "Google Pay (GPay)",
        intentPackage: "com.google.android.apps.nbu.paisa.user", // Correct Package ID for Google Pay India (Tez)
        iosUrlPrefix: "gpay://upi/pay?",
        active: false

    },
    {
        id: "WhatsApp Pay",
        name: "WhatsApp Pay",
        intentPackage: "com.whatsapp",
        iosUrlPrefix: "whatsapp://upi/pay?",
        active: false
    },
    {
        id: "CRED UPI",
        name: "CRED UPI",
        intentPackage: "com.cred.club",
        iosUrlPrefix: "credpay://upi/pay?",
        active: false
    },
    {
        id: "Paytm UPI",
        name: "Paytm UPI",
        intentPackage: "net.one97.paytm",
        iosUrlPrefix: "paytmmp://pay?",
        active: false
    },
    {
        id: "Amazon Pay",
        name: "Amazon Pay",
        intentPackage: "in.amazon.mShop.android.shopping",
        iosUrlPrefix: null,
        active: false
    },
    {
        id: "SuperMoney",
        name: "SuperMoney",
        intentPackage: "com.supermoney.app",
        iosUrlPrefix: null,
        active: false
    },
    {
        id: "BHIM UPI",
        name: "BHIM UPI",
        intentPackage: "in.org.npci.upiapp",
        iosUrlPrefix: "bhim://upi/pay?",
        active: false
    },
    {
        id: "other",
        name: "All Device UPI Apps / System Chooser",
        intentPackage: "",
        iosUrlPrefix: null,
        active: false
    },
    {
        id: "Scan QR",
        name: "Scan QR Code",
        intentPackage: "",
        iosUrlPrefix: null,
        active: true
    }
];

// Display options list containing active options and major apps shown as disabled
const DISPLAYED_UPI_OPTIONS = ALL_UPI_APPS.filter(app => app.id === "Google Pay" || app.id === "other" || app.id === "Scan QR");
const UPI_APPS = ALL_UPI_APPS;



// ---- Platform detection helpers ----
const isIOS = () =>
    typeof navigator !== "undefined" &&
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !window.MSStream;

const isAndroid = () =>
    typeof navigator !== "undefined" && /Android/.test(navigator.userAgent);


function Payment() {
    const location = useLocation();
    const navigate = useNavigate();

    const cartItems = location.state?.cartItems || [];
    const user = JSON.parse(localStorage.getItem("user")) || {};

    const [walletBalance, setWalletBalance] = useState(0.00);
    const [isProcessing, setIsProcessing] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState(
        user?.role === "ADMIN" ? "Cash" : "Wallet"
    );
    const [utrNumber, setUtrNumber] = useState("");
    const [utrError, setUtrError] = useState("");
    const [copiedUpi, setCopiedUpi] = useState(false);
    const [copiedMobile, setCopiedMobile] = useState(false);
    const [appOpened, setAppOpened] = useState(false);
    const [isOpeningApp, setIsOpeningApp] = useState(false);
    const [upiGatewayEnabled, setUpiGatewayEnabled] = useState(
        () => localStorage.getItem("setting_upi_gateway") !== "Disabled"
    );


    const [checkoutToken] = useState(() => {
        return `CHK_${user.employee_id || 'GUEST'}_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
    });

    const upiVpa = "agcanteen@indianbk";
    const mobileNo = "";
    const payeeName = "CANTEEN OFFICE OF THE PRINCIPAL ACCOUNTANT GENERAL";

    useEffect(() => {
        if (!user.employee_id) {
            navigate("/login");
            return;
        }
        fetchWalletBalance();
        fetchSettings();
    }, []);

    const fetchWalletBalance = async () => {
        try {
            const res = await axios.get(
                (window.API_BASE_URL || "http://localhost:5000") + `/api/wallet/balance/${user.employee_id}`
            );
            setWalletBalance(parseFloat(res.data.balance || 0));
        } catch (err) {
            console.error("Error fetching wallet balance:", err);
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

    const totalItems = cartItems.reduce(
        (sum, item) => sum + (item.selectedQty || 0),
        0
    );


    const totalAmount = cartItems.reduce(
        (sum, item) => sum + Number(item.price) * (item.selectedQty || 0),
        0
    );

    const remainingBalance = walletBalance - totalAmount;

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


    const buildUpiQuery = (amtVal) => {
        const txnId = "TXN" + Date.now();
        const amtStr = (parseFloat(amtVal) || 0).toFixed(2);
        const encodedName = encodeURIComponent(payeeName);
        const encodedNote = encodeURIComponent("CanteenOrder");
        return `pa=${upiVpa}&pn=${encodedName}&tr=${txnId}&tn=${encodedNote}&am=${amtStr}&cu=INR`;
    };

    const getUpiUrl = () => {
        return `upi://pay?${buildUpiQuery(totalAmount)}`;
    };

    const handleOpenUpiApp = () => {
        if (isOpeningApp) return; // guard against rapid double-clicks
        setIsOpeningApp(true);
        setAppOpened(true);

        const standardUpiUrl = getUpiUrl();
        const selectedAppObj = UPI_APPS.find(a => a.id === paymentMethod);

        // --- iOS: use the SELECTED APP'S OWN custom scheme ---
        // Safari does NOT understand the Android "intent://...#Intent;...;end" syntax.
        // To target a specific app on iOS, we must use that app's own distinct scheme.
        if (isIOS()) {
            if (selectedAppObj && selectedAppObj.iosUrlPrefix) {
                const iosUrl = `${selectedAppObj.iosUrlPrefix}${buildUpiQuery(totalAmount)}`;
                window.location.href = iosUrl;
            } else {
                // Fall back to standard UPI link for apps without known iOS custom scheme
                window.location.href = standardUpiUrl;
            }
            setTimeout(() => setIsOpeningApp(false), 1000);
            return;
        }

        // --- Non-Android (desktop/unknown), "Scan QR", or no package: plain link ---
        if (!isAndroid() || !selectedAppObj || selectedAppObj.id === "Scan QR" || !selectedAppObj.intentPackage) {
            window.location.href = standardUpiUrl;
            setTimeout(() => setIsOpeningApp(false), 1000);
            return;
        }

        // --- Android: target the specific app via intent:// ---
        // browser_fallback_url is embedded directly in the intent string so
        // Chrome itself falls back to the plain upi:// link if the targeted app isn't installed.
        const txnId = "TXN" + Date.now();
        const amtStr = totalAmount.toFixed(2);
        const encodedName = encodeURIComponent(payeeName);
        const encodedNote = encodeURIComponent("CanteenOrder");

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



    const isEasebuzz = paymentMethod === "Easebuzz";
    const isManualUpi = paymentMethod !== "Wallet" && paymentMethod !== "Cash" && paymentMethod !== "Easebuzz";
    const isUpiPaymentMode = isManualUpi;

    const handleEasebuzzPayment = async () => {
        if (isProcessing) return;
        setIsProcessing(true);

        try {
            const category = location.state?.mealType
                ? (location.state.mealType.charAt(0).toUpperCase() + location.state.mealType.slice(1).toLowerCase())
                : (cartItems[0]?.category || "Lunch");

            const initiateRes = await axios.post(
                (window.API_BASE_URL || "http://localhost:5000") + "/api/payments/easebuzz-initiate",
                {
                    amount: totalAmount,
                    type: "ORDER",
                    employee_id: user.employee_id,
                    customer_name: user.full_name || user.username,
                    customer_email: user.email || user.google_email,
                    customer_phone: user.mobile,
                    order_payload: {
                        employee_id: user.employee_id,
                        category,
                        total_amount: totalAmount,
                        items: cartItems.map(item => ({
                            item_id: item.id,
                            item_name: item.name,
                            quantity: item.selectedQty,
                            price: Number(item.price)
                        }))
                    }
                }
            );

            if (!initiateRes.data.success || !initiateRes.data.access_key) {
                alert(initiateRes.data.message || "Failed to initiate Easebuzz payment.");
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
                    console.log("[Easebuzz onResponse]:", response);
                    if (response.status === "success") {
                        try {
                            const verifyRes = await axios.post(
                                (window.API_BASE_URL || "http://localhost:5000") + "/api/payments/easebuzz-verify",
                                {
                                    easebuzz_response: response,
                                    type: "ORDER",
                                    employee_id: user.employee_id,
                                    order_payload: {
                                        employee_id: user.employee_id,
                                        category,
                                        total_amount: totalAmount,
                                        items: cartItems.map(item => ({
                                            item_id: item.id,
                                            item_name: item.name,
                                            quantity: item.selectedQty,
                                            price: Number(item.price)
                                        }))
                                    }
                                }
                            );

                            if (verifyRes.data.success) {
                                Object.keys(sessionStorage).forEach(key => {
                                    if (key.startsWith("qty_")) {
                                        sessionStorage.removeItem(key);
                                    }
                                });

                                navigate("/paymentsuccess", {
                                    state: {
                                        cartItems,
                                        totalItems,
                                        totalAmount,
                                        paymentMethod: "Easebuzz (Online)",
                                        user,
                                        verifiedOrderId: verifyRes.data.order_id,
                                        couponCode: verifyRes.data.coupon_code,
                                        category,
                                        mealType: location.state?.mealType
                                    }
                                });
                            } else {
                                alert(verifyRes.data.message || "Payment verification failed.");
                            }
                        } catch (vErr) {
                            console.error("Verification error:", vErr);
                            alert(vErr.response?.data?.message || "Error verifying payment with server.");
                        }
                    } else if (response.status === "userCancelled" || response.status === "cancelled") {
                        alert("Payment was cancelled by user.");
                    } else {
                        alert("Payment failed: " + (response.error_desc || response.status || "Unknown error"));
                    }
                    setIsProcessing(false);
                }
            };

            easebuzzCheckout.initiatePayment(options);

        } catch (err) {
            console.error("Easebuzz checkout error:", err);
            alert(err.response?.data?.message || "Failed to start payment gateway.");
            setIsProcessing(false);
        }
    };

    const handlePayment = async () => {
        if (isProcessing) return;

        if (paymentMethod === "Wallet" && remainingBalance < 0) {
            alert("Insufficient Wallet Balance! Please recharge your wallet or select a UPI payment method.");
            return;
        }

        if (isUpiPaymentMode) {
            if (!utrNumber || utrNumber.trim().length === 0) {
                setUtrError("Please enter your Transaction Ref / UTR No.");
                return;
            }
        }


        setIsProcessing(true);
        try {
            const category = location.state?.mealType
                ? (location.state.mealType.charAt(0).toUpperCase() + location.state.mealType.slice(1).toLowerCase())
                : (cartItems[0]?.category || "Lunch");

            const orderPayload = {
                employee_id: user.employee_id,
                category,
                total_amount: totalAmount,
                payment_mode: paymentMethod,
                checkout_token: checkoutToken,
                items: cartItems.map(item => ({
                    item_id: item.id,
                    item_name: item.name,
                    quantity: item.selectedQty,
                    price: Number(item.price)
                }))
            };

            // 1. Create order on backend
            const orderRes = await axios.post(
                (window.API_BASE_URL || "http://localhost:5000") + "/api/orders/create",
                orderPayload
            );

            if (!orderRes.data.success) {
                alert("Failed to create order on server.");
                setIsProcessing(false);
                return;
            }

            const { order_id, coupon_code } = orderRes.data;

            // 2. Record payment
            const paymentPayload = {
                order_id,
                employee_id: user.employee_id,
                amount: totalAmount,
                payment_method: paymentMethod,
                utr_number: isUpiPaymentMode ? utrNumber : null,
                remarks: isUpiPaymentMode ? `UTR: ${utrNumber}` : `Paid via ${paymentMethod}`
            };

            const paymentRes = await axios.post(
                (window.API_BASE_URL || "http://localhost:5000") + "/api/payments/create",
                paymentPayload
            );

            if (!paymentRes.data.success) {
                alert("Failed to log payment on server.");
                setIsProcessing(false);
                return;
            }

            // 3. Clear cart quantity keys from sessionStorage
            Object.keys(sessionStorage).forEach(key => {
                if (key.startsWith("qty_")) {
                    sessionStorage.removeItem(key);
                }
            });

            // 4. Navigate to success page
            navigate("/paymentsuccess", {
                state: {
                    cartItems,
                    totalItems,
                    totalAmount,
                    paymentMethod,
                    user,
                    verifiedOrderId: order_id,
                    couponCode: coupon_code,
                    category,
                    mealType: location.state?.mealType
                }
            });
        } catch (err) {
            console.error("Order payment error:", err);
            alert(err.response?.data?.message || "Error processing order. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleLogout = () => {
        localStorage.clear();
        navigate("/login");
    };

    const isProceedDisabled = isProcessing || (paymentMethod === "Wallet" && remainingBalance < 0) || (isManualUpi && (!utrNumber || utrNumber.trim().length === 0));


    return (
        <div className="payment-page">
            <div className="payment-main-card">

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
                <div className="payment-content">

                    <button
                        className="back-button"
                        onClick={() => navigate(-1)}
                    >
                        <FaArrowLeft /> Back
                    </button>

                    <div className="payment-title">
                        <h2>Payment Summary</h2>
                        <p>{user?.full_name} | {user?.username}</p>
                    </div>

                    {/* ORDER SUMMARY */}
                    <div className="payment-card">
                        <h3>Order Summary</h3>

                        {cartItems.length > 0 ? (
                            cartItems.map((item) => (
                                <div className="info-row" key={item.id}>
                                    <span>{item.name} x {item.selectedQty}</span>
                                    <strong>₹{Number(item.price) * item.selectedQty}</strong>
                                </div>
                            ))
                        ) : (
                            <div className="info-row">
                                <span>No items selected</span>
                            </div>
                        )}

                        <div className="info-row total-row">
                            <span>Total Items</span>
                            <strong>{totalItems}</strong>
                        </div>

                        <div className="info-row total-row">
                            <span>Total Amount</span>
                            <strong>₹{totalAmount}</strong>
                        </div>
                    </div>

                    {/* PAYMENT METHOD SELECTION */}
                    <div className="payment-card">
                        <h3>Select Payment Method</h3>

                        {/* EASEBUZZ ONLINE PAYMENT GATEWAY (RECOMMENDED) */}
                        {user?.role !== "ADMIN" && (
                            <label className={`payment-option ${paymentMethod === "Easebuzz" ? "selected-option" : ""}`} style={{ border: paymentMethod === "Easebuzz" ? "2px solid #16a34a" : "1px solid #e2e8f0" }}>
                                <input
                                    type="radio"
                                    name="payment_method_group"
                                    checked={paymentMethod === "Easebuzz"}
                                    onChange={() => setPaymentMethod("Easebuzz")}
                                />
                                <span>
                                    ⚡ <strong>Instant Online Payment (Easebuzz)</strong>
                                    <span style={{ fontSize: "11px", color: "#16a34a", fontWeight: "700", marginLeft: "6px", background: "#dcfce7", padding: "2px 6px", borderRadius: "4px" }}>Auto-Verified</span>
                                </span>
                            </label>
                        )}

                        {/* WALLET OPTION */}
                        {user?.role !== "ADMIN" && (
                            <label className={`payment-option ${paymentMethod === "Wallet" ? "selected-option" : ""}`}>
                                <input
                                    type="radio"
                                    name="payment_method_group"
                                    checked={paymentMethod === "Wallet"}
                                    onChange={() => setPaymentMethod("Wallet")}
                                />
                                <span>Wallet Balance (₹{walletBalance.toFixed(2)})</span>
                            </label>
                        )}

                        {/* ADMIN OPTIONS */}
                        {user?.role === "ADMIN" && (
                            <>
                                <label className={`payment-option ${paymentMethod === "Cash" ? "selected-option" : ""}`}>
                                    <input
                                        type="radio"
                                        name="payment_method_group"
                                        checked={paymentMethod === "Cash"}
                                        onChange={() => setPaymentMethod("Cash")}
                                    />
                                    <span>Cash Payment</span>
                                </label>

                                <label className={`payment-option ${paymentMethod === "Scan QR" ? "selected-option" : ""}`}>
                                    <input
                                        type="radio"
                                        name="payment_method_group"
                                        checked={paymentMethod === "Scan QR"}
                                        onChange={() => setPaymentMethod("Scan QR")}
                                    />
                                    <span>Scan QR Code</span>
                                </label>
                            </>
                        )}

                        {/* ONLINE UPI / APP OPTIONS FOR USER */}
                        {user?.role !== "ADMIN" && (
                            upiGatewayEnabled ? (
                                <>
                                    {DISPLAYED_UPI_OPTIONS.map((app) => (
                                        <label
                                            key={app.id}
                                            className={`payment-option ${paymentMethod === app.id ? "selected-option" : ""}`}
                                            style={!app.active ? {
                                                opacity: 0.5,
                                                cursor: "not-allowed",
                                                background: "#f8fafc",
                                                color: "#94a3b8"
                                            } : {}}
                                        >
                                            <input
                                                type="radio"
                                                name="payment_method_group"
                                                checked={paymentMethod === app.id}
                                                onChange={() => {
                                                    if (app.active) setPaymentMethod(app.id);
                                                }}
                                                disabled={!app.active}
                                            />
                                            <span>
                                                {app.name} {!app.active && <span style={{ fontSize: "11px", color: "#ef4444", fontWeight: "700", marginLeft: "6px" }}>(Disabled)</span>}
                                            </span>
                                        </label>
                                    ))}
                                </>
                            ) : (
                                <div style={{
                                    marginTop: "12px",
                                    padding: "14px",
                                    background: "#fef2f2",
                                    border: "1px solid #fee2e2",
                                    borderRadius: "12px",
                                    color: "#991b1b",
                                    fontSize: "14px",
                                    fontWeight: "500",
                                    lineHeight: "1.4"
                                }}>
                                    ⚠️ Online UPI payment options are currently offline / disabled. Please pay via your Wallet balance.
                                </div>
                            )
                        )}
                    </div>

                    {/* EASEBUZZ GATEWAY DETAILS PANEL */}
                    {isEasebuzz && (
                        <div className="payment-card" style={{ background: "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)", border: "1.5px solid #86efac", borderRadius: "14px", padding: "18px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                                <FaCheckCircle style={{ color: "#16a34a", fontSize: "20px" }} />
                                <h3 style={{ margin: 0, color: "#166534", fontSize: "16px", fontWeight: "700" }}>Instant Easebuzz Checkout</h3>
                            </div>
                            <p style={{ fontSize: "13px", color: "#15803d", margin: "0 0 10px 0", lineHeight: "1.5" }}>
                                Supports <strong>Google Pay, PhonePe, Paytm, BHIM UPI, Debit/Credit Cards, and Net Banking</strong>.
                            </p>
                            <div style={{ background: "#ffffff", padding: "10px 14px", borderRadius: "8px", border: "1px dashed #86efac", fontSize: "12px", color: "#166534", display: "flex", alignItems: "center", gap: "8px" }}>
                                <span>🔒 100% Secure & Automated: Your QR Meal Coupon will be generated immediately upon successful payment without needing to enter any UTR reference number.</span>
                            </div>
                        </div>
                    )}
                    {isUpiPaymentMode && (
                        <div className="payment-card upi-details-card">
                            <h3>Pay via {paymentMethod}</h3>

                            {paymentMethod !== "Scan QR" && (
                                <div className="open-app-banner">
                                    <p>Tap button below to launch <strong>{paymentMethod}</strong> on your phone for <strong>₹{totalAmount}</strong>:</p>
                                    <button
                                        type="button"
                                        className="open-app-btn"
                                        onClick={handleOpenUpiApp}
                                    >
                                        <FaExternalLinkAlt /> Open {paymentMethod} App
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
                                                Please check your payment receipt SMS / App and enter your <strong>12-digit UTR / Reference ID</strong> below, then click <strong>Proceed & Place Order</strong>!
                                            </p>
                                        </div>
                                    )}

                                </div>

                            )}

                            <div className="qr-preview-container">
                                <h4>Official Canteen / UPI Payment QR Code (Pay ₹{totalAmount})</h4>
                                <div className="qr-box" style={{ background: "#ffffff", padding: "16px", borderRadius: "16px", boxShadow: "0 6px 20px rgba(0,0,0,0.12)", border: "2px solid #143d73", display: "inline-block" }}>
                                    <img
                                        src="/images/upi_qr.png"
                                        alt="Canteen Office UPI QR Code"
                                        style={{ width: "220px", height: "220px", objectFit: "contain", borderRadius: "10px", display: "block", margin: "0 auto" }}
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
                            </div>



                            {/* MANDATORY UTR INPUT */}
                            <div className="utr-input-section">
                                <label htmlFor="utr-input-field">
                                    Enter UPI Transaction / UTR Ref No. (Alphanumeric):
                                </label>
                                <div className="utr-input-wrapper">
                                    <input
                                        id="utr-input-field"
                                        type="text"
                                        className={`utr-input ${utrError ? "invalid" : ""}`}
                                        placeholder="Enter Transaction Ref / UTR No. (e.g. 423589123456 or PAYTM123)"
                                        value={utrNumber}
                                        onChange={handleUtrChange}
                                    />
                                </div>
                                {utrError && <p className="error-text">{utrError}</p>}
                            </div>

                        </div>
                    )}

                    {/* PAYMENT DETAILS */}
                    <div className="payment-card">
                        <h3>Payment Details</h3>

                        <div className="info-row">
                            <span>Payment Method</span>
                            <strong>{paymentMethod}</strong>
                        </div>

                        <div className="info-row">
                            <span>Amount To Pay</span>
                            <strong>₹{totalAmount}</strong>
                        </div>

                        {paymentMethod === "Wallet" && (
                            <>
                                <div className="info-row">
                                    <span>Wallet Balance</span>
                                    <strong>₹{walletBalance.toFixed(2)}</strong>
                                </div>

                                <div className="info-row">
                                    <span>Balance After Payment</span>
                                    <strong className="wallet-balance">
                                        ₹{remainingBalance.toFixed(2)}
                                    </strong>
                                </div>
                            </>
                        )}

                        {isUpiPaymentMode && (
                            <div className="info-row">
                                <span>UTR Reference No:</span>
                                <strong>{utrNumber || "Pending input..."}</strong>
                            </div>
                        )}
                    </div>

                    {/* PAY BUTTON */}
                    <div className="payment-bottom-action">
                        <button
                            className="pay-btn"
                            onClick={isEasebuzz ? handleEasebuzzPayment : handlePayment}
                            disabled={isProceedDisabled}
                            style={isEasebuzz ? { background: "linear-gradient(135deg, #16a34a, #15803d)" } : {}}
                        >
                            {isProcessing ? "Processing Payment..." : (
                                isEasebuzz
                                    ? `Pay ₹${totalAmount} with Easebuzz`
                                    : `Proceed To Pay ₹${totalAmount}`
                            )}
                        </button>
                    </div>

                </div>

                {/* FOOTER */}
                <div className="bottom-footer">
                    <div
                        className="footer-item"
                        onClick={() =>
                            navigate(user?.role === "ADMIN" ? "/admin" : "/profile")
                        }
                    >
                        <FaUser />
                        <span>{user?.role === "ADMIN" ? "Dashboard" : "Profile"}</span>
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

                    {user?.username !== "admin" && (
                        <div
                            className="footer-item"
                            onClick={() => navigate("/wallet")}
                        >
                            <FaWallet />
                            <span>Wallet</span>
                        </div>
                    )}

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

export default Payment;