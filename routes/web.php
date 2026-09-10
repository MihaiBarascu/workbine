<?php

use App\Http\Controllers\GoalController;
use Illuminate\Support\Facades\Route;

Route::get('/', [GoalController::class, 'index'])->name('home');
Route::get('goals', [GoalController::class, 'index'])->name('goals.index');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
    Route::get('goals/create', [GoalController::class, 'create'])->name('goals.create');
    Route::post('goals', [GoalController::class, 'store'])->name('goals.store');
});

Route::get('goals/{goal}', [GoalController::class, 'show'])->name('goals.show');

require __DIR__.'/settings.php';
