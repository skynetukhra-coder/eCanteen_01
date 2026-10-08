<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MenuItem extends Model
{
    protected $table = 'menu_items';
    protected $primaryKey = 'item_id';
    const UPDATED_AT = null;

    protected $fillable = [
        'image_url',
        'category',
        'item_name',
        'price',
        'available_qty',
        'issued',
        'is_active',
    ];
}
