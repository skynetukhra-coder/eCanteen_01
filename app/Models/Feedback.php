<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Feedback extends Model
{
    protected $table = 'feedback';
    protected $primaryKey = 'id';
    const UPDATED_AT = null;

    protected $fillable = [
        'employee_id',
        'user_name',
        'rating',
        'category',
        'message',
    ];

    protected $casts = [
        'rating' => 'integer',
    ];
}
