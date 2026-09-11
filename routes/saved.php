<?php

use App\Http\Controllers\SavedTopicController;
use Illuminate\Support\Facades\Route;
use Inertia\Middleware\EncryptHistory;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('saved', [SavedTopicController::class, 'index'])->middleware(EncryptHistory::class)->name('saved.index');
    Route::get('topics/{topic}/save', [SavedTopicController::class, 'create'])->name('saved.create');
    Route::put('topics/{topic}/saved', [SavedTopicController::class, 'store'])->middleware('throttle:60,1')->name('saved.store');
    Route::delete('topics/{topic}/saved', [SavedTopicController::class, 'destroy'])->middleware('throttle:60,1')->name('saved.destroy');
});
