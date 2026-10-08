<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\StoreInventory;
use App\Models\StoreIssue;
use App\Models\StorePurchase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class InventoryController extends Controller
{
    public function getAll()
    {
        try {
            $query = "
                SELECT si.*, 
                  COALESCE(
                    (SELECT sp.unit_cost FROM store_purchases sp WHERE sp.item_code = si.item_code ORDER BY sp.purchase_id DESC LIMIT 1),
                    si.unit_cost
                  ) AS last_purchased_price
                FROM store_inventory si
                ORDER BY si.item_id DESC
            ";
            $rows = DB::select($query);
            return response()->json($rows);
        } catch (\Exception $e) {
            Log::error('GET INVENTORY ERROR: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function getPurchases()
    {
        try {
            $purchases = StorePurchase::orderBy('purchase_id', 'desc')->get();
            return response()->json($purchases);
        } catch (\Exception $e) {
            Log::error('GET PURCHASES ERROR: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function createPurchase(Request $request)
    {
        try {
            $invoiceNumber = $request->input('invoice_number');
            $itemCode = $request->input('item_code');
            $itemName = $request->input('item_name');
            $category = $request->input('category');
            $unit = $request->input('unit');
            $supplierName = $request->input('supplier_name');
            $quantity = $request->input('quantity');
            $unitCost = $request->input('unit_cost');

            if (!$itemCode || !$itemName || !$category || !$unit || !$supplierName || !$quantity || !$unitCost) {
                return response()->json(['success' => false, 'message' => 'Missing required fields.'], 400);
            }

            $qtyNum = (float)$quantity;
            $costNum = (float)$unitCost;
            $totalAmount = $qtyNum * $costNum;

            $invoicePath = null;
            if ($request->hasFile('invoice')) {
                $file = $request->file('invoice');
                $filename = time() . '_' . preg_replace('/[^a-zA-Z0-9._-]/', '', $file->getClientOriginalName());
                $destinationPath = public_path('uploads');
                if (!is_dir($destinationPath)) {
                    mkdir($destinationPath, 0777, true);
                }
                $file->move($destinationPath, $filename);
                $invoicePath = "/uploads/{$filename}";
            }

            DB::beginTransaction();

            StorePurchase::create([
                'invoice_number' => $invoiceNumber ?: null,
                'item_code' => $itemCode,
                'item_name' => $itemName,
                'category' => $category,
                'unit' => $unit,
                'supplier_name' => $supplierName,
                'quantity' => $qtyNum,
                'unit_cost' => $costNum,
                'total_amount' => $totalAmount,
                'invoice_path' => $invoicePath,
                'purchase_date' => now(),
            ]);

            $existing = StoreInventory::where('item_code', $itemCode)->first();
            if (!$existing) {
                StoreInventory::create([
                    'item_code' => $itemCode,
                    'item_name' => $itemName,
                    'category' => $category,
                    'unit' => $unit,
                    'current_stock' => $qtyNum,
                    'minimum_stock' => 0.00,
                    'unit_cost' => $costNum,
                ]);
            } else {
                $existing->current_stock = (float)$existing->current_stock + $qtyNum;
                $existing->unit_cost = $costNum;
                $existing->item_name = $itemName;
                $existing->category = $category;
                $existing->unit = $unit;
                $existing->save();
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Purchase created successfully and inventory updated.'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('POST PURCHASE ERROR: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function issue(Request $request)
    {
        try {
            $itemCode = $request->input('item_code');
            $quantity = $request->input('quantity');
            $remarks = $request->input('remarks');

            if (!$itemCode || !$quantity) {
                return response()->json(['success' => false, 'message' => 'Missing item_code or quantity.'], 400);
            }

            $qtyNum = (float)$quantity;
            $item = StoreInventory::where('item_code', $itemCode)->first();
            if (!$item) {
                return response()->json(['success' => false, 'message' => 'Inventory item not found.'], 404);
            }

            $currentStock = (float)$item->current_stock;
            if ($currentStock < $qtyNum) {
                return response()->json([
                    'success' => false,
                    'message' => "Insufficient stock. Available: {$currentStock}"
                ], 400);
            }

            DB::beginTransaction();

            $item->current_stock = $currentStock - $qtyNum;
            $item->save();

            StoreIssue::create([
                'item_code' => $itemCode,
                'item_name' => $item->item_name,
                'quantity' => $qtyNum,
                'remarks' => $remarks ?: 'Stock Issued',
                'issued_date' => now(),
            ]);

            AuditLog::create([
                'action_name' => 'STOCK_ISSUE',
                'details' => "Issued {$qtyNum} of {$item->item_name} (Code: {$itemCode}). Remarks: " . ($remarks ?: 'Stock Issued') . '.',
                'severity' => 'INFO'
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => "Issued {$qtyNum} of {$item->item_name} successfully."
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('POST ISSUE ERROR: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function getIssues()
    {
        try {
            $issues = StoreIssue::orderBy('issue_id', 'desc')->get();
            return response()->json($issues);
        } catch (\Exception $e) {
            Log::error('GET ISSUES ERROR: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function add(Request $request)
    {
        try {
            $itemCode = $request->input('item_code');
            $itemName = $request->input('item_name');
            $category = $request->input('category');
            $unit = $request->input('unit');
            $minimumStock = (float)($request->input('minimum_stock') ?: 0);
            $unitCost = (float)($request->input('unit_cost') ?: 0);

            if (!$itemCode || !$itemName || !$category || !$unit) {
                return response()->json(['success' => false, 'message' => 'Missing required fields.'], 400);
            }

            StoreInventory::updateOrCreate(
                ['item_code' => $itemCode],
                [
                    'item_name' => $itemName,
                    'category' => $category,
                    'unit' => $unit,
                    'minimum_stock' => $minimumStock,
                    'unit_cost' => $unitCost,
                ]
            );

            return response()->json([
                'success' => true,
                'message' => 'Inventory item added/updated successfully.'
            ]);
        } catch (\Exception $e) {
            Log::error('ADD INVENTORY ITEM ERROR: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }
}
