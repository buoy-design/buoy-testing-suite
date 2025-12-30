import { mkdir, rm, stat, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { simpleGit, SimpleGit } from 'simple-git';
import type { DiscoveredRepo } from '../types.js';

export interface CacheOptions {
  reposDir: string;
  maxAgeDays?: number;
}

export interface CachedRepo {
  path: string;
  owner: string;
  name: string;
  lastUpdated: Date;
  sizeBytes: number;
}

export class RepoCache {
  private reposDir: string;
  private maxAgeDays: number;

  constructor(options: CacheOptions) {
    this.reposDir = options.reposDir;
    this.maxAgeDays = options.maxAgeDays ?? 7;
  }

  /**
   * Get path for a repo in the cache
   */
  getRepoPath(owner: string, name: string): string {
    return join(this.reposDir, owner, name);
  }

  /**
   * Check if repo exists in cache
   */
  async exists(owner: string, name: string): Promise<boolean> {
    const repoPath = this.getRepoPath(owner, name);
    return existsSync(repoPath);
  }

  /**
   * Clone or update a repo
   */
  async ensureRepo(repo: DiscoveredRepo): Promise<string> {
    const repoPath = this.getRepoPath(repo.owner, repo.name);

    if (await this.exists(repo.owner, repo.name)) {
      // Check if we need to update
      const needsUpdate = await this.needsUpdate(repo);
      if (needsUpdate) {
        await this.updateRepo(repoPath);
      }
    } else {
      await this.cloneRepo(repo, repoPath);
    }

    return repoPath;
  }

  /**
   * Clone a repo
   */
  private async cloneRepo(repo: DiscoveredRepo, targetPath: string): Promise<void> {
    // Ensure parent directory exists
    const parentDir = join(targetPath, '..');
    await mkdir(parentDir, { recursive: true });

    const git = simpleGit();

    // Shallow clone for speed
    await git.clone(repo.url, targetPath, [
      '--depth', '1',
      '--branch', repo.defaultBranch,
      '--single-branch',
    ]);
  }

  /**
   * Update an existing repo
   */
  private async updateRepo(repoPath: string): Promise<void> {
    const git: SimpleGit = simpleGit(repoPath);

    try {
      await git.fetch(['--depth', '1']);
      await git.reset(['--hard', 'origin/HEAD']);
    } catch (error) {
      // If update fails, we'll use what we have
      console.warn(`Failed to update repo at ${repoPath}:`, error);
    }
  }

  /**
   * Check if repo needs update based on last commit date
   */
  private async needsUpdate(repo: DiscoveredRepo): Promise<boolean> {
    const repoPath = this.getRepoPath(repo.owner, repo.name);

    try {
      const git: SimpleGit = simpleGit(repoPath);
      const log = await git.log({ maxCount: 1 });

      if (!log.latest) return true;

      const localDate = new Date(log.latest.date);
      const remoteDate = repo.lastCommit;

      // Update if remote has newer commits
      return remoteDate > localDate;
    } catch {
      return true;
    }
  }

  /**
   * Remove a repo from cache
   */
  async removeRepo(owner: string, name: string): Promise<boolean> {
    const repoPath = this.getRepoPath(owner, name);

    if (!existsSync(repoPath)) {
      return false;
    }

    await rm(repoPath, { recursive: true, force: true });

    // Clean up empty parent directory
    const ownerDir = join(this.reposDir, owner);
    try {
      const contents = await readdir(ownerDir);
      if (contents.length === 0) {
        await rm(ownerDir, { recursive: true });
      }
    } catch {
      // Ignore
    }

    return true;
  }

  /**
   * Get all cached repos
   */
  async listCached(): Promise<CachedRepo[]> {
    const cached: CachedRepo[] = [];

    if (!existsSync(this.reposDir)) {
      return cached;
    }

    try {
      const owners = await readdir(this.reposDir);

      for (const owner of owners) {
        const ownerPath = join(this.reposDir, owner);
        const ownerStat = await stat(ownerPath);

        if (!ownerStat.isDirectory()) continue;

        const repos = await readdir(ownerPath);

        for (const name of repos) {
          const repoPath = join(ownerPath, name);
          const repoStat = await stat(repoPath);

          if (!repoStat.isDirectory()) continue;

          cached.push({
            path: repoPath,
            owner,
            name,
            lastUpdated: repoStat.mtime,
            sizeBytes: await this.getDirSize(repoPath),
          });
        }
      }
    } catch (error) {
      console.error('Failed to list cached repos:', error);
    }

    return cached;
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalRepos: number;
    totalSizeBytes: number;
    oldestRepo: Date | null;
    newestRepo: Date | null;
  }> {
    const cached = await this.listCached();

    if (cached.length === 0) {
      return {
        totalRepos: 0,
        totalSizeBytes: 0,
        oldestRepo: null,
        newestRepo: null,
      };
    }

    const dates = cached.map((r) => r.lastUpdated.getTime());
    const sizes = cached.map((r) => r.sizeBytes);

    return {
      totalRepos: cached.length,
      totalSizeBytes: sizes.reduce((a, b) => a + b, 0),
      oldestRepo: new Date(Math.min(...dates)),
      newestRepo: new Date(Math.max(...dates)),
    };
  }

  /**
   * Clean repos older than maxAgeDays
   */
  async cleanOld(): Promise<number> {
    const cached = await this.listCached();
    const cutoff = Date.now() - this.maxAgeDays * 24 * 60 * 60 * 1000;
    let removed = 0;

    for (const repo of cached) {
      if (repo.lastUpdated.getTime() < cutoff) {
        await this.removeRepo(repo.owner, repo.name);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Clean all cached repos
   */
  async cleanAll(): Promise<number> {
    const cached = await this.listCached();

    for (const repo of cached) {
      await this.removeRepo(repo.owner, repo.name);
    }

    return cached.length;
  }

  /**
   * Get approximate directory size
   */
  private async getDirSize(dirPath: string): Promise<number> {
    let size = 0;

    try {
      const entries = await readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const entryPath = join(dirPath, entry.name);

        if (entry.isDirectory()) {
          // Skip .git for size calculation (it's large)
          if (entry.name !== '.git') {
            size += await this.getDirSize(entryPath);
          }
        } else {
          const fileStat = await stat(entryPath);
          size += fileStat.size;
        }
      }
    } catch {
      // Ignore errors
    }

    return size;
  }
}
