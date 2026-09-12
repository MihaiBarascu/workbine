<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\ImageUploads;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EditorImageController extends Controller
{
    public function store(Request $request, ImageUploads $uploads): JsonResponse
    {
        $request->validate(['image' => ['required', ...ImageUploads::rules()]]);
        /** @var User $user */
        $user = $request->user();
        $image = $uploads->store($user, $request->file('image'), 'image');
        $image->update(['rich_text' => true]);

        return response()->json(['id' => $image->id, ...$image->publicData()], 201);
    }
}
