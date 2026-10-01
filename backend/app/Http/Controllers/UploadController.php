<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class UploadController extends Controller
{
  public function store(Request $request)
  {
    $request->validate([
      'image' => 'required|image|max:5120', // 5MB
    ]);

    $file = $request->file('image');
    $name = time() . '-' . preg_replace('/\s+/', '-', $file->getClientOriginalName());
    $path = $file->storeAs('uploads', $name, 'public');
    // $path = "uploads/tshirt-1234-foo.jpg"

    return response()->json([
      'url' => asset('storage/' . $path),   // "http://localhost:8000/storage/uploads/..."
      'path' => $path,                       // "uploads/tshirt-1234-foo.jpg"
    ]);
  }
  public function upload(Request $request)
{
    $request->validate([
        'image'   => 'required|image|mimes:jpeg,png,webp,gif|max:5120',
        'images'  => 'sometimes|array',
        'images.*'=> 'image|mimes:jpeg,png,webp,gif|max:5120',
    ]);

    if ($request->hasFile('images')) {
        $paths = [];
        foreach ($request->file('images') as $file) {
            $name = time() . '-' . uniqid() . '-' . $file->getClientOriginalName();
            $file->move(public_path('storage/uploads'), $name);
            $paths[] = '/storage/uploads/' . $name;
        }
        return response()->json(['paths' => $paths]);
    }

    // single fallback (unchanged)
    $file = $request->file('image');
    $name = time() . '-' . $file->getClientOriginalName();
    $file->move(public_path('storage/uploads'), $name);

    return response()->json([
        'url'  => '/storage/uploads/' . $name,
        'path' => '/storage/uploads/' . $name,
    ]);
}
}
