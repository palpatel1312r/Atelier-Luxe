<?php

namespace App\Console\Commands;

use App\Models\Tenant;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

/**
 * Dumps every tenant's database individually (not just the central DB) —
 * each tenant is a separate mysqldump so a single company's data can be
 * restored without touching anyone else's, and backups can be retained/deleted
 * per-tenant (relevant if a tenant's contract ends and their data must be purged).
 *
 * Schedule alongside orders:release-expired in routes/console.php:
 *   Schedule::command('tenants:backup')->dailyAt('02:00');
 */
class BackupTenantDatabases extends Command
{
    protected $signature = 'tenants:backup {--disk=s3 : Filesystem disk to store dumps on}';
    protected $description = 'Dump every tenant database individually and upload to the given disk';

    public function handle(): int
    {
        $disk = $this->option('disk');
        $date = now()->format('Y-m-d_His');

        foreach (Tenant::all() as $tenant) {
            $dbName = $tenant->database_name;
            $filename = "{$dbName}_{$date}.sql.gz";
            $tmpPath = storage_path("app/tmp_backups/{$filename}");

            @mkdir(dirname($tmpPath), 0755, true);

            $host = config('database.connections.mysql.host');
            $user = config('database.connections.mysql.username');
            $pass = config('database.connections.mysql.password');

            // Password is passed via the MYSQL_PWD environment variable rather than
            // as a -p{password} CLI argument — a CLI argument is visible to any other
            // process on the box via `ps aux` for as long as mysqldump runs, which is
            // a real credential-leak vector on shared/multi-tenant hosts. MYSQL_PWD
            // is only visible to processes with permission to read this process's
            // own environment, which is a materially smaller exposure surface.
            $command = sprintf(
                'MYSQL_PWD=%s mysqldump -h %s -u %s %s | gzip > %s',
                escapeshellarg($pass), escapeshellarg($host), escapeshellarg($user),
                escapeshellarg($dbName), escapeshellarg($tmpPath)
            );

            exec($command, $output, $exitCode);

            if ($exitCode !== 0 || !file_exists($tmpPath)) {
                $this->error("Backup FAILED for tenant: {$tenant->company_name} ({$dbName})");
                continue;
            }

            Storage::disk($disk)->put("backups/{$dbName}/{$filename}", file_get_contents($tmpPath));
            unlink($tmpPath);

            $this->info("Backed up: {$tenant->company_name} -> {$disk}:backups/{$dbName}/{$filename}");
        }

        return self::SUCCESS;
    }
}
