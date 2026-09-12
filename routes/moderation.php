<?php

use App\Http\Controllers\ModerationController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified', 'can:moderate', 'cache.headers:no_store;private'])->prefix('moderation')->name('moderation.')->group(function (): void {
    Route::post('/members/{id}/restore', [ModerationController::class, 'restorePublishing'])->whereNumber('id')->middleware('throttle:30,1')->name('restore-publishing');
    Route::get('/', [ModerationController::class, 'index'])->name('index');
    Route::get('/{kind}/{id}', [ModerationController::class, 'show'])->whereIn('kind', ['review', 'report'])->whereNumber('id')->name('show');
    Route::get('/review/{id}/image', [ModerationController::class, 'image'])->whereNumber('id')->name('image');
    Route::post('/{kind}/{id}', [ModerationController::class, 'decide'])->whereIn('kind', ['review', 'report'])->whereNumber('id')->middleware('throttle:30,1')->name('decide');
});
