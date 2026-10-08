<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Notification extends Model
{
    protected $table = 'notifications';
    protected $primaryKey = 'id';
    const UPDATED_AT = null;

    protected $fillable = [
        'type',
        'title',
        'message',
        'item_name',
        'price',
        'image_url',
        'show_in_bulletin',
    ];

    protected $casts = [
        'show_in_bulletin' => 'boolean',
    ];
}
