<?php

namespace App\Http\Controllers;

use App\Models\MealTimeSlot;
use App\Models\MenuItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class MenuController extends Controller
{
    public function getAllItems()
    {
        try {
            $items = MenuItem::orderBy('item_id', 'desc')->get();
            return response()->json($items);
        } catch (\Exception $e) {
            Log::error('GET ALL MENU ITEMS ERROR: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function getSalesReport(Request $request)
    {
        try {
            $startDate = $request->query('startDate');
            $endDate = $request->query('endDate');

            $query = "
                SELECT 
                    m.*,
                    IFNULL(sales.issued, 0) AS issued
                FROM menu_items m
                LEFT JOIN (
                    SELECT oi.item_id, SUM(oi.quantity) AS issued
                    FROM order_items oi
                    JOIN orders o ON o.order_id = oi.order_id
                    WHERE 1=1
            ";

            $bindings = [];

            if ($startDate) {
                $query .= " AND o.created_at >= ?";
                $bindings[] = "{$startDate} 00:00:00";
            }
            if ($endDate) {
                $query .= " AND o.created_at <= ?";
                $bindings[] = "{$endDate} 23:59:59";
            }

            $query .= "
                    GROUP BY oi.item_id
                ) sales ON sales.item_id = m.item_id
                ORDER BY m.item_id DESC
            ";

            $rows = DB::select($query, $bindings);
            return response()->json($rows);
        } catch (\Exception $e) {
            Log::error('GET SALES REPORT ERROR: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function addItem(Request $request)
    {
        try {
            MenuItem::create([
                'image_url' => $request->input('image_url'),
                'category' => $request->input('category'),
                'item_name' => $request->input('item_name'),
                'price' => $request->input('price'),
                'available_qty' => $request->input('available_qty'),
                'issued' => (int)($request->input('issued') ?: 0),
                'is_active' => $request->input('is_active') ?: 'ACTIVE',
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Item Added'
            ]);
        } catch (\Exception $e) {
            Log::error('ADD MENU ITEM ERROR: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function updateItem(Request $request, $id)
    {
        try {
            $item = MenuItem::find($id);
            if (!$item) {
                return response()->json([
                    'success' => false,
                    'message' => 'Item not found'
                ], 404);
            }

            $allowed = ['category', 'item_name', 'price', 'available_qty', 'is_active', 'issued', 'image_url'];
            foreach ($allowed as $field) {
                if ($request->has($field)) {
                    $item->{$field} = $request->input($field);
                }
            }
            $item->save();

            return response()->json([
                'success' => true,
                'message' => 'Item Updated'
            ]);
        } catch (\Exception $e) {
            Log::error('UPDATE MENU ITEM ERROR: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function deleteItem($id)
    {
        try {
            MenuItem::destroy($id);
            return response()->json([
                'success' => true,
                'message' => 'Item Deleted'
            ]);
        } catch (\Exception $e) {
            Log::error('DELETE MENU ITEM ERROR: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function uploadImage(Request $request)
    {
        try {
            if ($request->hasFile('image')) {
                $file = $request->file('image');
                $filename = time() . '_' . preg_replace('/[^a-zA-Z0-9._-]/', '', $file->getClientOriginalName());
                $destinationPath = public_path('uploads');
                if (!is_dir($destinationPath)) {
                    mkdir($destinationPath, 0777, true);
                }
                $file->move($destinationPath, $filename);

                return response()->json([
                    'success' => true,
                    'image_url' => "/uploads/{$filename}"
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'No image uploaded'
            ], 400);
        } catch (\Exception $e) {
            Log::error('UPLOAD MENU IMAGE ERROR: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function getSlots()
    {
        try {
            $slots = MealTimeSlot::all();
            return response()->json($slots);
        } catch (\Exception $e) {
            Log::error('GET SLOTS ERROR: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function updateSlots(Request $request)
    {
        try {
            $slots = $request->input('slots');
            if ($slots && is_array($slots)) {
                foreach ($slots as $slot) {
                    MealTimeSlot::whereRaw('LOWER(category) = ?', [strtolower($slot['category'])])
                        ->update([
                            'start_time' => $slot['start_time'] ?? '',
                            'end_time' => $slot['end_time'] ?? '',
                        ]);
                }
            } else {
                $categories = ['breakfast', 'lunch', 'snacks', 'tiffin'];
                foreach ($categories as $cat) {
                    if ($request->has($cat)) {
                        $data = $request->input($cat);
                        MealTimeSlot::whereRaw('LOWER(category) = ?', [$cat])
                            ->update([
                                'start_time' => $data['start_time'] ?? '',
                                'end_time' => $data['end_time'] ?? '',
                            ]);
                    }
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Meal time slots updated successfully!'
            ]);
        } catch (\Exception $e) {
            Log::error('UPDATE SLOTS ERROR: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function getByCategory($category)
    {
        try {
            $formattedCategory = ucfirst(strtolower($category));
            $queryCategories = in_array($formattedCategory, ['Tiffin', 'Snacks'])
                ? ['Tiffin', 'Snacks']
                : [$formattedCategory];

            $items = DB::table('menu_items')
                ->select([
                    'item_id as id',
                    'item_name as name',
                    'price',
                    'image_url',
                    'available_qty'
                ])
                ->whereIn('category', $queryCategories)
                ->where('is_active', 'ACTIVE')
                ->get();

            return response()->json($items);
        } catch (\Exception $e) {
            Log::error('GET BY CATEGORY ERROR: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }
}
