<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Employee;
use App\Models\Payment;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use App\Services\WalletService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class WalletController extends Controller
{
    protected WalletService $walletService;

    public function __construct(WalletService $walletService)
    {
        $this->walletService = $walletService;
    }

    public function getList()
    {
        try {
            $query = "
                SELECT
                    e.employee_id,
                    e.username,
                    e.full_name,
                    e.designation,
                    IFNULL(w.balance, 0.00) AS balance,
                    w.signature,
                    w.updated_at
                FROM employee e
                LEFT JOIN wallets w ON e.employee_id = w.employee_id
                WHERE e.role != 'ADMIN'
            ";
            $employees = DB::select($query);

            foreach ($employees as $emp) {
                $bal = (float)$emp->balance;
                $hasWallet = !empty($emp->signature);

                if ($hasWallet) {
                    $isValid = $this->walletService->verifySignature($emp->employee_id, $bal, $emp->signature);
                    if (!$isValid) {
                        $emp->is_tampered = true;
                        $details = "CRITICAL WARNING: Wallet balance for Employee ID {$emp->employee_id} ({$emp->full_name}) has been tampered with! Database balance: ₹{$emp->balance}";
                        
                        $recentLog = AuditLog::where('action_name', 'WALLET_TAMPERING_DETECTED')
                            ->where('details', 'like', "%Employee ID {$emp->employee_id}%")
                            ->where('created_at', '>', now()->subHour())
                            ->first();

                        if (!$recentLog) {
                            AuditLog::create([
                                'action_name' => 'WALLET_TAMPERING_DETECTED',
                                'details' => $details,
                                'severity' => 'CRITICAL'
                            ]);
                        }
                    } else {
                        $emp->is_tampered = false;
                    }
                } else {
                    $emp->is_tampered = false;
                }
            }

            return response()->json($employees);
        } catch (\Exception $e) {
            Log::error('GET WALLETS LIST ERROR: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function getBalance($employeeId)
    {
        try {
            $wallet = Wallet::where('employee_id', $employeeId)->first();

            if (!$wallet) {
                $initialBalance = 0.00;
                $sig = $this->walletService->generateSignature($employeeId, $initialBalance);
                Wallet::create([
                    'employee_id' => $employeeId,
                    'balance' => $initialBalance,
                    'signature' => $sig,
                ]);

                return response()->json([
                    'balance' => $initialBalance,
                    'is_tampered' => false
                ]);
            }

            $balance = (float)$wallet->balance;
            $isValid = $this->walletService->verifySignature($employeeId, $balance, $wallet->signature);
            $isTampered = !$isValid;

            if ($isTampered) {
                AuditLog::create([
                    'action_name' => 'WALLET_TAMPERING_DETECTED',
                    'details' => "CRITICAL WARNING: Wallet balance read for Employee ID {$employeeId} failed signature check. Balance: ₹{$balance}",
                    'severity' => 'CRITICAL'
                ]);
            }

            return response()->json([
                'balance' => $balance,
                'is_tampered' => $isTampered
            ]);
        } catch (\Exception $e) {
            Log::error('GET BALANCE ERROR: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function modify(Request $request)
    {
        try {
            $employeeId = $request->input('employee_id');
            $amount = $request->input('amount');
            $adminId = $request->input('admin_id');
            $adminPassword = $request->input('admin_password');

            if (!$employeeId || $amount === null || !$adminId || !$adminPassword) {
                return response()->json([
                    'success' => false,
                    'message' => 'Missing required fields (employee_id, amount, admin_id, admin_password).'
                ], 400);
            }

            $admin = Employee::where('employee_id', $adminId)->where('role', 'ADMIN')->first();
            if (!$admin) {
                return response()->json([
                    'success' => false,
                    'message' => 'Authorization failed. Only administrators can modify wallets.'
                ], 403);
            }

            if ($admin->password !== $adminPassword) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid administrator password. Access denied.'
                ], 403);
            }

            $changeAmt = (float)$amount;
            $wallet = Wallet::where('employee_id', $employeeId)->first();
            $currentBalance = $wallet ? (float)$wallet->balance : 0.00;
            $newBalance = $currentBalance + $changeAmt;

            if ($newBalance < 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Wallet balance cannot drop below zero.'
                ], 400);
            }

            $newSig = $this->walletService->generateSignature($employeeId, $newBalance);

            if (!$wallet) {
                Wallet::create([
                    'employee_id' => $employeeId,
                    'balance' => $newBalance,
                    'signature' => $newSig
                ]);
            } else {
                $wallet->balance = $newBalance;
                $wallet->signature = $newSig;
                $wallet->save();
            }

            $actionType = $changeAmt >= 0 ? 'WALLET_RECHARGE' : 'WALLET_DEDUCTION';
            $detailsMsg = "Admin {$admin->full_name} (ID: {$adminId}) modified Wallet for Employee ID {$employeeId}. Amount: ₹" . ($changeAmt >= 0 ? '+' : '') . "{$changeAmt}. New Balance: ₹{$newBalance}.";

            AuditLog::create([
                'action_name' => $actionType,
                'details' => $detailsMsg,
                'severity' => 'INFO'
            ]);

            WalletTransaction::create([
                'employee_id' => $employeeId,
                'type' => $changeAmt >= 0 ? 'credit' : 'debit',
                'amount' => abs($changeAmt),
                'title' => $changeAmt >= 0 ? 'Admin Recharge' : 'Admin Deduction',
                'status' => 'SUCCESS'
            ]);

            return response()->json([
                'success' => true,
                'message' => "Wallet modified successfully. New balance: ₹{$newBalance}",
                'newBalance' => $newBalance
            ]);
        } catch (\Exception $e) {
            Log::error('MODIFY WALLET ERROR: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function getAuditLogs()
    {
        try {
            $query = "
                SELECT
                    log_id,
                    action_name,
                    details,
                    severity,
                    created_at AS rawDate,
                    DATE_FORMAT(created_at, '%d-%m-%Y %h:%i %p') AS time
                FROM audit_logs
                ORDER BY log_id DESC
            ";
            $rows = DB::select($query);
            return response()->json($rows);
        } catch (\Exception $e) {
            Log::error('GET AUDIT LOGS ERROR: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function getRecharges()
    {
        try {
            $query = "
                SELECT
                    wt.transaction_id,
                    wt.employee_id,
                    e.username AS employee_code,
                    e.full_name AS employee_name,
                    wt.amount,
                    wt.created_at AS rawDate,
                    DATE_FORMAT(wt.created_at, '%d-%m-%Y %h:%i %p') AS time
                FROM wallet_transactions wt
                JOIN employee e ON wt.employee_id = e.employee_id
                WHERE wt.type = 'credit' AND wt.title = 'Admin Recharge'
                ORDER BY wt.transaction_id DESC
            ";
            $rows = DB::select($query);
            return response()->json($rows);
        } catch (\Exception $e) {
            Log::error('GET RECHARGES ERROR: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function verifyAll()
    {
        try {
            $wallets = DB::table('wallets as w')
                ->join('employee as e', 'w.employee_id', '=', 'e.employee_id')
                ->select(['w.wallet_id', 'w.employee_id', 'w.balance', 'w.signature', 'e.full_name'])
                ->get();

            $tamperedCount = 0;
            $results = [];

            foreach ($wallets as $w) {
                $bal = (float)$w->balance;
                $isValid = $this->walletService->verifySignature($w->employee_id, $bal, $w->signature);
                $isTampered = !$isValid;

                if ($isTampered) {
                    $tamperedCount++;
                    AuditLog::create([
                        'action_name' => 'WALLET_TAMPERING_DETECTED',
                        'details' => "CRITICAL WARNING: Wallet balance for Employee ID {$w->employee_id} ({$w->full_name}) has been tampered with! Database balance: ₹{$w->balance}",
                        'severity' => 'CRITICAL'
                    ]);
                }

                $results[] = [
                    'employee_id' => $w->employee_id,
                    'full_name' => $w->full_name,
                    'balance' => $bal,
                    'is_tampered' => $isTampered,
                ];
            }

            return response()->json([
                'success' => true,
                'total_checked' => count($wallets),
                'tampered_count' => $tamperedCount,
                'results' => $results
            ]);
        } catch (\Exception $e) {
            Log::error('VERIFY ALL WALLETS ERROR: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function getTransactions($employeeId)
    {
        try {
            $query = "
                SELECT
                    transaction_id AS id,
                    type,
                    title,
                    amount,
                    IFNULL(status, 'SUCCESS') AS status,
                    DATE_FORMAT(created_at, '%d %b %Y') AS date
                FROM wallet_transactions
                WHERE employee_id = ?
                ORDER BY transaction_id DESC
            ";
            $rows = DB::select($query, [$employeeId]);
            return response()->json($rows);
        } catch (\Exception $e) {
            Log::error('GET TRANSACTIONS ERROR: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function getStats()
    {
        try {
            $today = date('Y-m-d');
            $todayRow = DB::table('wallet_transactions')
                ->where('type', 'credit')
                ->where('status', 'SUCCESS')
                ->whereDate('created_at', $today)
                ->sum('amount');
            $todayRecharges = (float)$todayRow;

            $trendRows = DB::table('wallet_transactions')
                ->select([
                    DB::raw("DATE_FORMAT(MIN(created_at), '%a') AS day"),
                    DB::raw("IFNULL(SUM(amount), 0.00) AS amount"),
                ])
                ->where('type', 'credit')
                ->where('status', 'SUCCESS')
                ->where('created_at', '>=', DB::raw("DATE_SUB(CURDATE(), INTERVAL 6 DAY)"))
                ->groupBy(DB::raw("DATE(created_at)"))
                ->orderBy(DB::raw("DATE(created_at)"), 'asc')
                ->get();

            $days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
            $trendMap = array_fill_keys($days, 0);
            foreach ($trendRows as $row) {
                if (isset($trendMap[$row->day])) {
                    $trendMap[$row->day] = (float)$row->amount;
                }
            }

            $trendData = [];
            foreach ($days as $d) {
                $trendData[] = [
                    'day' => $d,
                    'amount' => $trendMap[$d]
                ];
            }

            return response()->json([
                'todayRecharges' => $todayRecharges,
                'trendData' => $trendData
            ]);
        } catch (\Exception $e) {
            Log::error('GET STATS ERROR: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function recharge(Request $request)
    {
        try {
            $employeeId = $request->input('employee_id');
            $amount = $request->input('amount');
            $paymentMethod = $request->input('payment_method') ?: 'UPI';
            $utrNumber = trim((string)$request->input('utr_number'));

            if (!$employeeId || !$amount || !is_numeric($amount) || (float)$amount <= 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Please enter a valid recharge amount.'
                ], 400);
            }

            $rechargeAmt = (float)$amount;

            if ($paymentMethod !== 'Cash' && empty($utrNumber)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Please enter your UPI UTR / Transaction Reference Number.'
                ], 400);
            }

            if (!empty($utrNumber)) {
                $existingWt = WalletTransaction::where('utr_number', $utrNumber)
                    ->where('status', '!=', 'CANCELLED')
                    ->first();
                if ($existingWt) {
                    return response()->json([
                        'success' => false,
                        'message' => 'This UTR / Transaction Ref No. has already been used for another wallet recharge.'
                    ], 400);
                }

                $existingPay = Payment::where('remarks', 'like', "%{$utrNumber}%")->first();
                if ($existingPay) {
                    return response()->json([
                        'success' => false,
                        'message' => 'This UTR / Transaction Ref No. has already been used for an order payment.'
                    ], 400);
                }
            }

            $titleText = !empty($utrNumber)
                ? "{$paymentMethod} (UTR: {$utrNumber})"
                : "{$paymentMethod} Recharge";

            $transaction = WalletTransaction::create([
                'employee_id' => $employeeId,
                'type' => 'credit',
                'amount' => $rechargeAmt,
                'title' => $titleText,
                'status' => 'PENDING',
                'utr_number' => $utrNumber ?: null,
                'payment_method' => $paymentMethod,
            ]);

            $emp = Employee::find($employeeId);
            $empInfo = $emp ? "{$emp->full_name} ({$emp->username})" : "ID {$employeeId}";
            $auditMsg = "Employee {$empInfo} submitted UPI/QR self-service wallet recharge of ₹" . number_format($rechargeAmt, 2) . ". Method: {$paymentMethod}, Transaction/UTR ID: " . ($utrNumber ?: 'N/A') . ". Status: PENDING CONFIRMATION.";

            AuditLog::create([
                'action_name' => 'UPI_RECHARGE_SUBMITTED',
                'details' => $auditMsg,
                'severity' => 'INFO'
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Wallet recharge request submitted! Payment Processed, Awaiting Confirmation by Admin.',
                'transaction_id' => $transaction->transaction_id,
                'status' => 'PENDING'
            ]);
        } catch (\Exception $e) {
            Log::error('RECHARGE WALLET ERROR: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function getUserRecharges()
    {
        try {
            $query = "
                SELECT
                    wt.transaction_id,
                    wt.employee_id,
                    e.username AS employee_code,
                    e.full_name AS employee_name,
                    e.designation,
                    wt.amount,
                    IFNULL(wt.payment_method, CASE WHEN wt.title = 'Admin Recharge' THEN 'Admin Manual' ELSE 'UPI' END) AS payment_method,
                    IFNULL(wt.utr_number, '-') AS utr_number,
                    IFNULL(wt.status, 'SUCCESS') AS status,
                    wt.created_at AS rawDate,
                    DATE_FORMAT(wt.created_at, '%d-%m-%Y %h:%i %p') AS time
                FROM wallet_transactions wt
                JOIN employee e ON wt.employee_id = e.employee_id
                WHERE wt.type = 'credit'
                ORDER BY wt.transaction_id DESC
            ";
            $rows = DB::select($query);
            return response()->json($rows);
        } catch (\Exception $e) {
            Log::error('GET USER RECHARGES ERROR: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function getPending($employeeId)
    {
        try {
            $query = "
                SELECT
                    transaction_id,
                    amount,
                    payment_method,
                    utr_number,
                    status,
                    DATE_FORMAT(created_at, '%d-%m-%Y %h:%i %p') AS time
                FROM wallet_transactions
                WHERE employee_id = ? AND type = 'credit' AND status = 'PENDING'
                ORDER BY transaction_id DESC
            ";
            $rows = DB::select($query, [$employeeId]);

            return response()->json([
                'hasPending' => count($rows) > 0,
                'pendingRecharges' => $rows,
                'pendingRecharge' => $rows[0] ?? null,
                'count' => count($rows)
            ]);
        } catch (\Exception $e) {
            Log::error('GET PENDING RECHARGE ERROR: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function approveUserRecharge(Request $request)
    {
        try {
            $transactionId = $request->input('transaction_id');
            $adminId = $request->input('admin_id');
            $adminPassword = $request->input('admin_password');

            if (!$transactionId) {
                return response()->json(['success' => false, 'message' => 'Missing required transaction_id.'], 400);
            }

            $adminName = 'Admin';
            if ($adminId) {
                $admin = Employee::where('employee_id', $adminId)->where('role', 'ADMIN')->first();
                if ($admin) {
                    if ($adminPassword && $admin->password !== $adminPassword) {
                        return response()->json([
                            'success' => false,
                            'message' => 'Invalid administrator password. Authorization denied.'
                        ], 403);
                    }
                    $adminName = $admin->full_name;
                }
            }

            $tx = WalletTransaction::find($transactionId);
            if (!$tx) {
                return response()->json(['success' => false, 'message' => 'Recharge transaction not found.'], 404);
            }

            if ($tx->status === 'SUCCESS') {
                return response()->json(['success' => false, 'message' => 'This wallet recharge has already been approved.'], 400);
            } elseif ($tx->status === 'CANCELLED') {
                return response()->json(['success' => false, 'message' => 'This wallet recharge request was cancelled.'], 400);
            }

            $empId = $tx->employee_id;
            $rechargeAmt = (float)$tx->amount;

            $emp = Employee::find($empId);
            $empInfo = $emp ? "{$emp->full_name} ({$emp->username})" : "ID {$empId}";

            DB::beginTransaction();

            $wallet = Wallet::where('employee_id', $empId)->first();
            $currentBalance = $wallet ? (float)$wallet->balance : 0.00;
            $newBalance = $currentBalance + $rechargeAmt;
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

            $tx->status = 'SUCCESS';
            $tx->save();

            $detailsMsg = "Admin {$adminName} APPROVED UPI Wallet Recharge (TxID: #{$transactionId}) for Employee {$empInfo}. Amount: ₹" . number_format($rechargeAmt, 2) . ", Method: " . ($tx->payment_method ?: 'UPI') . ", Transaction/UTR ID: " . ($tx->utr_number ?: 'N/A') . ". New Balance: ₹" . number_format($newBalance, 2) . ".";

            AuditLog::create([
                'action_name' => 'UPI_RECHARGE_APPROVED',
                'details' => $detailsMsg,
                'severity' => 'INFO'
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => "Wallet recharge of ₹" . number_format($rechargeAmt, 2) . " approved successfully! New balance: ₹" . number_format($newBalance, 2),
                'newBalance' => $newBalance
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('APPROVE WALLET RECHARGE ERROR: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function cancelUserRecharge(Request $request)
    {
        try {
            $transactionId = $request->input('transaction_id');
            if (!$transactionId) {
                return response()->json(['success' => false, 'message' => 'Transaction ID is required.'], 400);
            }

            $tx = WalletTransaction::find($transactionId);
            if (!$tx) {
                return response()->json(['success' => false, 'message' => 'Transaction not found.'], 404);
            }

            $emp = Employee::find($tx->employee_id);
            $empInfo = $emp ? "{$emp->full_name} ({$emp->username})" : "ID {$tx->employee_id}";

            DB::beginTransaction();

            if ($tx->status === 'SUCCESS') {
                $wallet = Wallet::where('employee_id', $tx->employee_id)->first();
                if ($wallet) {
                    $currentBalance = (float)$wallet->balance;
                    $newBalance = max(0, $currentBalance - (float)$tx->amount);
                    $newSig = $this->walletService->generateSignature($tx->employee_id, $newBalance);
                    $wallet->balance = $newBalance;
                    $wallet->signature = $newSig;
                    $wallet->save();
                }
            }

            $tx->status = 'CANCELLED';
            $tx->save();

            $cancelMsg = "Admin CANCELLED UPI Wallet Recharge request (TxID: #{$transactionId}) for Employee {$empInfo}. Amount: ₹{$tx->amount}, Method: " . ($tx->payment_method ?: 'UPI') . ", Transaction/UTR ID: " . ($tx->utr_number ?: 'N/A') . ".";

            AuditLog::create([
                'action_name' => 'UPI_RECHARGE_CANCELLED',
                'details' => $cancelMsg,
                'severity' => 'WARNING'
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Wallet recharge request cancelled successfully.'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('CANCEL WALLET RECHARGE ERROR: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }
}
