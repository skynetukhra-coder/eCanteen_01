<?php

namespace Tests\Feature;

use Tests\TestCase;

class CanteenApiTest extends TestCase
{
    public function test_health_check_returns_success(): void
    {
        $response = $this->getJson('/api/health');
        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ]);
    }

    public function test_menu_endpoint_returns_items(): void
    {
        $response = $this->getJson('/api/menu');
        $response->assertStatus(200);
        $this->assertIsArray($response->json());
    }

    public function test_meal_slots_endpoint(): void
    {
        $response = $this->getJson('/api/menu/slots/all');
        $response->assertStatus(200);
        $this->assertIsArray($response->json());
    }

    public function test_auth_login_validation(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'username' => 'NON_EXISTENT_USER',
            'password' => 'wrongpass'
        ]);
        $response->assertStatus(200)
            ->assertJson([
                'success' => false,
                'message' => 'User not found'
            ]);
    }

    public function test_orders_counter_stats(): void
    {
        $response = $this->getJson('/api/orders/counter-stats');
        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'total',
                'redeemed',
                'pending'
            ]);
    }

    public function test_admin_dashboard_metrics(): void
    {
        $response = $this->getJson('/api/admin-stats/dashboard');
        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'kpis',
                'orderTrend',
                'mealDistribution'
            ]);
    }

    public function test_employee_list(): void
    {
        $response = $this->getJson('/api/employee/list');
        $response->assertStatus(200);
        $this->assertIsArray($response->json());
    }

    public function test_active_kitchen_orders(): void
    {
        $response = $this->getJson('/api/orders/active');
        $response->assertStatus(200);
        $this->assertIsArray($response->json());
    }

    public function test_cashbook_summary(): void
    {
        $response = $this->getJson('/api/cashbook/summary');
        $response->assertStatus(200)
            ->assertJsonStructure([
                'todayIncome',
                'todayExpense',
                'netClosingToday',
                'paymentModeData'
            ]);
    }

    public function test_inventory_list(): void
    {
        $response = $this->getJson('/api/inventory');
        $response->assertStatus(200);
        $this->assertIsArray($response->json());
    }

    public function test_notifications_list(): void
    {
        $response = $this->getJson('/api/notifications/list');
        $response->assertStatus(200);
        $this->assertIsArray($response->json());
    }

    public function test_feedback_list(): void
    {
        $response = $this->getJson('/api/feedback/all');
        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'totalCount',
                'avgRating',
                'feedbacks'
            ]);
    }

    public function test_spa_root_and_fallback_routes(): void
    {
        $response = $this->get('/');
        $response->assertStatus(200);

        $responseFallback = $this->get('/home');
        $responseFallback->assertStatus(200);
    }

    public function test_wallet_hmac_tamper_detection(): void
    {
        $walletService = app(\App\Services\WalletService::class);
        $signature = $walletService->generateSignature(1, 250.00);
        $this->assertTrue($walletService->verifySignature(1, 250.00, $signature));
        $this->assertFalse($walletService->verifySignature(1, 500.00, $signature)); // Tampered amount
    }

    public function test_easebuzz_signature_generation(): void
    {
        $easebuzzService = app(\App\Services\EasebuzzService::class);
        $hash = $easebuzzService->generateInitiateHash([
            'txnid' => 'TEST_TXN_001',
            'amount' => 100.00,
            'productinfo' => 'Meal',
            'firstname' => 'Test',
            'email' => 'test@example.com'
        ]);
        $this->assertNotEmpty($hash);
        $this->assertEquals(128, strlen($hash)); // SHA-512 hex is 128 characters
    }
}
