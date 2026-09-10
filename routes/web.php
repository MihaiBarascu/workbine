<?php

use App\Http\Controllers\Auth\GoogleAuthController;
use App\Http\Controllers\MethodController;
use App\Http\Controllers\TopicController;
use Illuminate\Support\Facades\Route;

Route::get('/', [TopicController::class, 'index'])->name('home');
Route::get('topics', [TopicController::class, 'index'])->name('topics.index');

Route::middleware('guest')->group(function () {
    Route::get('auth/google', [GoogleAuthController::class, 'redirect'])->name('google.redirect');
    Route::get('auth/google/callback', [GoogleAuthController::class, 'callback'])->name('google.callback');
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', fn () => to_route('topics.index'))->name('dashboard');
    Route::get('topics/create', [TopicController::class, 'create'])->name('topics.create');
    Route::post('topics', [TopicController::class, 'store'])->name('topics.store');
    Route::get('topics/{topic}/methods/create', [MethodController::class, 'create'])->name('methods.create');
    Route::post('topics/{topic}/methods', [MethodController::class, 'store'])->name('methods.store');
});

Route::get('topics/{topic}', [TopicController::class, 'show'])->name('topics.show');

Route::redirect('goals', '/topics', 301);
Route::redirect('goals/create', '/topics/create', 301);

require __DIR__.'/settings.php';
