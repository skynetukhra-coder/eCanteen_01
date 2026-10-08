<?php

namespace App\Http\Controllers;

use App\Models\Feedback;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class FeedbackController extends Controller
{
    public function submitFeedback(Request $request)
    {
        try {
            $employeeId = $request->input('employee_id');
            $userName = $request->input('user_name');
            $rating = (int)$request->input('rating');
            $category = $request->input('category') ?: 'General';
            $message = $request->input('message');

            if (empty($userName) || empty($rating) || empty($message)) {
                return response()->json([
                    'success' => false,
                    'message' => 'User name, rating, and message are required fields.'
                ], 400);
            }

            if ($rating < 1 || $rating > 5) {
                return response()->json([
                    'success' => false,
                    'message' => 'Rating must be an integer between 1 and 5.'
                ], 400);
            }

            $feedback = Feedback::create([
                'employee_id' => $employeeId ?: null,
                'user_name' => $userName,
                'rating' => $rating,
                'category' => $category,
                'message' => $message,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Feedback submitted successfully!',
                'feedbackId' => $feedback->id
            ], 201);
        } catch (\Exception $e) {
            Log::error('SUBMIT FEEDBACK ERROR: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to submit feedback: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getAllFeedback()
    {
        try {
            $feedbacks = Feedback::orderBy('created_at', 'desc')->get();
            $totalCount = count($feedbacks);
            $avgRating = $totalCount > 0
                ? number_format($feedbacks->avg('rating'), 1)
                : 0.0;

            $ratingBreakdown = [5 => 0, 4 => 0, 3 => 0, 2 => 0, 1 => 0];
            foreach ($feedbacks as $f) {
                $r = (int)$f->rating;
                if (isset($ratingBreakdown[$r])) {
                    $ratingBreakdown[$r]++;
                }
            }

            return response()->json([
                'success' => true,
                'totalCount' => $totalCount,
                'avgRating' => (float)$avgRating,
                'ratingBreakdown' => $ratingBreakdown,
                'feedbacks' => $feedbacks
            ]);
        } catch (\Exception $e) {
            Log::error('GET ALL FEEDBACK ERROR: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch feedback list: ' . $e->getMessage()
            ], 500);
        }
    }

    public function deleteFeedback($id)
    {
        try {
            $deleted = Feedback::destroy($id);
            if (!$deleted) {
                return response()->json([
                    'success' => false,
                    'message' => 'Feedback entry not found'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'message' => 'Feedback deleted successfully'
            ]);
        } catch (\Exception $e) {
            Log::error('DELETE FEEDBACK ERROR: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete feedback: ' . $e->getMessage()
            ], 500);
        }
    }
}
