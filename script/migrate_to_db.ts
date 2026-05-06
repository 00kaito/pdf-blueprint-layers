import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

import { config } from '../server/config';

async function migrate() {
  // Dynamically import db and schema
  const { db, pool } = await import('../server/db');
  const schema = await import('../shared/schema');
  const { users, projects, projectShares, files } = schema;
  const { count, eq } = await import('drizzle-orm');

  console.log('Starting migration...');

  const dataDir = path.join(rootDir, 'data');
  const storageRoot = path.join(rootDir, 'storage');

  // Ensure storage root exists
  if (!fs.existsSync(storageRoot)) {
    fs.mkdirSync(storageRoot, { recursive: true });
  }

  // 2. Migrate Users
  const usersPath = path.join(dataDir, 'users.json');
  const sourceUsers = JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
  let usersInserted = 0;

  for (const user of sourceUsers) {
    await db.insert(users).values({
      id: user.id,
      username: user.username,
      passwordHash: user.passwordHash,
      createdAt: user.createdAt
    }).onConflictDoNothing();
    usersInserted++;
  }
  console.log(`Users processed: ${usersInserted}`);

  // 3. Migrate Projects and Shares
  const projectsPath = path.join(dataDir, 'projects.json');
  const statesDir = path.join(dataDir, 'project-states');
  const sourceProjects = JSON.parse(fs.readFileSync(projectsPath, 'utf-8'));
  let projectsInserted = 0;
  let sharesInserted = 0;

  for (const project of sourceProjects) {
    let state = {};
    const statePath = path.join(statesDir, `${project.id}.json`);
    if (fs.existsSync(statePath)) {
      state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
    }

    await db.insert(projects).values({
      id: project.id,
      ownerId: project.ownerId,
      name: project.name,
      state: state,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt
    }).onConflictDoNothing();
    projectsInserted++;

    if (project.sharedWith && Array.isArray(project.sharedWith)) {
      for (const userId of project.sharedWith) {
        await db.insert(projectShares).values({
          projectId: project.id,
          userId: userId
        }).onConflictDoNothing();
        sharesInserted++;
      }
    }
  }
  console.log(`Projects processed: ${projectsInserted}`);
  console.log(`Project shares processed: ${sharesInserted}`);

  // 4. Migrate Files
  const filesDir = path.join(dataDir, 'files');
  const metaFiles = fs.readdirSync(filesDir).filter(f => f.endsWith('.meta.json'));
  let filesInserted = 0;

  for (const metaFile of metaFiles) {
    const metaPath = path.join(filesDir, metaFile);
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    const physicalPath = path.join(filesDir, meta.id);

    if (!fs.existsSync(physicalPath)) {
      console.warn(`Physical file missing for meta ${meta.id}, skipping.`);
      continue;
    }

    const stats = fs.statSync(physicalPath);
    const size = stats.size;

    let targetDir;
    if (meta.projectId) {
      targetDir = path.join(storageRoot, 'projects', meta.projectId);
    } else {
      targetDir = path.join(storageRoot, 'users', meta.ownerId, 'icons');
    }

    fs.mkdirSync(targetDir, { recursive: true });
    const newPhysicalPath = path.join(targetDir, meta.id);
    fs.copyFileSync(physicalPath, newPhysicalPath);

    // storagePath should be relative to root or absolute? 
    // Plan says: "Set storagePath = path.join(targetDir, id)"
    // And in saveFile: "storagePath = path.join(targetDir, id)"
    // So absolute path.

    await db.insert(files).values({
      id: meta.id,
      ownerId: meta.ownerId,
      projectId: meta.projectId || null,
      originalName: meta.originalName,
      mimeType: meta.mimeType,
      storagePath: newPhysicalPath,
      size: size,
      createdAt: meta.createdAt
    }).onConflictDoNothing();
    filesInserted++;
  }
  console.log(`Files processed: ${filesInserted}`);

  // 5. Validation Summary
  console.log('\n--- Validation Summary ---');
  const dbUsersCount = await db.select({ value: count() }).from(users);
  const dbProjectsCount = await db.select({ value: count() }).from(projects);
  const dbSharesCount = await db.select({ value: count() }).from(projectShares);
  const dbFilesCount = await db.select({ value: count() }).from(files);

  console.log(`Users: Source=${sourceUsers.length}, DB=${dbUsersCount[0].value}`);
  console.log(`Projects: Source=${sourceProjects.length}, DB=${dbProjectsCount[0].value}`);
  console.log(`Project Shares: DB=${dbSharesCount[0].value}`);
  console.log(`Files: Source=${metaFiles.length}, DB=${dbFilesCount[0].value}`);

  console.log('\nMigration completed successfully.');
  console.log('Reminder: Physical files were copied to the "storage/" directory. Old files in "data/files/" can be safely removed after verification.');

  await pool.end();
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
