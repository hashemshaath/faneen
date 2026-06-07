/**
 * Phase 2.1 — Project image pipeline static guardrails.
 *
 * Avoids real Web Worker / Canvas execution (jsdom limitations) by
 * inspecting the compiled source for the contracts we promised in the
 * project domain helper and in the opt-in `ImageUpload` integration.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '../../../../');
const read = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf8');

describe('Phase 2.1 — Project image pipeline integration', () => {
  it('exposes uploadProjectImage with cover/gallery kinds and never-throws fallback', () => {
    const src = read('src/modules/files/domain/projects.ts');
    expect(src).toContain('processImage');
    expect(src).toContain('image_assets');
    expect(src).toContain("PROJECT_IMAGES_BUCKET");
    expect(src).toContain("fallback: true");
    // Pipeline path uses the canonical immutable cache header.
    expect(src).toContain("cacheControl: '31536000, immutable'");
    // Always validates input and returns Error (never throws to caller).
    expect(src).toContain('validateImage');
    expect(src).toContain('error: new Error');
    // Folder convention is project/<kind>/<ts>-<rand>.
    expect(src).toContain('${userId}/project/${kind}/');
  });

  it('ImageUpload + MultiImageUpload expose pipeline="project" opt-in only', () => {
    const src = read('src/components/ui/image-upload.tsx');
    expect(src).toContain("pipeline?: ImagePipelineMode");
    expect(src).toContain("if (pipeline === 'project'");
    expect(src).toContain('uploadProjectImage');
    expect(src).toContain('onUploadedMeta');
    // Default branch must remain (legacy path stays untouched for every
    // other bucket — business assets, blogs, brand assets, etc.).
    expect(src).toContain('compressImage');
    expect(src).toContain('uploadPublicImage');
  });

  it('DashboardProjects wires the pipeline + records image_asset_id', () => {
    const src = read('src/pages/dashboard/DashboardProjects.tsx');
    expect(src).toContain('pipeline="project"');
    expect(src).toContain('projectKind="cover"');
    expect(src).toContain('projectKind="gallery"');
    expect(src).toContain('cover_image_asset_id');
    expect(src).toContain('image_asset_id');
    // Display path uses ResponsiveImage with cover_image_asset.variants.
    expect(src).toContain('ResponsiveImage');
    expect(src).toContain('cover_image_asset?.variants');
  });

  it('public Projects + ProjectDetail + ProjectImageGallery use ResponsiveImage', () => {
    expect(read('src/pages/Projects.tsx')).toContain('ResponsiveImage');
    expect(read('src/pages/ProjectDetail.tsx')).toContain(
      'image_assets!projects_cover_image_asset_id_fkey',
    );
    expect(read('src/pages/ProjectDetail.tsx')).toContain(
      'image_assets!project_images_image_asset_id_fkey',
    );
    expect(read('src/components/project/ProjectImageGallery.tsx')).toContain(
      'ResponsiveImage',
    );
    // Hero image keeps eager/priority loading for LCP.
    expect(read('src/components/project/ProjectImageGallery.tsx')).toContain(
      'priority',
    );
  });
});