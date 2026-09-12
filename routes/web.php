<?php

use App\Http\Controllers\Auth\GoogleAuthController;
use App\Http\Controllers\CommunityNotificationController;
use App\Http\Controllers\EditorImageController;
use App\Http\Controllers\ExperienceController;
use App\Http\Controllers\MemberController;
use App\Http\Controllers\MethodController;
use App\Http\Controllers\TopicController;
use App\Http\Controllers\TopicLikeController;
use App\Http\Middleware\ThrottleImageUploads;
use Illuminate\Support\Facades\Route;
use Inertia\Middleware\EncryptHistory;

Route::inertia('community/guide', 'community/guide')->name('community.guide');

Route::middleware(['auth', EncryptHistory::class])->group(function () {
    Route::get('notifications', [CommunityNotificationController::class, 'index'])->name('notifications.index');
    Route::post('notifications/read', [CommunityNotificationController::class, 'readAll'])->middleware('throttle:60,1')->name('notifications.read-all');
    Route::post('notifications/{notification}/open', [CommunityNotificationController::class, 'open'])->whereNumber('notification')->middleware('throttle:60,1')->name('notifications.open');
});

Route::get('/', [TopicController::class, 'index'])->name('home');
Route::get('topics', [TopicController::class, 'index'])->name('topics.index');
Route::inertia('community/reputation', 'community/reputation')->name('community.reputation');
Route::get('members/{user}', [MemberController::class, 'redirectFromId'])->whereNumber('user')->name('members.legacy');
Route::get('members/{username}', [MemberController::class, 'show'])->where('username', '[A-Za-z][A-Za-z0-9-]{2,29}')->name('members.show');

Route::middleware('guest')->group(function () {
    Route::get('auth/google', [GoogleAuthController::class, 'redirect'])->name('google.redirect');
    Route::get('auth/google/callback', [GoogleAuthController::class, 'callback'])->name('google.callback');
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::post('editor/images', [EditorImageController::class, 'store'])->middleware(['throttle:20,1', ThrottleImageUploads::class])->name('editor.images.store');
    Route::get('dashboard', fn () => to_route('topics.index'))->name('dashboard');
    Route::get('topics/create', [TopicController::class, 'create'])->name('topics.create');
    Route::post('topics', [TopicController::class, 'store'])->middleware('throttle:20,1')->name('topics.store');
    Route::get('topics/{topic}/methods/create', [MethodController::class, 'create'])->name('methods.create');
    Route::post('topics/{topic}/methods', [MethodController::class, 'store'])->middleware('throttle:20,1')->name('methods.store');
});

Route::scopeBindings()->group(function () {
    Route::get('topics/{topic}/methods/{method}/experiences', [ExperienceController::class, 'index'])->name('experiences.index');

    Route::middleware(['auth', 'verified'])->group(function () {
        Route::get('topics/{topic}/methods/{method}/experiences/create', [ExperienceController::class, 'create'])->name('experiences.create');
        Route::put('topics/{topic}/methods/{method}/experience', [ExperienceController::class, 'store'])->middleware(['throttle:20,1', ThrottleImageUploads::class])->name('experiences.store');
        Route::delete('topics/{topic}/methods/{method}/experience', [ExperienceController::class, 'destroy'])->middleware('throttle:20,1')->name('experiences.destroy');
    });
});

Route::get('topics/{topic}', [TopicController::class, 'show'])->name('topics.show');

Route::redirect('goals', '/topics', 301);
Route::redirect('goals/create', '/topics/create', 301);

require __DIR__.'/settings.php';
require __DIR__.'/contributions.php';
require __DIR__.'/saved.php';
require __DIR__.'/reports.php';

require __DIR__.'/moderation.php';

Route::middleware(['auth', 'verified'])->group(function () {
    Route::put('topics/{topic}/like', [TopicLikeController::class, 'store'])->middleware('throttle:60,1')->name('topics.like');
    Route::delete('topics/{topic}/like', [TopicLikeController::class, 'destroy'])->middleware('throttle:60,1')->name('topics.unlike');
});
