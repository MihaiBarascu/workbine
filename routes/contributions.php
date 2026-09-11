<?php

use App\Http\Controllers\MethodController;
use App\Http\Controllers\TopicController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->scopeBindings()->group(function () {
    Route::get('topics/{topic}/edit', [TopicController::class, 'edit'])->name('topics.edit');
    Route::patch('topics/{topic}', [TopicController::class, 'update'])->middleware('throttle:20,1')->name('topics.update');
    Route::get('topics/{topic}/methods/{method}/edit', [MethodController::class, 'edit'])->name('methods.edit');
    Route::patch('topics/{topic}/methods/{method}', [MethodController::class, 'update'])->middleware('throttle:20,1')->name('methods.update');
});
