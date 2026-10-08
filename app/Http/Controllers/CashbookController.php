<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Cashbook;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CashbookController extends Controller
{
    public function getSummary(Request $request)
    {
        try {
            $chosenDate = $request->query('date') ?: date('Y-m-d');

            // 1. Chosen Date's Income
            $paymentIncome = DB::table('payments')
                ->whereDate('payment_date', $chosenDate)
                ->where('payment_status', 'SUCCESS')
                ->sum('amount');

            $manualIncome = DB::table('cashbook')
                ->where('entry_date', $chosenDate)
                ->where('entry_type', 'RECEIPT')
                ->sum('amount');

            $todayIncome = (float)$paymentIncome + (float)$manualIncome;

            // 2. Chosen Date's Expense
            $purchaseExpense = DB::table('store_purchases')
                ->whereDate('purchase_date', $chosenDate)
                ->sum('total_amount');

            $manualExpense = DB::table('cashbook')
                ->where('entry_date', $chosenDate)
                ->where('entry_type', 'EXPENSE')
                ->sum('amount');

            $todayExpense = (float)$purchaseExpense + (float)$manualExpense;

            // 3. Month's Income
            $paymentMonthIncome = DB::table('payments')
                ->whereYear('payment_date', date('Y', strtotime($chosenDate)))
                ->whereMonth('payment_date', date('m', strtotime($chosenDate)))
                ->where('payment_status', 'SUCCESS')
                ->sum('amount');

            $manualMonthIncome = DB::table('cashbook')
                ->whereYear('entry_date', date('Y', strtotime($chosenDate)))
                ->whereMonth('entry_date', date('m', strtotime($chosenDate)))
                ->where('entry_type', 'RECEIPT')
                ->sum('amount');

            $monthIncome = (float)$paymentMonthIncome + (float)$manualMonthIncome;

            // 4. Month's Expense
            $purchaseMonthExpense = DB::table('store_purchases')
                ->whereYear('purchase_date', date('Y', strtotime($chosenDate)))
                ->whereMonth('purchase_date', date('m', strtotime($chosenDate)))
                ->sum('total_amount');

            $manualMonthExpense = DB::table('cashbook')
                ->whereYear('entry_date', date('Y', strtotime($chosenDate)))
                ->whereMonth('entry_date', date('m', strtotime($chosenDate)))
                ->where('entry_type', 'EXPENSE')
                ->sum('amount');

            $monthExpense = (float)$purchaseMonthExpense + (float)$manualMonthExpense;

            // 5. Payment Mode Collection for Chosen Date
            $modeRows = DB::table('payments')
                ->select(['payment_method', DB::raw('IFNULL(SUM(amount), 0.00) AS total')])
                ->whereDate('payment_date', $chosenDate)
                ->where('payment_status', 'SUCCESS')
                ->groupBy('payment_method')
                ->get();

            $manualModeRows = DB::table('cashbook')
                ->select([DB::raw('payment_mode AS payment_method'), DB::raw('IFNULL(SUM(amount), 0.00) AS total')])
                ->where('entry_date', $chosenDate)
                ->where('entry_type', 'RECEIPT')
                ->groupBy('payment_mode')
                ->get();

            $modeMap = ['Wallet' => 0, 'BHIM UPI' => 0, 'PhonePe' => 0, 'Google Pay' => 0, 'SuperMoney' => 0, 'Cash' => 0, 'Scan QR' => 0];
            $allModeRows = $modeRows->concat($manualModeRows);
            foreach ($allModeRows as $row) {
                $m = $row->payment_method;
                if (!isset($modeMap[$m])) {
                    $m = 'Cash';
                }
                $modeMap[$m] = ($modeMap[$m] ?? 0) + (float)$row->total;
            }

            // 6. Recent Receipts for the chosen date
            $receiptQuery = "
                SELECT * FROM (
                    SELECT 
                        p.payment_id AS receipt_no, 
                        e.full_name AS from_user, 
                        p.amount, 
                        p.payment_method AS mode,
                        DATE_FORMAT(p.payment_date, '%Y-%m-%d %H:%i:%s') AS date
                    FROM payments p
                    JOIN employee e ON p.employee_id = e.employee_id
                    WHERE p.payment_status = 'SUCCESS' AND DATE(p.payment_date) = ?
                    UNION ALL
                    SELECT 
                        CONCAT('RCPT-', cashbook_id) AS receipt_no, 
                        description AS from_user, 
                        amount, 
                        payment_mode AS mode,
                        DATE_FORMAT(entry_date, '%Y-%m-%d %H:%i:%s') AS date
                    FROM cashbook
                    WHERE entry_type = 'RECEIPT' AND entry_date = ?
                ) combined
                ORDER BY date DESC
                LIMIT 10
            ";
            $receiptRows = DB::select($receiptQuery, [$chosenDate, $chosenDate]);

            // 7. Recent Payments for the chosen date
            $paymentQuery = "
                SELECT * FROM (
                    SELECT 
                        CONCAT('PAY-', purchase_id) AS payment_no, 
                        supplier_name AS to_user, 
                        total_amount AS amount, 
                        'Bank' AS mode,
                        DATE_FORMAT(purchase_date, '%Y-%m-%d %H:%i:%s') AS date
                    FROM store_purchases
                    WHERE DATE(purchase_date) = ?
                    UNION ALL
                    SELECT 
                        CONCAT('EXP-', cashbook_id) AS payment_no, 
                        description AS to_user, 
                        amount, 
                        payment_mode AS mode,
                        DATE_FORMAT(entry_date, '%Y-%m-%d %H:%i:%s') AS date
                    FROM cashbook
                    WHERE entry_type = 'EXPENSE' AND entry_date = ?
                ) combined
                ORDER BY date DESC
                LIMIT 10
            ";
            $paymentRows = DB::select($paymentQuery, [$chosenDate, $chosenDate]);

            // 8. Bank Transactions for the chosen date
            $bankQuery = "
                SELECT * FROM (
                    SELECT 
                        'UPI Collection' AS bank,
                        p.payment_id AS reference,
                        p.amount,
                        'Success' AS status,
                        DATE_FORMAT(p.payment_date, '%Y-%m-%d %H:%i:%s') AS date
                    FROM payments p
                    WHERE p.payment_method NOT IN ('Wallet', 'Cash') AND p.payment_status = 'SUCCESS' AND DATE(p.payment_date) = ?
                    UNION ALL
                    SELECT 
                        CASE WHEN entry_type = 'BANK_CREDIT' THEN 'Bank Deposit' ELSE 'Bank Withdrawal' END AS bank,
                        CONCAT('TXN-', cashbook_id) AS reference,
                        amount,
                        'Success' AS status,
                        DATE_FORMAT(entry_date, '%Y-%m-%d %H:%i:%s') AS date
                    FROM cashbook
                    WHERE entry_type IN ('BANK_CREDIT', 'BANK_DEBIT') AND entry_date = ?
                ) combined
                ORDER BY date DESC
                LIMIT 10
            ";
            $bankRows = DB::select($bankQuery, [$chosenDate, $chosenDate]);

            // 9. Daily Cash Closing calculations (prior sums)
            $prevReceipts = (float)DB::table('payments')->whereDate('payment_date', '<', $chosenDate)->where('payment_status', 'SUCCESS')->sum('amount');
            $prevManualReceipts = (float)DB::table('cashbook')->where('entry_date', '<', $chosenDate)->where('entry_type', 'RECEIPT')->sum('amount');
            $prevExpenses = (float)DB::table('store_purchases')->whereDate('purchase_date', '<', $chosenDate)->sum('total_amount');
            $prevManualExpenses = (float)DB::table('cashbook')->where('entry_date', '<', $chosenDate)->where('entry_type', 'EXPENSE')->sum('amount');
            $prevBankCredits = (float)DB::table('cashbook')->where('entry_date', '<', $chosenDate)->where('entry_type', 'BANK_CREDIT')->sum('amount');
            $prevBankDebits = (float)DB::table('cashbook')->where('entry_date', '<', $chosenDate)->where('entry_type', 'BANK_DEBIT')->sum('amount');

            $totalPriorIncomes = $prevReceipts + $prevManualReceipts + $prevBankCredits;
            $totalPriorExpenses = $prevExpenses + $prevManualExpenses + $prevBankDebits;
            $openingBalance = 15000.00 + $totalPriorIncomes - $totalPriorExpenses;

            $todayBankCredits = (float)DB::table('cashbook')->where('entry_date', $chosenDate)->where('entry_type', 'BANK_CREDIT')->sum('amount');
            $todayBankDebits = (float)DB::table('cashbook')->where('entry_date', $chosenDate)->where('entry_type', 'BANK_DEBIT')->sum('amount');

            $closingBalance = $openingBalance + $todayIncome + $todayBankCredits - $todayExpense - $todayBankDebits;

            return response()->json([
                'todayIncome' => $todayIncome,
                'todayExpense' => $todayExpense,
                'netClosingToday' => $todayIncome - $todayExpense + $todayBankCredits - $todayBankDebits,
                'thisMonthBalance' => $monthIncome - $monthExpense,
                'paymentModeData' => [
                    ['mode' => 'Wallet', 'amount' => $modeMap['Wallet'] ?? 0],
                    ['mode' => 'UPI', 'amount' => ($modeMap['BHIM UPI'] ?? 0) + ($modeMap['PhonePe'] ?? 0) + ($modeMap['Google Pay'] ?? 0) + ($modeMap['SuperMoney'] ?? 0) + ($modeMap['Scan QR'] ?? 0)],
                    ['mode' => 'Cash', 'amount' => $modeMap['Cash'] ?? 0],
                    ['mode' => 'Bank', 'amount' => $todayBankCredits]
                ],
                'recentReceipts' => $receiptRows,
                'recentPayments' => $paymentRows,
                'bankTransactions' => $bankRows,
                'closingDetails' => [
                    'openingBalance' => $openingBalance,
                    'todayIncome' => $todayIncome,
                    'todayExpense' => $todayExpense,
                    'bankCredits' => $todayBankCredits,
                    'bankDebits' => $todayBankDebits,
                    'closingBalance' => $closingBalance,
                    'closedBy' => 'Admin User',
                    'openingDetails' => [
                        'baseBalance' => 15000.00,
                        'priorReceipts' => $prevReceipts,
                        'priorManualReceipts' => $prevManualReceipts,
                        'priorBankCredits' => $prevBankCredits,
                        'priorExpenses' => $prevExpenses,
                        'priorManualExpenses' => $prevManualExpenses,
                        'priorBankDebits' => $prevBankDebits,
                        'totalPriorIncomes' => $totalPriorIncomes,
                        'totalPriorExpenses' => $totalPriorExpenses,
                        'openingBalance' => $openingBalance
                    ]
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('GET CASHBOOK SUMMARY ERROR: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function manualEntry(Request $request)
    {
        try {
            $entryType = $request->input('entry_type');
            $amount = $request->input('amount');
            $description = $request->input('description');
            $paymentMode = $request->input('payment_mode') ?: 'Cash';
            $entryDate = $request->input('entry_date');

            if (!$entryType || !$amount || !$description || !$entryDate) {
                return response()->json(['success' => false, 'message' => 'Missing required fields.'], 400);
            }

            $amtVal = (float)$amount;
            $receiptPath = null;
            if ($request->hasFile('receipt_file')) {
                $file = $request->file('receipt_file');
                $filename = time() . '_' . preg_replace('/[^a-zA-Z0-9._-]/', '', $file->getClientOriginalName());
                $destinationPath = public_path('uploads');
                if (!is_dir($destinationPath)) {
                    mkdir($destinationPath, 0777, true);
                }
                $file->move($destinationPath, $filename);
                $receiptPath = "/uploads/{$filename}";
            }

            Cashbook::create([
                'entry_type' => $entryType,
                'amount' => $amtVal,
                'description' => $description,
                'payment_mode' => $paymentMode,
                'receipt_path' => $receiptPath,
                'entry_date' => $entryDate,
            ]);

            AuditLog::create([
                'action_name' => 'MANUAL_CASHBOOK_ENTRY',
                'details' => "Logged manual cashbook entry: {$entryType}. Amount: ₹{$amtVal}. Desc: {$description}. Date: {$entryDate}.",
                'severity' => 'INFO'
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Manual cashbook entry logged successfully!'
            ]);
        } catch (\Exception $e) {
            Log::error('POST MANUAL ENTRY ERROR: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function dailyClosing(Request $request)
    {
        try {
            $date = $request->input('date');
            $opening = $request->input('opening');
            $income = $request->input('income');
            $expense = $request->input('expense');
            $closing = $request->input('closing');

            if (!$date || $opening === null || $income === null || $expense === null || $closing === null) {
                return response()->json(['success' => false, 'message' => 'Missing daily closing summary parameters.'], 400);
            }

            $details = "Daily cashbook closing performed for Date: {$date}. Opening Balance: ₹{$opening}, Total Income: ₹{$income}, Total Expense: ₹{$expense}, Closing Balance: ₹{$closing}. Actioned by Admin.";

            AuditLog::create([
                'action_name' => 'DAILY_CASH_CLOSING',
                'details' => $details,
                'severity' => 'INFO'
            ]);

            return response()->json([
                'success' => true,
                'message' => "Canteen cashbook closed successfully for date {$date}."
            ]);
        } catch (\Exception $e) {
            Log::error('POST DAILY CLOSING ERROR: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function getAllEntries(Request $request)
    {
        try {
            $type = $request->query('type');
            $date = $request->query('date');

            if (!$type || !$date) {
                return response()->json(['success' => false, 'message' => 'Missing type or date'], 400);
            }

            if ($type === 'receipts') {
                $query = "
                    SELECT * FROM (
                        SELECT 
                            p.payment_id AS receipt_no, 
                            e.full_name AS from_user, 
                            p.amount, 
                            p.payment_method AS mode,
                            DATE_FORMAT(p.payment_date, '%Y-%m-%d %H:%i:%s') AS date
                        FROM payments p
                        JOIN employee e ON p.employee_id = e.employee_id
                        WHERE p.payment_status = 'SUCCESS' AND DATE(p.payment_date) = ?
                        UNION ALL
                        SELECT 
                            CONCAT('RCPT-', cashbook_id) AS receipt_no, 
                            description AS from_user, 
                            amount, 
                            payment_mode AS mode,
                            DATE_FORMAT(entry_date, '%Y-%m-%d %H:%i:%s') AS date
                        FROM cashbook
                        WHERE entry_type = 'RECEIPT' AND entry_date = ?
                    ) combined
                    ORDER BY date DESC
                ";
                $rows = DB::select($query, [$date, $date]);
                return response()->json($rows);
            } elseif ($type === 'payments') {
                $query = "
                    SELECT * FROM (
                        SELECT 
                            CONCAT('PAY-', purchase_id) AS payment_no, 
                            supplier_name AS to_user, 
                            total_amount AS amount, 
                            'Bank' AS mode,
                            DATE_FORMAT(purchase_date, '%Y-%m-%d %H:%i:%s') AS date
                        FROM store_purchases
                        WHERE DATE(purchase_date) = ?
                        UNION ALL
                        SELECT 
                            CONCAT('EXP-', cashbook_id) AS payment_no, 
                            description AS to_user, 
                            amount, 
                            payment_mode AS mode,
                            DATE_FORMAT(entry_date, '%Y-%m-%d %H:%i:%s') AS date
                        FROM cashbook
                        WHERE entry_type = 'EXPENSE' AND entry_date = ?
                    ) combined
                    ORDER BY date DESC
                ";
                $rows = DB::select($query, [$date, $date]);
                return response()->json($rows);
            } else {
                return response()->json(['success' => false, 'message' => "Invalid type. Must be 'receipts' or 'payments'."], 400);
            }
        } catch (\Exception $e) {
            Log::error('GET ALL ENTRIES ERROR: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function getRangeSummary(Request $request)
    {
        try {
            $startDate = $request->query('start_date');
            $endDate = $request->query('end_date');

            if (!$startDate || !$endDate) {
                return response()->json(['success' => false, 'message' => 'Missing start_date or end_date'], 400);
            }

            // 1. Opening balance prior to start_date
            $prevReceipts = (float)DB::table('payments')->whereDate('payment_date', '<', $startDate)->where('payment_status', 'SUCCESS')->sum('amount');
            $prevManualReceipts = (float)DB::table('cashbook')->where('entry_date', '<', $startDate)->where('entry_type', 'RECEIPT')->sum('amount');
            $prevExpenses = (float)DB::table('store_purchases')->whereDate('purchase_date', '<', $startDate)->sum('total_amount');
            $prevManualExpenses = (float)DB::table('cashbook')->where('entry_date', '<', $startDate)->where('entry_type', 'EXPENSE')->sum('amount');
            $prevBankCredits = (float)DB::table('cashbook')->where('entry_date', '<', $startDate)->where('entry_type', 'BANK_CREDIT')->sum('amount');
            $prevBankDebits = (float)DB::table('cashbook')->where('entry_date', '<', $startDate)->where('entry_type', 'BANK_DEBIT')->sum('amount');

            $totalPriorIncomes = $prevReceipts + $prevManualReceipts + $prevBankCredits;
            $totalPriorExpenses = $prevExpenses + $prevManualExpenses + $prevBankDebits;
            $openingBalance = 15000.00 + $totalPriorIncomes - $totalPriorExpenses;

            // 2. Incomes in range
            $rangePaymentIncome = (float)DB::table('payments')->whereBetween(DB::raw('DATE(payment_date)'), [$startDate, $endDate])->where('payment_status', 'SUCCESS')->sum('amount');
            $rangeManualIncome = (float)DB::table('cashbook')->whereBetween('entry_date', [$startDate, $endDate])->where('entry_type', 'RECEIPT')->sum('amount');
            $rangeIncome = $rangePaymentIncome + $rangeManualIncome;

            // 3. Expenses in range
            $rangePurchaseExpense = (float)DB::table('store_purchases')->whereBetween(DB::raw('DATE(purchase_date)'), [$startDate, $endDate])->sum('total_amount');
            $rangeManualExpense = (float)DB::table('cashbook')->whereBetween('entry_date', [$startDate, $endDate])->where('entry_type', 'EXPENSE')->sum('amount');
            $rangeExpense = $rangePurchaseExpense + $rangeManualExpense;

            // 4. Bank adjustments in range
            $rangeBankCredits = (float)DB::table('cashbook')->whereBetween('entry_date', [$startDate, $endDate])->where('entry_type', 'BANK_CREDIT')->sum('amount');
            $rangeBankDebits = (float)DB::table('cashbook')->whereBetween('entry_date', [$startDate, $endDate])->where('entry_type', 'BANK_DEBIT')->sum('amount');

            $closingBalance = $openingBalance + $rangeIncome + $rangeBankCredits - $rangeExpense - $rangeBankDebits;

            // 5. Detailed receipts list
            $receiptQuery = "
                SELECT * FROM (
                    SELECT 
                        p.payment_id AS receipt_no, 
                        e.full_name AS from_user, 
                        p.amount, 
                        p.payment_method AS mode,
                        DATE_FORMAT(p.payment_date, '%Y-%m-%d %H:%i:%s') AS date
                    FROM payments p
                    JOIN employee e ON p.employee_id = e.employee_id
                    WHERE p.payment_status = 'SUCCESS' AND DATE(p.payment_date) BETWEEN ? AND ?
                    UNION ALL
                    SELECT 
                        CONCAT('RCPT-', cashbook_id) AS receipt_no, 
                        description AS from_user, 
                        amount, 
                        payment_mode AS mode,
                        DATE_FORMAT(entry_date, '%Y-%m-%d %H:%i:%s') AS date
                    FROM cashbook
                    WHERE entry_type = 'RECEIPT' AND entry_date BETWEEN ? AND ?
                ) combined
                ORDER BY date DESC
            ";
            $receiptRows = DB::select($receiptQuery, [$startDate, $endDate, $startDate, $endDate]);

            // 6. Detailed payments list
            $paymentQuery = "
                SELECT * FROM (
                    SELECT 
                        CONCAT('PAY-', purchase_id) AS payment_no, 
                        supplier_name AS to_user, 
                        total_amount AS amount, 
                        'Bank' AS mode,
                        DATE_FORMAT(purchase_date, '%Y-%m-%d %H:%i:%s') AS date
                    FROM store_purchases
                    WHERE DATE(purchase_date) BETWEEN ? AND ?
                    UNION ALL
                    SELECT 
                        CONCAT('EXP-', cashbook_id) AS payment_no, 
                        description AS to_user, 
                        amount, 
                        payment_mode AS mode,
                        DATE_FORMAT(entry_date, '%Y-%m-%d %H:%i:%s') AS date
                    FROM cashbook
                    WHERE entry_type = 'EXPENSE' AND entry_date BETWEEN ? AND ?
                ) combined
                ORDER BY date DESC
            ";
            $paymentRows = DB::select($paymentQuery, [$startDate, $endDate, $startDate, $endDate]);

            // 7. Bank transactions list
            $bankQuery = "
                SELECT * FROM (
                    SELECT 
                        'UPI Collection' AS bank,
                        p.payment_id AS reference,
                        p.amount,
                        'Success' AS status,
                        DATE_FORMAT(p.payment_date, '%Y-%m-%d %H:%i:%s') AS date
                    FROM payments p
                    WHERE p.payment_method NOT IN ('Wallet', 'Cash') AND p.payment_status = 'SUCCESS' AND DATE(p.payment_date) BETWEEN ? AND ?
                    UNION ALL
                    SELECT 
                        CASE WHEN entry_type = 'BANK_CREDIT' THEN 'Bank Deposit' ELSE 'Bank Withdrawal' END AS bank,
                        CONCAT('TXN-', cashbook_id) AS reference,
                        amount,
                        'Success' AS status,
                        DATE_FORMAT(entry_date, '%Y-%m-%d %H:%i:%s') AS date
                    FROM cashbook
                    WHERE entry_type IN ('BANK_CREDIT', 'BANK_DEBIT') AND entry_date BETWEEN ? AND ?
                ) combined
                ORDER BY date DESC
            ";
            $bankTxRows = DB::select($bankQuery, [$startDate, $endDate, $startDate, $endDate]);

            return response()->json([
                'success' => true,
                'openingBalance' => $openingBalance,
                'rangeIncome' => $rangeIncome,
                'rangeExpense' => $rangeExpense,
                'rangeBankCredits' => $rangeBankCredits,
                'rangeBankDebits' => $rangeBankDebits,
                'closingBalance' => $closingBalance,
                'recentReceipts' => $receiptRows,
                'recentPayments' => $paymentRows,
                'bankTransactions' => $bankTxRows
            ]);
        } catch (\Exception $e) {
            Log::error('RANGE SUMMARY ERROR: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }
}
