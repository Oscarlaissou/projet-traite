<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('client_approvals', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tier_id');
            $table->unsignedBigInteger('user_id');
            $table->string('status'); // approved, rejected
            $table->text('rejection_reason')->nullable();
            $table->timestamps();
            
            $table->foreign('tier_id')->references('id')->on('tiers')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('client_approvals');
    }
};