<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Traite extends Model
{
    use HasFactory;

    protected $table = 'traites';

    protected $guarded = [];

    // Valeur par défaut pour statut si non fourni
    protected $attributes = [
        'statut' => 'Non échu',
    ];

    // S'assurer que statut n'est jamais null lors des mises à jour
    protected static function boot()
    {
        parent::boot();
        
        static::saving(function ($model) {
            if (is_null($model->statut)) {
                $model->statut = 'Non échu';
            }
        });
    }

    public function activities()
    {
        return $this->hasMany(TraiteActivity::class);
    }

    public function latestActivity()
    {
        return $this->hasOne(TraiteActivity::class)->latestOfMany();
    }
}


