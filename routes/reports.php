<?php

use App\Http\Controllers\ContentReportController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    Route::get('reports/{type}/{id}/create', [ContentReportController::class, 'create'])
        ->whereIn('type', ['topic', 'method', 'experience'])->where('id', '[1-9][0-9]{0,17}')->name('reports.create');
    Route::post('reports/{type}/{id}', [ContentReportController::class, 'store'])
        ->whereIn('type', ['topic', 'method', 'experience'])->where('id', '[1-9][0-9]{0,17}')
        ->middleware('throttle:5,1')->name('reports.store');
});
