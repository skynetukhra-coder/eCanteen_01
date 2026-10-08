<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StoreInventory extends Model
{
    protected $table = 'store_inventory';
    protected $primaryKey = 'item_id';

    protected $fillable = [
        'item_code',
        'item_name',
        'category',
        'unit',
        'current_stock',
        'minimum_stock',
        'unit_cost',
    ];
}
