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

    const createOrder = async () => {

        try {

            const category =
                cartItems[0]?.category || "Lunch";

            const payload = {

                employee_id:
                    user.employee_id,

                category,

                total_amount:
                    totalAmount,

                payment_mode:
                    paymentMethod,

                items:
                    cartItems.map(item => ({

                        item_id:
                            item.id,

                        item_name:
                            item.name,

                        quantity:
                            item.selectedQty,

                        price:
                            Number(item.price)

                    }))

            };

            console.log(
                "ORDER PAYLOAD",
                payload
            );

            const response =
                await axios.post(
                    "http://localhost:5000/api/orders/create",
                    payload
                );

            console.log(
                "ORDER SAVED",
                response.data
            );

            return response.data;

        } catch (error) {

            console.error(
                "ORDER SAVE ERROR",
                error
            );

            return null;

        }

    };

    const updateStock = async () => {
        try {
            const payload = {
                items: cartItems.map((item) => ({
                    id: item.id,
                    qty: item.selectedQty,
                })),
            };

            await axios.post(
                "http://localhost:5000/api/orders/deduct-stock",
                payload
            );

            console.log("Stock Updated");
        } catch (error) {
            console.error(error);
        }
    };

    const [loading, setLoading] =
        useState(true);

    useEffect(() => {

        const processOrder = async () => {

            try {

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
                    return;
                }

                const alreadyCreated =
                    sessionStorage.getItem(
                        "orderCreated"
                    );

                if (
                    alreadyCreated &&
                    location.state
                ) {

                    const now =
                        new Date();

                    setPaymentDetails({
                        orderId: "ORDER CREATED",
                        meal:
                            cartItems
                                .map(item =>
                                    `${item.name} x ${item.selectedQty}`
                                )
                                .join(", "),
                        amount:
                            `₹${totalAmount}`,
                        paymentMode:
                            paymentMethod,
                        date:
                            now.toLocaleDateString(),
                        time:
                            now.toLocaleTimeString(),
                        couponCode: "CPN" + Date.now()
                    });

                    setLoading(false);

                    return;
                }

                if (
                    cartItems.length === 0
                ) {
                    setLoading(false);
                    return;
                }

                const orderResult =
                    await createOrder();

                console.log(
                    "ORDER RESULT",
                    orderResult
                );

                if (
                    orderResult?.success
                ) {

                    await axios.post(
                        "http://localhost:5000/api/payments/create",
                        {
                            order_id:
                                orderResult.order_id,

                            employee_id:
                                user.employee_id,

                            amount:
                                totalAmount,

                            payment_method:
                                paymentMethod
                        }
                    );

                    const now =
                        new Date();

                    setPaymentDetails({
                        orderId:
                            `ORD${orderResult.order_id}`,

                        meal:
                            cartItems
                                .map(item =>
                                    `${item.name} x ${item.selectedQty}`
                                )
                                .join(", "),

                        amount:
                            `₹${totalAmount}`,

                        paymentMode:
                            paymentMethod,

                        date:
                            now.toLocaleDateString(),
                        time:
                            now.toLocaleTimeString(),
                        couponCode: orderResult.coupon_code
                    });

                    sessionStorage.setItem(
                        "orderCreated",
                        "true"
                    );
                }

                setLoading(false);

            } catch (err) {

                console.error(err);

                setLoading(false);
            }
        };

        processOrder();

    }, []);

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
                        <FaCheckCircle className="success-icon" />

                        <h1>Payment Successful</h1>

                        <p>
                            Your meal order has been confirmed successfully.
                        </p>
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
                                <button
                                    className="coupon-btn"
                                    onClick={() => navigate("/coupons")}
                                >
                                    <FaTicketAlt />
                                    Generate Coupon
                                </button>
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