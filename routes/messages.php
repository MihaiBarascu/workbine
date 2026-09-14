<?php

use App\Http\Controllers\ConversationController;
use App\Http\Controllers\UserBlockController;
use Illuminate\Support\Facades\Route;
use Inertia\Middleware\EncryptHistory;

Route::middleware(['auth', 'verified', EncryptHistory::class])->group(function () {
    Route::get('messages', [ConversationController::class, 'index'])->name('messages.index');
    Route::get('messages/{conversation}', [ConversationController::class, 'show'])->whereNumber('conversation')->name('messages.show');
    Route::post('messages/{conversation}', [ConversationController::class, 'reply'])->whereNumber('conversation')->middleware('throttle:30,1')->name('messages.reply');

    Route::get('members/{username}/message', [ConversationController::class, 'create'])->where('username', '[A-Za-z][A-Za-z0-9-]{2,29}')->name('messages.create');
    Route::post('members/{username}/message', [ConversationController::class, 'start'])->where('username', '[A-Za-z][A-Za-z0-9-]{2,29}')->middleware('throttle:30,1')->name('messages.start');
    Route::post('members/{username}/block', [UserBlockController::class, 'store'])->where('username', '[A-Za-z][A-Za-z0-9-]{2,29}')->middleware('throttle:20,1')->name('members.block');
    Route::delete('members/{username}/block', [UserBlockController::class, 'destroy'])->where('username', '[A-Za-z][A-Za-z0-9-]{2,29}')->middleware('throttle:20,1')->name('members.unblock');
});
