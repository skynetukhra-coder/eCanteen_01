<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Employee;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use App\Services\EasebuzzService;
use App\Services\WalletService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PaymentController extends Controller
{
    protected EasebuzzService $easebuzzService;
    protected WalletService $walletService;

    public function __construct(EasebuzzService $easebuzzService, WalletService $walletService)
    {
        $this->easebuzzService = $easebuzzService;
        $this->walletService = $walletService;
    }

    /**
     * Generate sequential Payment ID (e.g. PAY0026)
     */
    protected function generatePaymentId(): string
    {
        $lastPayment = Payment::orderBy('payment_id', 'desc')->first();
        if ($lastPayment && preg_match('/^PAY(\d+)$/', $lastPayment->payment_id, $matches)) {
            $lastNo = (int)$matches[1];
            return 'PAY' . str_pad($lastNo + 1, 4, '0', STR_PAD_LEFT);
        }
        return 'PAY0001';
    }

    /**
     * Resolve employee ID (redirects ADMIN orders to guest admin_user)
     */
    protected function resolveEmployeeId(int|string $employeeId): int|string
    {
        $emp = Employee::find($employeeId);
        if ($emp && $emp->role === 'ADMIN') {
            $adminGuest = Employee::where('username', 'admin_user')->first();
            if ($adminGuest) {
                return $adminGuest->employee_id;
            }
        }
        return $employeeId;
    }

    // ----------------------------------------------------
    // EASEBUZZ PAYMENT GATEWAY HANDLERS
    // ----------------------------------------------------

    public function easebuzzInitiate(Request $request)
    {
        try {
            $amount = $request->input('amount');
            $type = $request->input('type', 'ORDER');
            $employeeId = $request->input('employee_id');
            $orderPayload = $request->input('order_payload');
            $customerName = $request->input('customer_name');
            $customerEmail = $request->input('customer_email');
            $customerPhone = $request->input('customer_phone');

            if (!$amount || !is_numeric($amount) || (float)$amount <= 0) {
                return response()->json(['success' => false, 'message' => 'Invalid payment amount.'], 400);
            }

            if (!$employeeId) {
                return response()->json(['success' => false, 'message' => 'Employee ID is required.'], 400);
            }

            $emp = Employee::find($employeeId);
            $name = trim((string)($customerName ?: ($emp?->full_name ?: ($emp?->username ?: 'Employee'))));
            $email = trim((string)($customerEmail ?: ($emp?->email ?: ($emp?->google_email ?: 'canteen@wb.gov.in'))));
            $phone = trim((string)($customerPhone ?: ($emp?->mobile ?: '9999999999')));

            // Stock verification for Food Orders
            if ($type === 'ORDER' && $orderPayload && isset($orderPayload['items']) && is_array($orderPayload['items'])) {
                foreach ($orderPayload['items'] as $item) {
                    $itemId = $item['item_id'] ?? $item['id'];
                    $menuItem = MenuItem::find($itemId);
                    if (!$menuItem) {
                        return response()->json([
                            'success' => false,
                            'message' => 'Item not found: ' . ($item['item_name'] ?? $item['name'] ?? '')
                        ], 404);
                    }
                    $available = (int)$menuItem->available_qty;
                    $reqQty = (int)($item['quantity'] ?? $item['selectedQty'] ?? 1);
                    if ($available < $reqQty) {
                        return response()->json([
                            'success' => false,
                            'message' => "Insufficient stock for {$menuItem->item_name}. Available: {$available}, Requested: {$reqQty}"
                        ], 400);
                    }
                }
            }

            $prefix = ($type === 'WALLET_RECHARGE') ? 'EBZ_WLT_' : 'EBZ_ORD_';
            $txnid = $prefix . round(microtime(true) * 1000) . '_' . random_int(100, 999);
            $productinfo = ($type === 'WALLET_RECHARGE') ? 'Canteen Wallet Recharge' : 'Canteen Food Order';

            $callbackUrl = url('/api/payments/easebuzz-response');

            $initiateResult = $this->easebuzzService->initiatePayment([
                'txnid' => $txnid,
                'amount' => $amount,
                'productinfo' => $productinfo,
                'firstname' => $name,
                'phone' => $phone,
                'email' => $email,
                'surl' => $callbackUrl,
                'furl' => $callbackUrl,
                'udf1' => $type,
                'udf2' => (string)$employeeId,
                'udf3' => ($type === 'ORDER' && $orderPayload) ? ($orderPayload['category'] ?? 'General') : 'Recharge',
            ]);

            if (!$initiateResult['success']) {
                return response()->json($initiateResult, 400);
            }

            return response()->json([
                'success' => true,
                'access_key' => $initiateResult['access_key'],
                'txnid' => $txnid,
                'key' => $initiateResult['key'],
                'env' => $initiateResult['env'],
            ]);
        } catch (\Exception $e) {
            Log::error('Easebuzz initiate error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => $e->getMessage() ?: 'Failed to initiate Easebuzz payment.'
            ], 500);
        }
    }

    public function easebuzzVerify(Request $request)
    {
        try {
            $easebuzzResponse = $request->input('easebuzz_response');
            $type = $request->input('type', 'ORDER');
            $employeeId = $request->input('employee_id');
            $orderPayload = $request->input('order_payload');

            if (!$easebuzzResponse) {
                return response()->json(['success' => false, 'message' => 'Missing Easebuzz response payload.'], 400);
            }

            Log::info('[Easebuzz Verify] Received response:', (array)$easebuzzResponse);

            if (($easebuzzResponse['status'] ?? '') !== 'success') {
                return response()->json([
                    'success' => false,
                    'message' => 'Payment not completed. Status: ' . ($easebuzzResponse['status'] ?? 'Unknown')
                ], 400);
            }

            $isHashValid = $this->easebuzzService->verifyResponseHash($easebuzzResponse);
            if (!$isHashValid) {
                Log::error('[Easebuzz Verify] Hash signature verification failed!');
                return response()->json([
                    'success' => false,
                    'message' => 'Security signature mismatch. Payment verification failed.'
                ], 400);
            }

            $txnid = (string)($easebuzzResponse['txnid'] ?? '');
            $easebuzzid = (string)($easebuzzResponse['easebuzzid'] ?? $txnid);
            $paidAmount = (float)($easebuzzResponse['amount'] ?? 0);
            $empId = $employeeId ?: (int)($easebuzzResponse['udf2'] ?? 0);

            // CASE A: WALLET RECHARGE
            if ($type === 'WALLET_RECHARGE' || ($easebuzzResponse['udf1'] ?? '') === 'WALLET_RECHARGE') {
                $existingTx = WalletTransaction::where('reference_id', $txnid)
                    ->orWhere('utr_number', $easebuzzid)
                    ->first();

                if ($existingTx) {
                    $wallet = Wallet::where('employee_id', $empId)->first();
                    return response()->json([
                        'success' => true,
                        'message' => 'Payment already processed.',
                        'newBalance' => (float)($wallet?->balance ?? 0)
                    ]);
                }

                DB::beginTransaction();

                $wallet = Wallet::where('employee_id', $empId)->first();
                $currentBalance = $wallet ? (float)$wallet->balance : 0.00;
                $newBalance = $currentBalance + $paidAmount;
                $newSig = $this->walletService->generateSignature($empId, $newBalance);

                if (!$wallet) {
                    Wallet::create([
                        'employee_id' => $empId,
                        'balance' => $newBalance,
                        'signature' => $newSig
                    ]);
                } else {
                    $wallet->balance = $newBalance;
                    $wallet->signature = $newSig;
                    $wallet->save();
                }

                WalletTransaction::create([
                    'employee_id' => $empId,
                    'type' => 'credit',
                    'amount' => $paidAmount,
                    'status' => 'SUCCESS',
                    'payment_method' => 'Easebuzz Online',
                    'utr_number' => $easebuzzid,
                    'title' => 'Instant Wallet Recharge (Easebuzz)'
                ]);

                AuditLog::create([
                    'action_name' => 'WALLET_ONLINE_RECHARGE',
                    'details' => "Employee ID {$empId} recharged ₹" . number_format($paidAmount, 2) . " via Easebuzz Payment Gateway (Txn: {$txnid}, Easebuzz ID: {$easebuzzid}). New Balance: ₹" . number_format($newBalance, 2) . ".",
                    'severity' => 'INFO'
                ]);

                DB::commit();

                return response()->json([
                    'success' => true,
                    'message' => 'Wallet recharged successfully! Added ₹' . number_format($paidAmount, 2) . '.',
                    'newBalance' => $newBalance
                ]);
            }

            // CASE B: FOOD ORDER
            if (!$orderPayload || !isset($orderPayload['items']) || !is_array($orderPayload['items'])) {
                return response()->json(['success' => false, 'message' => 'Order payload details required for meal order.'], 400);
            }

            $existingOrder = Order::where('checkout_token', $txnid)->first();
            if ($existingOrder) {
                return response()->json([
                    'success' => true,
                    'order_id' => $existingOrder->order_id,
                    'coupon_code' => $existingOrder->coupon_code,
                    'duplicated' => true
                ]);
            }

            $couponCode = 'CPN' . round(microtime(true) * 1000);
            $qrCodePath = "/qr/{$couponCode}.png";
            $category = $orderPayload['category'] ?? 'Lunch';
            $isTiffin = strtolower((string)$category) === 'tiffin';

            DB::beginTransaction();

            $order = Order::create([
                'employee_id' => $empId,
                'category' => $category,
                'total_amount' => $paidAmount,
                'payment_mode' => 'Easebuzz Online',
                'payment_status' => 'SUCCESS',
                'order_status' => $isTiffin ? 'REDEEMED' : 'COUPON_GENERATED',
                'coupon_code' => $couponCode,
                'qr_code_path' => $qrCodePath,
                'checkout_token' => $txnid
            ]);
            $orderId = $order->order_id;

            foreach ($orderPayload['items'] as $item) {
                $itemId = $item['item_id'] ?? $item['id'];
                $itemName = $item['item_name'] ?? $item['name'];
                $quantity = (int)($item['quantity'] ?? $item['selectedQty'] ?? 1);
                $unitPrice = (float)($item['price'] ?? $item['unit_price'] ?? 0);

                OrderItem::create([
                    'order_id' => $orderId,
                    'item_id' => $itemId,
                    'item_name' => $itemName,
                    'quantity' => $quantity,
                    'unit_price' => $unitPrice,
                    'total_price' => $unitPrice * $quantity,
                ]);

                DB::table('menu_items')
                    ->where('item_id', $itemId)
                    ->update([
                        'available_qty' => DB::raw("GREATEST(0, available_qty - {$quantity})"),
                        'issued' => DB::raw("issued + {$quantity}")
                    ]);
            }

            $paymentId = $this->generatePaymentId();
            Payment::create([
                'payment_id' => $paymentId,
                'order_id' => $orderId,
                'employee_id' => $empId,
                'amount' => $paidAmount,
                'payment_method' => 'Easebuzz Online',
                'payment_status' => 'SUCCESS',
                'payment_date' => now(),
                'remarks' => "Easebuzz ID: {$easebuzzid} | Txn: {$txnid}"
            ]);

            AuditLog::create([
                'action_name' => 'MEAL_PURCHASE_ONLINE',
                'details' => "Employee ID {$empId} paid ₹" . number_format($paidAmount, 2) . " via Easebuzz Online Gateway for Order ID {$orderId} (Coupon: {$couponCode}, Txn: {$txnid}).",
                'severity' => 'INFO'
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'order_id' => $orderId,
                'coupon_code' => $couponCode,
                'payment_id' => $paymentId
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Easebuzz verify error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => $e->getMessage() ?: 'Internal error verifying Easebuzz payment.'
            ], 500);
        }
    }

    public function easebuzzResponse(Request $request)
    {
        try {
            Log::info('[Easebuzz Webhook/Redirect] Received payload:', $request->all());
            $responseBody = $request->all();

            $isHashValid = $this->easebuzzService->verifyResponseHash($responseBody);
            if (!$isHashValid) {
                Log::error('[Easebuzz Webhook] Invalid signature hash!');
                return response('Signature verification failed', 400);
            }

            if (($responseBody['status'] ?? '') === 'success') {
                $type = $responseBody['udf1'] ?? '';
                $empId = (int)($responseBody['udf2'] ?? 0);
                $amount = (float)($responseBody['amount'] ?? 0);
                $txnid = (string)($responseBody['txnid'] ?? '');
                $easebuzzid = (string)($responseBody['easebuzzid'] ?? $txnid);

                if ($type === 'WALLET_RECHARGE' && $empId) {
                    $existingTx = WalletTransaction::where('utr_number', $easebuzzid)->first();
                    if (!$existingTx) {
                        $wallet = Wallet::where('employee_id', $empId)->first();
                        $currentBalance = $wallet ? (float)$wallet->balance : 0.00;
                        $newBalance = $currentBalance + $amount;
                        $newSig = $this->walletService->generateSignature($empId, $newBalance);

                        if (!$wallet) {
                            Wallet::create([
                                'employee_id' => $empId,
                                'balance' => $newBalance,
                                'signature' => $newSig
                            ]);
                        } else {
                            $wallet->balance = $newBalance;
                            $wallet->signature = $newSig;
                            $wallet->save();
                        }

                        WalletTransaction::create([
                            'employee_id' => $empId,
                            'type' => 'credit',
                            'amount' => $amount,
                            'status' => 'SUCCESS',
                            'payment_method' => 'Easebuzz Online',
                            'utr_number' => $easebuzzid,
                            'title' => 'Instant Wallet Recharge (Easebuzz)'
                        ]);
                    }
                    return redirect('/wallet');
                }
            }

            return redirect('/home');
        } catch (\Exception $e) {
            Log::error('Easebuzz callback error: ' . $e->getMessage());
            return redirect('/home');
        }
    }

    // ----------------------------------------------------
    // STANDARD / WALLET / COUNTER PAYMENT HANDLERS
    // ----------------------------------------------------

    public function createPayment(Request $request)
    {
        try {
            $orderId = $request->input('order_id');
            $employeeId = $request->input('employee_id');
            $amount = (float)$request->input('amount');
            $paymentMethod = $request->input('payment_method');
            $remarks = $request->input('remarks');
            $utrNumber = $request->input('utr_number');

            $paymentRemarks = $remarks ?: ($utrNumber ? "UTR: {$utrNumber}" : "Paid via {$paymentMethod}");

            // Check UTR uniqueness across payments and wallet transactions
            if (!empty($utrNumber) && trim($utrNumber) !== '') {
                $cleanUtr = trim($utrNumber);
                $existingPay = Payment::where('remarks', 'like', "%{$cleanUtr}%")
                    ->where('order_id', '!=', $orderId)
                    ->first();
                if ($existingPay) {
                    return response()->json([
                        'success' => false,
                        'message' => 'This UTR / Transaction Ref No. has already been used for another order.'
                    ], 400);
                }

                $existingWt = WalletTransaction::where('utr_number', $cleanUtr)
                    ->where('status', '!=', 'CANCELLED')
                    ->first();
                if ($existingWt) {
                    return response()->json([
                        'success' => false,
                        'message' => 'This UTR / Transaction Ref No. has already been used for a wallet recharge.'
                    ], 400);
                }
            }

            // Check if payment already exists for this order_id
            $existingPayment = Payment::where('order_id', $orderId)->first();
            if ($existingPayment) {
                return response()->json([
                    'success' => true,
                    'payment_id' => $existingPayment->payment_id,
                    'duplicated' => true
                ]);
            }

            $empId = $this->resolveEmployeeId($employeeId);
            $paymentId = $this->generatePaymentId();

            DB::beginTransaction();

            if ($paymentMethod === 'Wallet') {
                $wallet = Wallet::where('employee_id', $empId)->first();
                if (!$wallet) {
                    DB::rollBack();
                    return response()->json(['success' => false, 'message' => 'Wallet not initialized.'], 400);
                }

                $currentBalance = (float)$wallet->balance;
                $signature = $wallet->signature;
                $isValid = $this->walletService->verifySignature($empId, $currentBalance, $signature);

                if (!$isValid) {
                    AuditLog::create([
                        'action_name' => 'WALLET_TAMPERING_DETECTED',
                        'details' => "CRITICAL ALERT: Tampering detected for Wallet of Employee ID {$empId}. Attempted meal purchase of ₹{$amount} was aborted.",
                        'severity' => 'CRITICAL'
                    ]);
                    DB::rollBack();
                    return response()->json(['success' => false, 'message' => 'Wallet integrity check failed. Canteen order aborted.'], 400);
                }

                if ($currentBalance < $amount) {
                    DB::rollBack();
                    return response()->json(['success' => false, 'message' => 'Insufficient wallet balance.'], 400);
                }

                $newBalance = $currentBalance - $amount;
                $newSig = $this->walletService->generateSignature($empId, $newBalance);

                $wallet->balance = $newBalance;
                $wallet->signature = $newSig;
                $wallet->save();

                WalletTransaction::create([
                    'employee_id' => $empId,
                    'type' => 'debit',
                    'amount' => $amount,
                    'title' => "Meal Payment (Order #{$orderId})",
                    'status' => 'SUCCESS',
                    'payment_method' => 'Wallet'
                ]);

                AuditLog::create([
                    'action_name' => 'WALLET_DEDUCTION',
                    'details' => "Employee ID {$empId} paid ₹" . number_format($amount, 2) . " via Canteen Wallet for Order ID {$orderId}. New Balance: ₹" . number_format($newBalance, 2) . ".",
                    'severity' => 'INFO'
                ]);
            }

            $payment = Payment::create([
                'payment_id' => $paymentId,
                'order_id' => $orderId,
                'employee_id' => $empId,
                'amount' => $amount,
                'payment_method' => $paymentMethod,
                'payment_status' => 'SUCCESS',
                'payment_date' => now(),
                'remarks' => $paymentRemarks
            ]);

            // Update order payment status
            Order::where('order_id', $orderId)->update([
                'payment_mode' => $paymentMethod,
                'payment_status' => 'SUCCESS'
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'payment_id' => $paymentId
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('CREATE PAYMENT ERROR: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function getAllPayments()
    {
        try {
            $query = "
                SELECT
                    p.payment_id,
                    p.order_id,
                    e.full_name,
                    p.amount,
                    p.payment_method,
                    p.payment_status,
                    p.payment_date
                FROM payments p
                JOIN employee e ON p.employee_id = e.employee_id
                ORDER BY p.payment_date DESC
            ";
            $rows = DB::select($query);
            return response()->json($rows);
        } catch (\Exception $e) {
            Log::error('GET ALL PAYMENTS ERROR: ' . $e->getMessage());
            return response()->json(['success' => false], 500);
        }
    }

    public function getEmployeePayments($employeeId)
    {
        try {
            $query = "
                SELECT
                    p.payment_id,
                    p.order_id,
                    e.full_name,
                    p.amount,
                    p.payment_method,
                    p.payment_status,
                    p.payment_date
                FROM payments p
                JOIN employee e ON p.employee_id = e.employee_id
                WHERE p.employee_id = ?
                ORDER BY p.payment_date DESC
            ";
            $rows = DB::select($query, [$employeeId]);
            return response()->json($rows);
        } catch (\Exception $e) {
            Log::error('GET EMPLOYEE PAYMENTS ERROR: ' . $e->getMessage());
            return response()->json(['success' => false], 500);
        }
    }
}
