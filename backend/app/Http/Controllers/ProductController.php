<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\Request;

class ProductController extends Controller
{
public function index(Request $request)
    {
        $q = Product::query()->where('is_active', true);

        if ($request->filled('category')) {
            $q->where('category', $request->category);
        }

        if ($request->filled('search')) {
            $q->where('name', 'like', '%' . $request->search . '%');
        }

        return response()->json($q->latest()->get());
    }

  public function show(Product $product, $id)
  {
     $product = Product::where('is_active', true)->findOrFail($id);
    return response()->json($product);
  }

  public function adminIndex()
  {
    return response()->json(Product::latest()->get());
  }

  public function store(Request $request)
  {
    $data = $request->validate([
      'name'        => 'required|string|max:255',
      'description' => 'nullable|string',
      'details'     => 'nullable|array',
      'price'       => 'required|numeric|min:0',
      'category'    => 'nullable|string|max:100',
      'category_id' => 'nullable|exists:categories,id',
      'color'       => 'nullable|string|max:100',
      'sizes'       => 'nullable|array',
      'image'       => 'nullable|string|max:2048',
      'image_file'  => 'nullable|file|image|max:4096',
      'stock'       => 'nullable|integer|min:0',
      'featured'    => 'nullable|boolean',
    ]);

    if ($request->hasFile('image_file')) {
      $path = $request->file('image_file')->store('uploads', 'public');
      $data['image'] = $path; // e.g. "uploads/1790...jpg"
    }
    unset($data['image_file']);

    return response()->json(Product::create($data), 201);
  }

  public function update(Request $request, Product $product)
  {
    $data = $request->validate([
      'name'        => 'sometimes|string|max:255',
      'description' => 'nullable|string',
      'details'     => 'nullable|array',
      'price'       => 'sometimes|numeric|min:0',
      'category'    => 'nullable|string|max:100',
      'category_id' => 'nullable|exists:categories,id',
      'color'       => 'nullable|string|max:100',
      'sizes'       => 'nullable|array',
      'image'       => 'nullable|string|max:2048',
      'image_file'  => 'nullable|file|image|max:4096',
      'stock'       => 'nullable|integer|min:0',
      'featured'    => 'nullable|boolean',
    ]);

    if ($request->hasFile('image_file')) {
      $path = $request->file('image_file')->store('uploads', 'public');
      $data['image'] = $path;
    }
    unset($data['image_file']);

    $product->update($data);

    return response()->json($product->fresh());
  }

  public function categories()
  {
    $categories = Product::query()
      ->whereNotNull('category')
      ->where('category', '!=', '')
      ->select('category')
      ->distinct()
      ->orderBy('category')
      ->pluck('category');

    return response()->json($categories);
  }

  public function destroy(Product $product)
  {
    $product->delete();

    return response()->json(['message' => 'Deleted']);
  }
}
