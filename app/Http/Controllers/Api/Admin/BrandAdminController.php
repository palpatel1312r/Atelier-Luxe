<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class BrandAdminController extends Controller
{
    public function index() { return response()->json(['data' => Brand::orderBy('name')->get()]); }

    public function store(Request $request)
    {
        $data = $request->validate(['name' => 'required|string|max:255', 'logo' => 'nullable|string']);
        $data['slug'] = Str::slug($data['name']) . '-' . Str::random(4);
        return response()->json(['data' => Brand::create($data)], 201);
    }

    public function update(Request $request, Brand $brand)
    {
        $data = $request->validate(['name' => 'sometimes|string|max:255', 'is_active' => 'sometimes|boolean', 'logo' => 'sometimes|nullable|string']);
        $brand->update($data);
        return response()->json(['data' => $brand]);
    }

    public function destroy(Brand $brand)
    {
        if ($brand->products()->exists()) {
            return response()->json(['message' => 'Cannot delete: brand has products.'], 422);
        }
        $brand->delete();
        return response()->json(['message' => 'Brand deleted.']);
    }
}
