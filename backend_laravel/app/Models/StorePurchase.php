<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StorePurchase extends Model
{
    protected $table = 'store_purchases';
    protected $primaryKey = 'purchase_id';
    const UPDATED_AT = null;

    protected $fillable = [
        'invoice_number',
        'item_code',
        'item_name',
        'category',
        'unit',
        'supplier_name',
        'quantity',
        'unit_cost',
        'total_amount',
        'invoice_path',
        'purchase_date',
    ];
}
