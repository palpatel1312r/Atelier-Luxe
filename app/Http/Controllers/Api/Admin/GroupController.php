<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Group;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class GroupController extends Controller
{
    public function index() { return response()->json(['data' => Group::withCount('users')->get()]); }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'discount_percentage' => 'nullable|numeric|min:0|max:100',
        ]);
        $data['slug'] = Str::slug($data['name']);
        return response()->json(['data' => Group::create($data)], 201);
    }

    public function update(Request $request, Group $group)
    {
        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'discount_percentage' => 'nullable|numeric|min:0|max:100',
        ]);
        if (isset($data['name'])) $data['slug'] = Str::slug($data['name']);
        $group->update($data);
        return response()->json(['data' => $group]);
    }

    public function destroy(Group $group)
    {
        if ($group->users()->exists()) {
            return response()->json(['message' => 'Cannot delete a group that has dealers assigned. Move them first.'], 422);
        }
        $group->delete();
        return response()->json(['message' => 'Group deleted.']);
    }
}
