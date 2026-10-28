<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    // GET /api/categories — public (any authenticated role); used for filter dropdowns everywhere
    public function index(Request $request)
    {
        $categories = Category::where('is_active', true)
            ->when(!$request->boolean('all'), fn ($q) => $q->whereNull('parent_id')) // top-level by default
            ->with('children')
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $categories]);
    }
}
