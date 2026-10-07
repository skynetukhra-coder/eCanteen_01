const express = require("express");
const router = express.Router();
const db = require("../config/db");
const crypto = require("crypto");

const HMAC_SECRET = "canteen_wallet_integrity_key";

function generateWalletSignature(employeeId, balance) {
    const formattedBalance = parseFloat(balance).toFixed(2);
    return crypto
        .createHmac("sha256", HMAC_SECRET)
        .update(`${employeeId}:${formattedBalance}`)
        .digest("hex");
}


const Razorpay = require("razorpay");

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_51t91lKz9382jD",
    key_secret: process.env.RAZORPAY_KEY_SECRET || "rXz51T91lKz9382jD1234567"
});

// CREATE RAZORPAY ORDER
router.post("/razorpay-order", async (req, res) => {
    try {
        const { amount } = req.body;
        if (!amount || isNaN(amount)) {
            return res.status(400).json({ success: false, message: "Invalid amount." });
        }
        const options = {
            amount: Math.round(parseFloat(amount) * 100), // Razorpay expects amount in paise
            currency: "INR",
            receipt: `rcpt_${Date.now()}`
        };

        const rzpOrder = await razorpay.orders.create(options);
        res.json({
            success: true,
            order_id: rzpOrder.id,
            amount: rzpOrder.amount,
            currency: rzpOrder.currency
        });
    } catch (error) {
        console.error("Razorpay order creation error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// VERIFY ONLINE PAYMENT SIGNATURE
router.post("/verify-online", async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            order_payload
        } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !order_payload) {
            return res.status(400).json({ success: false, message: "Missing required verification data." });
        }

        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSign = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "rXz51T91lKz9382jD1234567")
            .update(sign)
            .digest("hex");

        if (razorpay_signature !== expectedSign) {
            return res.status(400).json({ success: false, message: "Payment verification failed. Signature mismatch." });
        }

        // Fetch last payment ID to format next database ID (e.g., PAY0026)
        const [lastPayment] = await db.query(`
            SELECT payment_id
            FROM payments
            ORDER BY payment_id DESC
            LIMIT 1
        `);

        let paymentId = "PAY0001";
        if (lastPayment.length > 0) {
            const lastNo = parseInt(lastPayment[0].payment_id.replace("PAY", ""));
            paymentId = `PAY${String(lastNo + 1).padStart(4, "0")}`;
        }

        // Avoid duplicate order insertions (if request was sent twice)
        const [existingOrder] = await db.query(
            "SELECT order_id FROM orders WHERE coupon_code = ?",
            [order_payload.coupon_code]
        );

        let orderId;
        if (existingOrder.length > 0) {
            orderId = existingOrder[0].order_id;
        } else {
            // 1. Insert order
            const [orderResult] = await db.query(
                `INSERT INTO orders 
                (employee_id, category, total_amount, payment_mode, payment_status, order_status, coupon_code, qr_code_path) 
                VALUES (?, ?, ?, ?, 'SUCCESS', ?, ?, ?)`,
                [
                    order_payload.employee_id,
                    order_payload.category,
                    order_payload.total_amount,
                    order_payload.payment_mode,
                    (order_payload.category && order_payload.category.toLowerCase() === 'tiffin') ? 'REDEEMED' : 'COUPON_GENERATED',
                    order_payload.coupon_code,
                    `/qr/${order_payload.coupon_code}.png`
                ]
            );
            orderId = orderResult.insertId;

            // 2. Insert items
            for (const item of order_payload.items) {
                await db.query(
                    `INSERT INTO order_items 
                    (order_id, item_id, item_name, quantity, unit_price, total_price) 
                    VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                        orderId,
                        item.item_id,
                        item.item_name,
                        item.quantity,
                        item.price,
                        Number(item.price) * parseInt(item.quantity)
                    ]
                );
            }
        }

        // 3. Insert payment record
        const [existingPayment] = await db.query(
            "SELECT payment_id FROM payments WHERE order_id = ?",
            [orderId]
        );

        if (existingPayment.length === 0) {
            await db.query(
                `INSERT INTO payments 
                (payment_id, order_id, employee_id, amount, payment_method, payment_status, remarks) 
                VALUES (?, ?, ?, ?, ?, 'SUCCESS', ?)`,
                [
                    paymentId,
                    orderId,
                    order_payload.employee_id,
                    order_payload.total_amount,
                    order_payload.payment_mode,
                    `Razorpay ID: ${razorpay_payment_id}`
                ]
            );

            // Log inside audit logs
            await db.query(
                "INSERT INTO audit_logs (action_name, details, severity) VALUES ('MEAL_PURCHASE_ONLINE', ?, 'INFO')",
                [`Employee ID ${order_payload.employee_id} paid ₹${order_payload.total_amount} via Online (${order_payload.payment_mode}) for Order ID ${orderId}.`]
            );
        }

        res.json({
            success: true,
            order_id: orderId,
            payment_id: paymentId
        });

    } catch (err) {
        console.error("Verification DB Error:", err);
        res.status(500).json({ success: false, message: "Internal server error during database operations." });
    }
});

// CREATE PAYMENT
router.post("/create", async (req, res) => {

    console.log("PAYMENT REQUEST:", req.body);

    try {

        const {
            order_id,
            employee_id,
            amount,
            payment_method,
            remarks,
            utr_number
        } = req.body;

        const paymentRemarks = remarks || (utr_number ? `UTR: ${utr_number}` : `Paid via ${payment_method}`);

        // Check UTR uniqueness across payments and wallet transactions
        if (utr_number && utr_number.trim()) {
            const cleanUtr = utr_number.trim();
            const [existingPay] = await db.query(
                "SELECT payment_id FROM payments WHERE remarks LIKE ? AND order_id != ?",
                [`%${cleanUtr}%`, order_id]
            );
            if (existingPay.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: "This UTR / Transaction Ref No. has already been used for another order."
                });
            }

            const [existingWt] = await db.query(
                "SELECT transaction_id FROM wallet_transactions WHERE utr_number = ? AND status != 'CANCELLED'",
                [cleanUtr]
            );
            if (existingWt.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: "This UTR / Transaction Ref No. has already been used for a wallet recharge."
                });
            }
        }

        // Check if payment already exists for this order_id to prevent double charges/wallet deductions

        const [existingPayment] = await db.query(
            "SELECT payment_id FROM payments WHERE order_id = ?",
            [order_id]
        );
        if (existingPayment.length > 0) {
            console.log(`[Idempotency] Duplicate payment logged for Order ID: ${order_id}. Returning existing payment.`);
            return res.json({
                success: true,
                payment_id: existingPayment[0].payment_id,
                duplicated: true
            });
        }

        let empId = employee_id;

        // Redirect admin checkouts to dedicated guest 'admin_user'
        const [empRows] = await db.query(
            "SELECT role FROM employee WHERE employee_id = ?",
            [employee_id]
        );
        if (empRows.length > 0 && empRows[0].role === 'ADMIN') {
            const [adminGuestRows] = await db.query(
                "SELECT employee_id FROM employee WHERE username = 'admin_user'"
            );
            if (adminGuestRows.length > 0) {
                empId = adminGuestRows[0].employee_id;
            }
        }

        const [lastPayment] =
            await db.query(`
                SELECT payment_id
                FROM payments
                ORDER BY payment_id DESC
                LIMIT 1
            `);

        let paymentId = "PAY0001";

        if (lastPayment.length > 0) {
            const lastNo =
                parseInt(
                    lastPayment[0]
                        .payment_id
                        .replace("PAY", "")
                );

            paymentId =
                `PAY${String(lastNo + 1)
                    .padStart(4, "0")}`;
        }

        const isUpiPayment = payment_method !== "Wallet" && payment_method !== "Cash";
        const initialStatus = isUpiPayment ? "PENDING" : "SUCCESS";

        if (payment_method === "Wallet") {
            const [walletRows] = await db.query(
                "SELECT balance, signature FROM wallets WHERE employee_id = ?",
                [empId]
            );
            if (walletRows.length === 0) {
                return res.status(400).json({ success: false, message: "Wallet not initialized." });
            }
            const currentBalance = parseFloat(walletRows[0].balance);
            const signature = walletRows[0].signature;
            const expectedSig = generateWalletSignature(empId, currentBalance);

            if (expectedSig !== signature) {
                const details = `CRITICAL ALERT: Tampering detected for Wallet of Employee ID ${empId}. Attempted meal purchase of ₹${amount} was aborted.`;
                await db.query(
                    "INSERT INTO audit_logs (action_name, details, severity) VALUES ('WALLET_TAMPERING_DETECTED', ?, 'CRITICAL')",
                    [details]
                );
                return res.status(400).json({ success: false, message: "Wallet integrity check failed. Canteen order aborted." });
            }

            const deductAmt = parseFloat(amount);
            if (currentBalance < deductAmt) {
                return res.status(400).json({ success: false, message: "Insufficient wallet balance." });
            }

            const newBalance = currentBalance - deductAmt;
            const newSig = generateWalletSignature(empId, newBalance);

            await db.query(
                "UPDATE wallets SET balance = ?, signature = ? WHERE employee_id = ?",
                [newBalance, newSig, empId]
            );

            // Log deduction in audit logs
            await db.query(
                "INSERT INTO audit_logs (action_name, details, severity) VALUES ('MEAL_PURCHASE_DEDUCTION', ?, 'INFO')",
                [`Employee ID ${empId} spent ₹${deductAmt} from Wallet for Canteen Order ID ${order_id}.`]
            );

            // Log inside wallet_transactions
            await db.query(
                "INSERT INTO wallet_transactions (employee_id, type, amount, title) VALUES (?, 'debit', ?, 'Meal Coupon (Wallet)')",
                [empId, deductAmt]
            );
        } else {
            // Log direct UPI / App payment in audit logs
            await db.query(
                "INSERT INTO audit_logs (action_name, details, severity) VALUES ('MEAL_PURCHASE_UPI', ?, 'INFO')",
                [`Employee ID ${empId} paid ₹${amount} via ${payment_method} (${paymentRemarks}) for Canteen Order ID ${order_id}. Status: PENDING ADMIN APPROVAL.`]
            );

            // Update order status to PENDING_APPROVAL so coupon is held until admin approval
            try {
                await db.query(
                    "UPDATE orders SET payment_status = 'PENDING', order_status = 'PENDING_APPROVAL' WHERE order_id = ?",
                    [order_id]
                );
            } catch (statusErr) {
                if (statusErr.code === 'WARN_DATA_TRUNCATED' || statusErr.errno === 1265) {
                    await db.query("ALTER TABLE orders MODIFY COLUMN order_status VARCHAR(50) DEFAULT 'COUPON_GENERATED'").catch(() => {});
                    await db.query(
                        "UPDATE orders SET payment_status = 'PENDING', order_status = 'PENDING_APPROVAL' WHERE order_id = ?",
                        [order_id]
                    );
                } else {
                    throw statusErr;
                }
            }
        }

        await db.query(
            `
            INSERT INTO payments
            (
                payment_id,
                order_id,
                employee_id,
                amount,
                payment_method,
                payment_status,
                remarks
            )
            VALUES
            (?, ?, ?, ?, ?, ?, ?)
            `,
            [
                paymentId,
                order_id,
                empId,
                amount,
                payment_method,
                initialStatus,
                paymentRemarks
            ]
        );

        res.json({
            success: true,
            payment_id: paymentId,
            status: initialStatus
        });

    } catch (err) {

        console.error("CREATE PAYMENT ERROR:", err);

        res.status(500).json({
            success: false,
            message: err.message
        });

    }
});


// ADMIN PAYMENT HISTORY
router.get("/", async (req, res) => {

    try {

        const [rows] = await db.query(`
            SELECT
                p.payment_id,

                p.order_id AS raw_order_id,

                CONCAT(
                    'ORD',
                    p.order_id
                ) AS order_id,

                e.full_name AS employee_name,

                p.amount,

                p.payment_method,

                p.payment_status,

                p.remarks,

                o.order_status,

                p.payment_date AS rawDate,

                DATE_FORMAT(
                    p.payment_date,
                    '%d-%m-%Y %h:%i %p'
                ) AS payment_date

            FROM payments p

            JOIN employee e
            ON p.employee_id = e.employee_id

            LEFT JOIN orders o
            ON p.order_id = o.order_id

            ORDER BY
                p.payment_date DESC
        `);

        res.json(rows);

    } catch (err) {

        console.error("GET PAYMENTS ERROR:", err);

        res.status(500).json({
            success: false,
            message: err.message
        });

    }

});

// UPDATE PAYMENT STATUS (ADMIN APPROVE / CANCEL)
router.post("/update-status", async (req, res) => {
    try {
        const { payment_id, order_id, action } = req.body;
        if (!payment_id || !order_id || !action) {
            return res.status(400).json({
                success: false,
                message: "Missing payment_id, order_id or action."
            });
        }

        const rawOrderId = parseInt(String(order_id).replace("ORD", ""));

        if (action === "APPROVE") {
            await db.query(
                "UPDATE payments SET payment_status = 'SUCCESS' WHERE payment_id = ?",
                [payment_id]
            );
            await db.query(
                "UPDATE orders SET payment_status = 'SUCCESS', order_status = 'COUPON_GENERATED' WHERE order_id = ?",
                [rawOrderId]
            );
            await db.query(
                "INSERT INTO audit_logs (action_name, details, severity) VALUES ('PAYMENT_APPROVED', ?, 'INFO')",
                [`Admin approved payment ${payment_id} for Order ID ${rawOrderId}. Food coupon generated.`]
            );
            return res.json({
                success: true,
                message: "Payment approved successfully! Food coupon generated for user."
            });
        } else if (action === "CANCEL") {
            try {
                await db.query(
                    "UPDATE payments SET payment_status = 'CANCELLED' WHERE payment_id = ?",
                    [payment_id]
                );
            } catch (payErr) {
                if (payErr.code === 'WARN_DATA_TRUNCATED' || payErr.errno === 1265) {
                    await db.query("ALTER TABLE payments MODIFY COLUMN payment_status VARCHAR(50) DEFAULT 'PENDING'").catch(() => {});
                    await db.query(
                        "UPDATE payments SET payment_status = 'CANCELLED' WHERE payment_id = ?",
                        [payment_id]
                    ).catch(async () => {
                        await db.query("UPDATE payments SET payment_status = 'FAILED' WHERE payment_id = ?", [payment_id]);
                    });
                } else {
                    throw payErr;
                }
            }

            try {
                await db.query(
                    "UPDATE orders SET payment_status = 'FAILED', order_status = 'CANCELLED' WHERE order_id = ?",
                    [rawOrderId]
                );
            } catch (ordErr) {
                if (ordErr.code === 'WARN_DATA_TRUNCATED' || ordErr.errno === 1265) {
                    await db.query("ALTER TABLE orders MODIFY COLUMN order_status VARCHAR(50) DEFAULT 'COUPON_GENERATED'").catch(() => {});
                    await db.query("ALTER TABLE orders MODIFY COLUMN payment_status VARCHAR(50) DEFAULT 'PENDING'").catch(() => {});
                    await db.query(
                        "UPDATE orders SET payment_status = 'FAILED', order_status = 'CANCELLED' WHERE order_id = ?",
                        [rawOrderId]
                    );
                } else {
                    throw ordErr;
                }
            }

            // Restock menu items for cancelled order
            const [items] = await db.query(
                "SELECT item_id, quantity FROM order_items WHERE order_id = ?",
                [rawOrderId]
            );
            for (const item of items) {
                await db.query(
                    "UPDATE menu_items SET available_qty = available_qty + ?, issued = GREATEST(0, issued - ?) WHERE item_id = ?",
                    [item.quantity, item.quantity, item.item_id]
                );
            }

            await db.query(
                "INSERT INTO audit_logs (action_name, details, severity) VALUES ('PAYMENT_CANCELLED', ?, 'WARNING')",
                [`Admin cancelled payment ${payment_id} for Order ID ${rawOrderId}. Order cancelled & stock restored.`]
            );
            return res.json({
                success: true,
                message: "Payment cancelled. Order cancelled & menu item stock restored."
            });
        } else {
            return res.status(400).json({ success: false, message: "Invalid action." });
        }
    } catch (err) {
        console.error("UPDATE PAYMENT STATUS ERROR:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});


// EMPLOYEE PAYMENT HISTORY
router.get(
    "/employee/:employeeId",
    async (req, res) => {

        try {

            const [rows] =
                await db.query(
                    `
            SELECT

                payment_id,

                CONCAT(
                    'ORD',
                    order_id
                ) AS order_id,

                amount,

                payment_method,

                payment_status,

                payment_date

            FROM payments

            WHERE employee_id = ?

            ORDER BY
                payment_date DESC
            `,
                    [
                        req.params.employeeId
                    ]
                );

            res.json(rows);

        } catch (err) {

            res.status(500).json(err);

        }

    });

const easebuzzService = require("../services/easebuzzService");

// ----------------------------------------------------
// EASEBUZZ PAYMENT GATEWAY ROUTES
// ----------------------------------------------------

// 1. INITIATE EASEBUZZ PAYMENT
router.post("/easebuzz-initiate", async (req, res) => {
    try {
        const {
            amount,
            type = "ORDER", // "ORDER" or "WALLET_RECHARGE"
            employee_id,
            order_payload,
            customer_name,
            customer_email,
            customer_phone
        } = req.body;

        if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
            return res.status(400).json({ success: false, message: "Invalid payment amount." });
        }

        if (!employee_id) {
            return res.status(400).json({ success: false, message: "Employee ID is required." });
        }

        // Fetch user info from database if not passed
        const [empRows] = await db.query(
            "SELECT full_name, username, email, google_email, mobile FROM employee WHERE employee_id = ?",
            [employee_id]
        );
        const emp = empRows[0] || {};

        const name = (customer_name || emp.full_name || emp.username || "Employee").trim();
        const email = (customer_email || emp.email || emp.google_email || "canteen@wb.gov.in").trim();
        const phone = (customer_phone || emp.mobile || "9999999999").trim();

        // Stock verification for Food Orders
        if (type === "ORDER" && order_payload && Array.isArray(order_payload.items)) {
            for (const item of order_payload.items) {
                const [menuItemRows] = await db.query(
                    "SELECT item_name, available_qty FROM menu_items WHERE item_id = ?",
                    [item.item_id || item.id]
                );
                if (menuItemRows.length === 0) {
                    return res.status(404).json({
                        success: false,
                        message: `Item not found: ${item.item_name || item.name}`
                    });
                }
                const available = parseInt(menuItemRows[0].available_qty || 0);
                const reqQty = parseInt(item.quantity || item.selectedQty || 1);
                if (available < reqQty) {
                    return res.status(400).json({
                        success: false,
                        message: `Insufficient stock for ${menuItemRows[0].item_name}. Available: ${available}, Requested: ${reqQty}`
                    });
                }
            }
        }

        // Generate unique transaction ID
        const prefix = type === "WALLET_RECHARGE" ? "EBZ_WLT_" : "EBZ_ORD_";
        const txnid = `${prefix}${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        const productinfo = type === "WALLET_RECHARGE" ? "Canteen Wallet Recharge" : "Canteen Food Order";

        const protocol = req.headers["x-forwarded-proto"] || req.protocol || "http";
        const host = req.get("host");
        const callbackUrl = `${protocol}://${host}/api/payments/easebuzz-response`;

        const initiateResult = await easebuzzService.initiatePayment({
            txnid,
            amount,
            productinfo,
            firstname: name,
            phone,
            email,
            surl: callbackUrl,
            furl: callbackUrl,
            udf1: type,
            udf2: String(employee_id),
            udf3: type === "ORDER" && order_payload ? (order_payload.category || "General") : "Recharge"
        });

        if (!initiateResult.success) {
            return res.status(400).json(initiateResult);
        }

        return res.json({
            success: true,
            access_key: initiateResult.access_key,
            txnid,
            key: initiateResult.key,
            env: initiateResult.env
        });

    } catch (err) {
        console.error("Easebuzz initiate error:", err);
        return res.status(500).json({
            success: false,
            message: err.message || "Failed to initiate Easebuzz payment."
        });
    }
});

// 2. VERIFY EASEBUZZ PAYMENT (Called from client onResponse SDK callback)
router.post("/easebuzz-verify", async (req, res) => {
    try {
        const {
            easebuzz_response,
            type = "ORDER",
            employee_id,
            order_payload
        } = req.body;

        if (!easebuzz_response) {
            return res.status(400).json({ success: false, message: "Missing Easebuzz response payload." });
        }

        console.log("[Easebuzz Verify] Received response:", easebuzz_response);

        // 1. Check status
        if (easebuzz_response.status !== "success") {
            return res.status(400).json({
                success: false,
                message: `Payment not completed. Status: ${easebuzz_response.status || "Unknown"}`
            });
        }

        // 2. Verify reverse hash integrity
        const isHashValid = easebuzzService.verifyResponseHash(easebuzz_response);
        if (!isHashValid) {
            console.error("[Easebuzz Verify] Hash signature verification failed!");
            return res.status(400).json({
                success: false,
                message: "Security signature mismatch. Payment verification failed."
            });
        }

        const txnid = easebuzz_response.txnid;
        const easebuzzid = easebuzz_response.easebuzzid || txnid;
        const paidAmount = parseFloat(easebuzz_response.amount || 0);
        const empId = employee_id || parseInt(easebuzz_response.udf2);

        // CASE A: WALLET RECHARGE
        if (type === "WALLET_RECHARGE" || easebuzz_response.udf1 === "WALLET_RECHARGE") {
            // Idempotency check: see if transaction already processed
            const [existingTx] = await db.query(
                "SELECT transaction_id FROM wallet_transactions WHERE reference_id = ? OR utr_number = ?",
                [txnid, easebuzzid]
            );

            if (existingTx.length > 0) {
                const [walletRows] = await db.query("SELECT balance FROM wallets WHERE employee_id = ?", [empId]);
                return res.json({
                    success: true,
                    message: "Payment already processed.",
                    newBalance: walletRows[0]?.balance || 0
                });
            }

            // Fetch current wallet balance
            const [walletRows] = await db.query("SELECT balance FROM wallets WHERE employee_id = ?", [empId]);
            let currentBalance = 0.00;
            let isNewWallet = true;

            if (walletRows.length > 0) {
                currentBalance = parseFloat(walletRows[0].balance || 0);
                isNewWallet = false;
            }

            const newBalance = currentBalance + paidAmount;
            const newSig = generateWalletSignature(empId, newBalance);

            if (isNewWallet) {
                await db.query(
                    "INSERT INTO wallets (employee_id, balance, signature) VALUES (?, ?, ?)",
                    [empId, newBalance, newSig]
                );
            } else {
                await db.query(
                    "UPDATE wallets SET balance = ?, signature = ? WHERE employee_id = ?",
                    [newBalance, newSig, empId]
                );
            }

            // Log inside wallet_transactions
            await db.query(
                `INSERT INTO wallet_transactions 
                (employee_id, type, amount, status, mode, utr_number, reference_id, title) 
                VALUES (?, 'credit', ?, 'SUCCESS', 'Easebuzz Online', ?, ?, 'Instant Wallet Recharge (Easebuzz)')`,
                [empId, paidAmount, easebuzzid, txnid]
            );

            // Audit log
            await db.query(
                "INSERT INTO audit_logs (action_name, details, severity) VALUES ('WALLET_ONLINE_RECHARGE', ?, 'INFO')",
                [`Employee ID ${empId} recharged ₹${paidAmount.toFixed(2)} via Easebuzz Payment Gateway (Txn: ${txnid}, Easebuzz ID: ${easebuzzid}). New Balance: ₹${newBalance.toFixed(2)}.`]
            );

            return res.json({
                success: true,
                message: `Wallet recharged successfully! Added ₹${paidAmount.toFixed(2)}.`,
                newBalance
            });
        }

        // CASE B: FOOD ORDER
        if (!order_payload || !Array.isArray(order_payload.items)) {
            return res.status(400).json({ success: false, message: "Order payload details required for meal order." });
        }

        // Idempotency check: see if order already exists for this txnid
        const [existingOrder] = await db.query(
            "SELECT order_id, coupon_code FROM orders WHERE checkout_token = ?",
            [txnid]
        );

        if (existingOrder.length > 0) {
            return res.json({
                success: true,
                order_id: existingOrder[0].order_id,
                coupon_code: existingOrder[0].coupon_code,
                duplicated: true
            });
        }

        const couponCode = `CPN${Date.now()}`;
        const qrCodePath = `/qr/${couponCode}.png`;
        const category = order_payload.category || "Lunch";

        // 1. Insert order
        const [orderResult] = await db.query(
            `INSERT INTO orders 
            (employee_id, category, total_amount, payment_mode, payment_status, order_status, coupon_code, qr_code_path, checkout_token) 
            VALUES (?, ?, ?, 'Easebuzz Online', 'SUCCESS', ?, ?, ?, ?)`,
            [
                empId,
                category,
                paidAmount,
                (category && category.toLowerCase() === 'tiffin') ? 'REDEEMED' : 'COUPON_GENERATED',
                couponCode,
                qrCodePath,
                txnid
            ]
        );
        const orderId = orderResult.insertId;

        // 2. Insert items & deduct inventory stock
        for (const item of order_payload.items) {
            const itemId = item.item_id || item.id;
            const itemName = item.item_name || item.name;
            const quantity = parseInt(item.quantity || item.selectedQty || 1);
            const unitPrice = parseFloat(item.price || item.unit_price || 0);

            await db.query(
                `INSERT INTO order_items 
                (order_id, item_id, item_name, quantity, unit_price, total_price) 
                VALUES (?, ?, ?, ?, ?, ?)`,
                [orderId, itemId, itemName, quantity, unitPrice, unitPrice * quantity]
            );

            await db.query(
                `UPDATE menu_items 
                SET available_qty = GREATEST(0, available_qty - ?),
                    issued = issued + ?
                WHERE item_id = ?`,
                [quantity, quantity, itemId]
            );
        }

        // 3. Insert payment record
        const [lastPayment] = await db.query(`
            SELECT payment_id
            FROM payments
            ORDER BY payment_id DESC
            LIMIT 1
        `);

        let paymentId = "PAY0001";
        if (lastPayment.length > 0) {
            const lastNo = parseInt(lastPayment[0].payment_id.replace("PAY", ""));
            paymentId = `PAY${String(lastNo + 1).padStart(4, "0")}`;
        }

        await db.query(
            `INSERT INTO payments 
            (payment_id, order_id, employee_id, amount, payment_method, payment_status, remarks) 
            VALUES (?, ?, ?, ?, 'Easebuzz Online', 'SUCCESS', ?)`,
            [
                paymentId,
                orderId,
                empId,
                paidAmount,
                `Easebuzz ID: ${easebuzzid} | Txn: ${txnid}`
            ]
        );

        // 4. Audit Log
        await db.query(
            "INSERT INTO audit_logs (action_name, details, severity) VALUES ('MEAL_PURCHASE_ONLINE', ?, 'INFO')",
            [`Employee ID ${empId} paid ₹${paidAmount.toFixed(2)} via Easebuzz Online Gateway for Order ID ${orderId} (Coupon: ${couponCode}, Txn: ${txnid}).`]
        );

        return res.json({
            success: true,
            order_id: orderId,
            coupon_code: couponCode,
            payment_id: paymentId
        });

    } catch (err) {
        console.error("Easebuzz verify error:", err);
        return res.status(500).json({
            success: false,
            message: err.message || "Internal error verifying Easebuzz payment."
        });
    }
});

// 3. EASEBUZZ S2S WEBHOOK / REDIRECT CALLBACK (Fallback surl/furl)
router.post("/easebuzz-response", async (req, res) => {
    try {
        console.log("[Easebuzz Webhook/Redirect] Received body:", req.body);
        const responseBody = req.body;

        const isHashValid = easebuzzService.verifyResponseHash(responseBody);
        if (!isHashValid) {
            console.error("[Easebuzz Webhook] Invalid signature hash!");
            return res.status(400).send("Signature verification failed");
        }

        if (responseBody.status === "success") {
            const type = responseBody.udf1;
            const empId = parseInt(responseBody.udf2);
            const amount = parseFloat(responseBody.amount);
            const txnid = responseBody.txnid;
            const easebuzzid = responseBody.easebuzzid || txnid;

            if (type === "WALLET_RECHARGE" && empId) {
                const [existingTx] = await db.query(
                    "SELECT transaction_id FROM wallet_transactions WHERE reference_id = ? OR utr_number = ?",
                    [txnid, easebuzzid]
                );

                if (existingTx.length === 0) {
                    const [walletRows] = await db.query("SELECT balance FROM wallets WHERE employee_id = ?", [empId]);
                    const currentBalance = walletRows.length > 0 ? parseFloat(walletRows[0].balance || 0) : 0;
                    const newBalance = currentBalance + amount;
                    const newSig = generateWalletSignature(empId, newBalance);

                    if (walletRows.length === 0) {
                        await db.query("INSERT INTO wallets (employee_id, balance, signature) VALUES (?, ?, ?)", [empId, newBalance, newSig]);
                    } else {
                        await db.query("UPDATE wallets SET balance = ?, signature = ? WHERE employee_id = ?", [newBalance, newSig, empId]);
                    }

                    await db.query(
                        `INSERT INTO wallet_transactions 
                        (employee_id, type, amount, status, mode, utr_number, reference_id, title) 
                        VALUES (?, 'credit', ?, 'SUCCESS', 'Easebuzz Online', ?, ?, 'Instant Wallet Recharge (Easebuzz)')`,
                        [empId, amount, easebuzzid, txnid]
                    );
                }
                return res.redirect("/wallet");
            }
        }

        // Default redirect back to user portal
        return res.redirect("/home");
    } catch (err) {
        console.error("Easebuzz callback error:", err);
        return res.redirect("/home");
    }
});

module.exports = router;