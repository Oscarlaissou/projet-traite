<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Modèle Eloquent pour la table des tiers (clients).
 */
class Tier extends Model
{
    use HasFactory;

    /**
     * Définition explicite du nom de la table cible.
     */
    protected $table = 'tiers';

    /**
     * La table tiers ne contient pas les colonnes created_at / updated_at.
     */
    public $timestamps = false;

    /**
     * Aucune protection sur les attributs afin de permettre les remplissages massifs contrôlés.
     */
    protected $guarded = [];

    /**
     * Casting basique des attributs temporels.
     */
    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];
    protected $fillable = [
        'numero_compte',
        'nom_raison_sociale',
        'bp',
        'ville',
        'pays',
        'adresse_geo_1',
        'adresse_geo_2',
        'telephone',
        'email',
        'categorie',
        'n_contribuable',
        'type_tiers',
    ];

    /**
     * Relation avec les activités du tier.
     */
    public function activities()
    {
        return $this->hasMany(TierActivity::class);
    }

    /**
     * Relation avec la dernière activité du tier.
     */
    public function latestActivity()
    {
        return $this->hasOne(TierActivity::class)->latestOfMany();
    }
}


