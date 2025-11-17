<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tiers', function (Blueprint $table) {
            $table->integer('id')->autoIncrement();
            $table->string('numero_compte', 20)->unique();
            $table->string('nom_raison_sociale', 100);
            $table->string('bp', 20);
            $table->string('ville', 50);
            $table->string('pays', 50);
            $table->string('adresse_geo_1', 100);
            $table->string('adresse_geo_2', 100);
            $table->string('telephone', 20);
            $table->string('email', 100);
            $table->string('categorie', 100);
            $table->string('n_contribuable', 20);
            $table->string('type_tiers', 40);

            $table->index(['numero_compte']);
            $table->index(['nom_raison_sociale']);
            $table->index(['type_tiers']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tiers');
    }
};
