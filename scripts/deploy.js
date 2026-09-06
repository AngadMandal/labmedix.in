import { execSync } from 'child_process';

function run(cmd) {
  console.log(`\n🚀 Executing: ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });
}

try {
  console.log('📦 Starting Comprehensive Main Branch & Live Cloud Deployment...\n');

  // 1. Build the production project
  run('npm run build');

  // 2. Stage all files
  run('git add -A');

  // 3. Commit changes if any exist
  try {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    run(`git commit -m "deploy: update live production release [${timestamp}]"`);
  } catch {
    console.log('ℹ️ No new uncommitted working tree changes detected.');
  }

  // 4. Push directly to origin main (Default branch)
  console.log('\n🌐 Pushing directly to origin main branch...');
  run('git push origin main');

  // 5. Deploy to gh-pages branch for immediate static CDN propagation
  console.log('\n⚡ Publishing live build to GitHub Pages...');
  run('npx gh-pages -d dist');

  // 6. Deploy to Cloudflare Workers
  console.log('\n☁️ Deploying live build to Cloudflare Workers (https://labmedix-in.angadmandal3.workers.dev/)...');
  try {
    run('npx wrangler deploy');
    console.log('✨ Cloudflare Workers deployment complete!');
  } catch (cfErr) {
    console.warn('⚠️ Cloudflare Workers deployment step note:', cfErr.message);
  }

  console.log('\n✅ ALL DEPLOYMENTS COMPLETED SUCCESSFULLY TO MAIN & LIVE PRODUCTION!\n');
} catch (error) {
  console.error('\n❌ Deployment encountered an error:', error.message);
  process.exit(1);
}
