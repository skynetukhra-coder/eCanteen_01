import React, {
    useEffect,
    useState
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";

import {
    FaCheckCircle,
    FaReceipt,
    FaTicketAlt,
    FaUser,
    FaClipboardList,
    FaWallet,
    FaSignOutAlt,
    FaPrint
} from "react-icons/fa";

import "./PaymentSuccess.css";

function PaymentSuccess() {

    const [paymentDetails, setPaymentDetails] =
        useState(null);

    const navigate = useNavigate();
    const location = useLocation();

    const cartItems =
        location.state?.cartItems || [];

    const totalAmount =
        location.state?.totalAmount || 0;

    const paymentMethod =
        location.state?.paymentMethod || "Wallet";

    const user =
        location.state?.user ||
        JSON.parse(
            localStorage.getItem("user")
        );

    const category = location.state?.category || (cartItems[0]?.category || "Lunch");
    const mealType = location.state?.mealType || "";
    const isTiffin = mealType.toLowerCase() === "tiffin" || category.toLowerCase() === "tiffin";

    const [loading, setLoading] =
        useState(true);

    useEffect(() => {
        const verifiedOrderId = location.state?.verifiedOrderId;
        if (verifiedOrderId) {
            const now = new Date();
            setPaymentDetails({
                orderId: `ORD${verifiedOrderId}`,
                meal: cartItems.map(item => `${item.name} x ${item.selectedQty}`).join(", "),
                amount: `₹${totalAmount}`,
                paymentMode: paymentMethod,
                date: now.toLocaleDateString(),
                time: now.toLocaleTimeString(),
                couponCode: location.state?.couponCode || "CPN" + Date.now()
            });
            setLoading(false);
        } else {
            // Fallback for direct page access - redirect to home
            navigate("/home");
        }
    }, [location.state, navigate]);

    const handleLogout = () => {

        sessionStorage.removeItem(
            "orderCreated"
        );
        localStorage.clear();
        navigate("/login");
    };

    return (
        <div className="success-page">
            <div className="success-main-card">

                {/* HEADER */}

                <div className="department-header">
                    <img
                        src="/images/images.png"
                        alt="Government Logo"
                        className="dept-logo"
                    />

                    <div className="dept-title">
                        <h1>
                            Office of the Principal Accountant General (A&E), W.B.
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

                <div className="success-content">

                    <div className="success-card">
                        {paymentMethod === "Wallet" || paymentMethod === "Cash" ? (
                            <>
                                <FaCheckCircle className="success-icon" />
                                <h1>Payment Successful</h1>
                                <p>
                                    Your meal order has been confirmed successfully.
                                </p>
                            </>
                        ) : (
                            <>
                                <div style={{ fontSize: "48px", color: "#d97706", marginBottom: "12px" }}>⏳</div>
                                <h1 style={{ color: "#d97706" }}>Payment Processed, Awaiting Confirmation</h1>
                                <p style={{ color: "#475569", fontWeight: "500" }}>
                                    Your UPI payment and 12-digit UTR Ref No. have been submitted. Your food coupon will be generated as soon as the Admin approves your payment.
                                </p>
                            </>
                        )}
                    </div>


                    {/* RECEIPT */}

                    <div className="receipt-card">
                        <div className="receipt-header">
                            <FaReceipt />
                            <h3>Payment Receipt</h3>
                        </div>

                        <div className="receipt-row">
                            <span>Order ID</span>
                            <strong>{paymentDetails?.orderId || "-"}</strong>
                        </div>

                        <div className="receipt-row">
                            <span>Meal</span>
                            <strong>{paymentDetails?.meal || "-"}</strong>
                        </div>

                        <div className="receipt-row">
                            <span>Amount</span>
                            <strong>{paymentDetails?.amount || "-"}</strong>
                        </div>

                        <div className="receipt-row">
                            <span>Payment Mode</span>
                            <strong>{paymentDetails?.paymentMode || "-"}</strong>
                        </div>

                        <div className="receipt-row">
                            <span>Date</span>
                            <strong>{paymentDetails?.date || "-"}</strong>
                        </div>

                        <div className="receipt-row">
                            <span>Time</span>
                            <strong>{paymentDetails?.time || "-"}</strong>
                        </div>
                    </div>

                    {/* ACTION BUTTONS */}

                    <div className="success-actions">

                        {user?.role === "ADMIN" ? (
                            <>
                                {!isTiffin && (
                                    <button
                                        className="coupon-btn"
                                        onClick={() => {
                                            window.print();
                                            sessionStorage.removeItem("orderCreated");
                                            navigate("/home");
                                        }}
                                        style={{ background: "#7c3aed" }}
                                    >
                                        <FaPrint />
                                        Print Coupon
                                    </button>
                                )}
                                {isTiffin && (
                                    <button
                                        className="coupon-btn"
                                        onClick={() => {
                                            sessionStorage.removeItem("orderCreated");
                                            navigate("/orders");
                                        }}
                                        style={{ background: "#10b981" }}
                                    >
                                        <FaClipboardList />
                                        View Orders
                                    </button>
                                )}
                                <button
                                    className="home-btn"
                                    onClick={() => {
                                        sessionStorage.removeItem("orderCreated");
                                        navigate("/admin");
                                    }}
                                >
                                    Back to Dashboard
                                </button>
                            </>
                        ) : (
                            <>
                                {!isTiffin && (
                                    <button
                                        className="coupon-btn"
                                        onClick={() => {
                                            sessionStorage.removeItem("orderCreated");
                                            navigate("/coupons");
                                        }}
                                    >
                                        <FaTicketAlt />
                                        Generate Coupon
                                    </button>
                                )}
                                {isTiffin && (
                                    <button
                                        className="coupon-btn"
                                        onClick={() => {
                                            sessionStorage.removeItem("orderCreated");
                                            navigate("/orders");
                                        }}
                                        style={{ background: "#10b981" }}
                                    >
                                        <FaClipboardList />
                                        View Orders
                                    </button>
                                )}
                                <button
                                    className="home-btn"
                                    onClick={() => {
                                        sessionStorage.removeItem("orderCreated");
                                        navigate("/home");
                                    }}
                                >
                                    Back To Home
                                </button>
                            </>
                        )}

                    </div>

                    {/* PRINT AREA FOR ADMINISTRATIVE GUEST COUPONS */}
                    <div className="print-area" style={{ display: "none" }}>
                        <div style={{ padding: "20px", border: "2px dashed #000", borderRadius: "10px", width: "280px", margin: "20px auto", textAlign: "center", fontFamily: "monospace" }}>
                            <h2 style={{ margin: "0 0 5px 0", fontSize: "16px", fontWeight: "bold" }}>eCANTEEN GUEST COUPON</h2>
                            <p style={{ margin: "0 0 10px 0", fontSize: "10px" }}>Office of the PAG (A&E) West Bengal</p>
                            <div style={{ borderBottom: "1px dashed #000", marginBottom: "10px" }}></div>
                            <p style={{ margin: "4px 0", fontSize: "11px" }}>Order ID: <strong>{paymentDetails?.orderId}</strong></p>
                            <p style={{ margin: "4px 0", fontSize: "11px" }}>Meal Category: <strong>{cartItems[0]?.category || "Canteen"}</strong></p>
                            <p style={{ margin: "6px 0", fontSize: "12px" }}>Item: <strong>{paymentDetails?.meal}</strong></p>
                            <p style={{ margin: "4px 0", fontSize: "11px" }}>Amount Paid: <strong>{paymentDetails?.amount}</strong></p>
                            <p style={{ margin: "4px 0", fontSize: "11px" }}>Payment Mode: <strong>{paymentDetails?.paymentMode}</strong></p>
                            <div style={{ borderBottom: "1px dashed #000", margin: "10px 0" }}></div>
                            <h3 style={{ margin: "10px 0", fontSize: "15px", letterSpacing: "1px", fontWeight: "bold" }}>{paymentDetails?.couponCode || "CPN-GUEST"}</h3>
                            <p style={{ fontSize: "9px", color: "#444" }}>Date: {paymentDetails?.date} {paymentDetails?.time}</p>
                        </div>
                    </div>

                </div>

                {/* FOOTER */}

                <div className="bottom-footer">

                    <div
                        className="footer-item"
                        onClick={() => navigate(user?.role === "ADMIN" ? "/admin" : "/profile")}
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

export default PaymentSuccess;