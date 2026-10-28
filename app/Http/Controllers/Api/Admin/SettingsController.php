<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
  public function getLogo()
  {
    $logoPath = Setting::where('key', 'site_logo')->value('value');

    if (!$logoPath) {
      return response()->json(['logo' => null]);
    }

    // ---------- Extract relative path from full URL or relative path ----------
    $relativePath = $logoPath;

    // Case 1: full URL containing /storage/
    if (str_contains($logoPath, '/storage/')) {
      $relativePath = substr($logoPath, strpos($logoPath, '/storage/') + strlen('/storage/'));
    }
    // Case 2: already starts with storage/
    elseif (str_starts_with($logoPath, 'storage/')) {
      $relativePath = substr($logoPath, strlen('storage/'));
    }
    // Case 3: starts with /storage/
    elseif (str_starts_with($logoPath, '/storage/')) {
      $relativePath = substr($logoPath, strlen('/storage/'));
    }

    $relativePath = ltrim($relativePath, '/');
    $fullPath = storage_path('app/public/' . $relativePath);

    // Debug (remove later)
    // \Log::info('Logo debug', compact('logoPath', 'relativePath', 'fullPath'));

    if (!file_exists($fullPath)) {
      return response()->json([
        'logo' => null,
        'debug' => [
          'stored'   => $logoPath,
          'relative' => $relativePath,
          'full'     => $fullPath,
        ]
      ]);
    }

    $mime = mime_content_type($fullPath) ?: 'image/png';
    $base64 = base64_encode(file_get_contents($fullPath));

    return response()->json([
      'logo' => "data:{$mime};base64,{$base64}"
    ]);
  }

  public function setLogo(Request $request)
  {
    $data = $request->validate(['path' => 'required|string']);

    Setting::updateOrCreate(
      ['key' => 'site_logo'],
      ['value' => $data['path']],
    );

    $path = $data['path'];
    $url = str_starts_with($path, 'http')
      ? $path
      : url(str_starts_with($path, '/') ? $path : '/' . $path);

    return response()->json([
      'message' => 'Logo updated.',
      'logo' => $url,
    ]);
  }
}
