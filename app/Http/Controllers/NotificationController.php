<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class NotificationController extends Controller
{
    public function publish(Request $request)
    {
        try {
            $type = $request->input('type');
            $title = $request->input('title');
            $message = $request->input('message');
            $itemName = $request->input('item_name');
            $price = $request->input('price');
            $imageUrl = $request->input('image_url');
            $showInBulletin = $request->input('show_in_bulletin', true);

            if (!$type || !$title) {
                return response()->json(['success' => false, 'message' => 'Type and Title are required.'], 400);
            }

            $notification = Notification::create([
                'type' => $type,
                'title' => $title,
                'message' => $message ?: null,
                'item_name' => $itemName ?: null,
                'price' => $price ?: null,
                'image_url' => $imageUrl ?: null,
                'show_in_bulletin' => (bool)$showInBulletin,
            ]);

            AuditLog::create([
                'action_name' => 'BROADCAST_PUBLISHED',
                'details' => "Admin broadcasted a new {$type}: \"{$title}\"",
                'severity' => 'INFO'
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Notification published successfully',
                'id' => $notification->id
            ]);
        } catch (\Exception $e) {
            Log::error('PUBLISH NOTIFICATION ERROR: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function list()
    {
        try {
            $notifications = Notification::orderBy('id', 'desc')->get();
            return response()->json($notifications);
        } catch (\Exception $e) {
            Log::error('GET NOTIFICATIONS ERROR: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function delete($id)
    {
        try {
            Notification::destroy($id);
            return response()->json(['success' => true, 'message' => 'Notification deleted successfully']);
        } catch (\Exception $e) {
            Log::error('DELETE NOTIFICATION ERROR: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function toggleBulletin(Request $request, $id)
    {
        try {
            $show = $request->input('show');
            $notification = Notification::find($id);
            if (!$notification) {
                return response()->json(['success' => false, 'message' => 'Notification not found'], 404);
            }

            $notification->show_in_bulletin = (bool)$show;
            $notification->save();

            AuditLog::create([
                'action_name' => 'BROADCAST_BULLETIN_TOGGLED',
                'details' => "Admin toggled bulletin status of notification ID {$id} to " . ($show ? 'Show' : 'Hide'),
                'severity' => 'INFO'
            ]);

            return response()->json(['success' => true, 'message' => 'Bulletin status updated successfully']);
        } catch (\Exception $e) {
            Log::error('TOGGLE BULLETIN ERROR: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }
}
