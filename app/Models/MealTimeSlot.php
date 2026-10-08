<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MealTimeSlot extends Model
{
    protected $table = 'meal_time_slots';
    protected $primaryKey = 'category';
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    protected $fillable = [
        'category',
        'start_time',
        'end_time',
    ];
}
