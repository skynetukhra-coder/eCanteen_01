import React, {
    useState,
    useEffect
} from "react";

import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
    FaArrowLeft,
    FaUser,
    FaClipboardList,
    FaTicketAlt,
    FaWallet,
    FaSignOutAlt,
    FaCheckCircle,
    FaTimesCircle,
    FaClock,
    FaEye,
    FaRedo,
    FaQrcode,
    FaHome,
} from "react-icons/fa";


import "./Orders.css";

import upcomingImg from "../../assets/images/upcoming.jpg";
import completedImg from "../../assets/images/completed.jpg";
import cancelledImg from "../../assets/images/cancelled.jpg";

function Orders() {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem("user")) || {};

    const [activeTab, setActiveTab] =
        useState("upcoming");

    const [orders,
        setOrders] =
        useState([]);

    const [orderItemsDetails, setOrderItemsDetails] = useState({});
    const [expandedOrders, setExpandedOrders] = useState({});

    const toggleOrderDetails = async (orderId) => {
        setExpandedOrders(prev => ({
            ...prev,
            [orderId]: !prev[orderId]
        }));

        if (!orderItemsDetails[orderId]) {
            try {
                const res = await axios.get(`${window.API_BASE_URL}/api/orders/details/${orderId}`);
                if (res.data.success) {
                    setOrderItemsDetails(prev => ({
                        ...prev,
                        [orderId]: res.data.items
                    }));
                }
            } catch (err) {
                console.error("Error fetching order details:", err);
            }
        }
    };

    const handleReorder = async (order) => {
        try {
            const res = await axios.get(`${window.API_BASE_URL}/api/orders/details/${order.order_id}`);
            if (res.data.success) {
                const items = res.data.items;
                const cartItems = items.map(item => ({
                    id: item.item_id,
                    name: item.item_name,
                    price: Number(item.unit_price),
                    selectedQty: item.quantity
                }));

                const totalItems = cartItems.reduce((sum, item) => sum + item.selectedQty, 0);
                const totalAmount = cartItems.reduce((sum, item) => sum + (item.price * item.selectedQty), 0);
                const mealType = order.category ? order.category.toLowerCase() : "lunch";

                const targetPath = user?.username === "admin" ? "/admin-payment" : "/payment";
                navigate(targetPath, {
                    state: {
                        cartItems,
                        totalItems,
                        totalAmount,
                        mealType
                    }
                });
            } else {
                alert("Failed to fetch details for reordering.");
            }
        } catch (err) {
            console.error("Reorder failed:", err);
            alert("Error trying to reorder. Please try again.");
        }
    };

    useEffect(() => {
        if (!user.employee_id) return;
        axios
            .get(
                `${window.API_BASE_URL}/api/orders/employee/${user.employee_id}`
            )
            .then(res => {

                setOrders(
                    res.data
                );

            })
            .catch(err => {

                console.error(err);

            });

    }, []);

    const upcomingOrders =
        orders.filter(
            order =>
                order.order_status === "COUPON_GENERATED" ||
                order.order_status === "PENDING_APPROVAL"
        );


    const completedOrders =
        orders.filter(
            order =>
                order.order_status ===
                "REDEEMED"
        );

    const cancelledOrders =
        orders.filter(
            order =>
                order.order_status ===
                "CANCELLED"
        );

    const handleLogout = () => {

        localStorage.clear();

        navigate("/login");

    };

    return (
        <div className="orders-page">

            <div className="orders-main-card">

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
                            Treasury Buildings,
                            Kolkata - 700001
                        </p>
                    </div>

                    <img
                        src="/images/IA&AS_Logo.png"
                        alt="IAAS Logo"
                        className="dept-logo"
                    />

                </div>

                {/* CONTENT */}

                <div className="orders-content">

                    <button
                        className="back-button"
                        onClick={() => navigate(-1)}
                    >
                        <FaArrowLeft />
                        Back
                    </button>

                    <div className="orders-title-section">
                        <h2>My Orders</h2>
                        <p>
                            Track your canteen orders,
                            coupons and meal history
                        </p>
                    </div>

                    {/* TABS */}

                    <div className="status-cards">

                        <div
                            className={`status-card ${activeTab === "upcoming"
                                ? "active-card"
                                : ""
                                }`}
                            onClick={() =>
                                setActiveTab("upcoming")
                            }
                            style={{
                                backgroundImage: `url(${upcomingImg})`,
                            }}
                        >
                            <div className="overlay">
                                <h2>{upcomingOrders.length}</h2>
                                <span>Upcoming</span>
                            </div>
                        </div>

                        <div
                            className={`status-card ${activeTab === "completed"
                                ? "active-card"
                                : ""
                                }`}
                            onClick={() =>
                                setActiveTab("completed")
                            }
                            style={{
                                backgroundImage: `url(${completedImg})`,
                            }}
                        >
                            <div className="overlay">
                                <h2>{completedOrders.length}</h2>
                                <span>Completed</span>
                            </div>
                        </div>



                    </div>

                    {/* UPCOMING */}

                    {activeTab === "upcoming" && (

                        <div className="order-list">

                            {upcomingOrders.map(
                                (order) => (
                                    <div
                                        className="order-card"
                                        key={order.order_id}
                                    >

                                        <div className="order-top">

                                            <div className="order-icon upcoming-icon">
                                                <FaClock />
                                            </div>

                                            <div>
                                                <h3>
                                                    {
                                                        order.items
                                                    }
                                                </h3>

                                                <span>
                                                    ORD{
                                                        order.order_id
                                                    }
                                                </span>
                                            </div>

                                        </div>

                                        <div className="order-info">

                                            <p>
                                                <strong>
                                                    Amount:
                                                </strong>{" "}
                                                ₹{
                                                    order.total_amount
                                                }
                                            </p>

                                            <p>
                                                <strong>
                                                    Date:
                                                </strong>{" "}
                                                {
                                                    new Date(
                                                        order.created_at
                                                    ).toLocaleDateString()
                                                }
                                            </p>

                                        </div>

                                        <span className={order.order_status === "PENDING_APPROVAL" ? "status pending" : "status upcoming"}>
                                            {order.order_status === "PENDING_APPROVAL" ? "Awaiting Confirmation" : "Coupon Generated"}
                                        </span>


                                        {/* DETAILS PANEL */}
                                        {expandedOrders[order.order_id] && (
                                            <div className="order-items-detail" style={{ margin: "15px 0", padding: "12px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                                                <h4 style={{ margin: "0 0 8px 0", color: "#475569", fontSize: "14px" }}>Item Details:</h4>
                                                {orderItemsDetails[order.order_id] ? (
                                                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                                        {orderItemsDetails[order.order_id].map(item => (
                                                            <div key={item.order_item_id} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#334155" }}>
                                                                <span>{item.item_name} <strong>x {item.quantity}</strong></span>
                                                                <strong>₹{(item.unit_price * item.quantity).toFixed(2)}</strong>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span style={{ fontSize: "12px", color: "#64748b" }}>Loading items...</span>
                                                )}
                                            </div>
                                        )}

                                        <div className="order-actions">

                                            <button
                                                className="secondary-btn"
                                                onClick={() => toggleOrderDetails(order.order_id)}
                                            >
                                                <FaEye />
                                                {expandedOrders[order.order_id] ? "Hide Details" : "Details"}
                                            </button>

                                        </div>

                                    </div>
                                )
                            )}

                        </div>

                    )}

                    {/* COMPLETED */}

                    {activeTab === "completed" && (

                        <div className="order-list">

                            {completedOrders.map(
                                (order) => (
                                    <div
                                        className="order-card"
                                        key={order.order_id}
                                    >

                                        <div className="order-top">

                                            <div className="order-icon completed-icon">
                                                <FaCheckCircle />
                                            </div>

                                            <div>
                                                <h3>
                                                    {
                                                        order.items
                                                    }
                                                </h3>

                                                <span>
                                                    ORD{
                                                        order.order_id
                                                    }
                                                </span>
                                            </div>

                                        </div>

                                        <div className="order-info">

                                            <p>
                                                <strong>
                                                    Amount:
                                                </strong>{" "}
                                                ₹{order.total_amount}
                                            </p>

                                            <p>
                                                <strong>Date:</strong>{" "}
                                                {
                                                    new Date(
                                                        order.created_at
                                                    ).toLocaleDateString()
                                                }
                                            </p>

                                        </div>

                                        <span className="status completed">
                                            Redeemed
                                        </span>

                                        {/* DETAILS PANEL */}
                                        {expandedOrders[order.order_id] && (
                                            <div className="order-items-detail" style={{ margin: "15px 0", padding: "12px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                                                <h4 style={{ margin: "0 0 8px 0", color: "#475569", fontSize: "14px" }}>Item Details:</h4>
                                                {orderItemsDetails[order.order_id] ? (
                                                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                                        {orderItemsDetails[order.order_id].map(item => (
                                                            <div key={item.order_item_id} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#334155" }}>
                                                                <span>{item.item_name} <strong>x {item.quantity}</strong></span>
                                                                <strong>₹{(item.unit_price * item.quantity).toFixed(2)}</strong>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span style={{ fontSize: "12px", color: "#64748b" }}>Loading items...</span>
                                                )}
                                            </div>
                                        )}

                                        <div className="order-actions">

                                            <button 
                                                className="secondary-btn"
                                                onClick={() => toggleOrderDetails(order.order_id)}
                                            >
                                                <FaEye />
                                                {expandedOrders[order.order_id] ? "Hide Details" : "Details"}
                                            </button>

                                            <button
                                                className="primary-btn"
                                                onClick={() => handleReorder(order)}
                                            >
                                                <FaRedo />
                                                Reorder
                                            </button>

                                        </div>

                                    </div>
                                )
                            )}

                        </div>

                            )}

                </div>

                {/* FOOTER */}

                <div className="bottom-footer">

                    {user?.username !== "admin" && (
                        <div
                            className="footer-item"
                            onClick={() => navigate("/home")}
                        >
                            <FaHome />
                            <span>Home</span>
                        </div>
                    )}

                    <div
                        className="footer-item"
                        onClick={() =>
                            navigate("/orders")
                        }
                    >
                        <FaClipboardList />
                        <span>Orders</span>
                    </div>

                    <div
                        className="footer-item"
                        onClick={() =>
                            navigate("/coupons")
                        }
                    >
                        <FaTicketAlt />
                        <span>Coupons</span>
                    </div>

                    {user?.username !== "admin" && (
                        <div
                            className="footer-item"
                            onClick={() =>
                                navigate("/wallet")
                            }
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

export default Orders;