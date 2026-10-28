<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Str;


class UploadController extends Controller
{

    public function store(Request $request)
    {
        $request->validate([
            'file'   => 'required|file|mimes:jpg,jpeg,png,webp,pdf|max:5120',
            'folder' => 'nullable|string|in:products,chat,misc',
        ]);

        $folder   = $request->input('folder', 'misc');
        $filename = Str::uuid() . '.' . $request->file('file')->getClientOriginalExtension();

        $path = $request->file('file')->storeAs($folder, $filename, 'public');

        return response()->json([
            'path'      => '/storage/' . $path,
            'file_type' => $request->file('file')->getMimeType(),
        ]);
    }
}
