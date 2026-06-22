/**
 * WORKSPACE DISPLAY NAMING FIX — guards against raw UUID titles.
 */
import { describe, it, expect } from 'vitest';
import {
  formatSiteTitle,
  formatProjectTitle,
  formatWorkspaceTitle,
  shortReferenceId,
  isUuidLike,
} from '@/lib/workspace/displayNames';

const UUID = '7542dd9b-567d-4522-a612-321662174b9e';

describe('workspace display naming helpers', () => {
  it('site uses site_name when present', () => {
    expect(formatSiteTitle({ site_name: 'موقع جدة' }, true)).toBe('موقع جدة');
  });

  it('site falls back to label, then city, then unnamed — never UUID', () => {
    expect(formatSiteTitle({ label: 'My Site' }, false)).toBe('My Site');
    expect(formatSiteTitle({ city_name: 'الرياض' }, true)).toBe('موقع في الرياض');
    expect(formatSiteTitle({}, false)).toBe('Unnamed site');
    expect(formatSiteTitle({}, true)).toBe('موقع غير مسمى');
  });

  it('rejects a UUID accidentally stored as a name', () => {
    expect(formatSiteTitle({ site_name: UUID, city_name: 'جدة' }, true))
      .toBe('موقع في جدة');
  });

  it('project picks the language-appropriate title', () => {
    expect(formatProjectTitle({ title_ar: 'تركيب', title_en: 'Install' }, null, true))
      .toBe('تركيب');
    expect(formatProjectTitle({ title_ar: 'تركيب', title_en: 'Install' }, null, false))
      .toBe('Install');
  });

  it('project without name uses linked site or city — never UUID', () => {
    expect(formatProjectTitle({}, { site_name: 'موقع جدة' }, true))
      .toBe('مشروع مرتبط بـ موقع جدة');
    expect(formatProjectTitle({}, { city_name: 'الدمام' }, true))
      .toBe('مشروع في الدمام');
    expect(formatProjectTitle({}, null, false)).toBe('Untitled project');
  });

  it('formatWorkspaceTitle routes by kind', () => {
    expect(formatWorkspaceTitle('site', null, { site_name: 'A' }, true)).toBe('A');
    expect(formatWorkspaceTitle('project', { title_ar: 'P' }, null, true)).toBe('P');
  });

  it('shortReferenceId returns at most 8 chars', () => {
    expect(shortReferenceId(UUID)).toBe('7542dd9b');
    expect(shortReferenceId(UUID).length).toBe(8);
    expect(shortReferenceId(null)).toBe('');
  });

  it('isUuidLike detects raw UUIDs', () => {
    expect(isUuidLike(UUID)).toBe(true);
    expect(isUuidLike('My Site')).toBe(false);
  });

  it('no helper output equals the input UUID', () => {
    const outputs = [
      formatSiteTitle({ site_name: UUID }, true),
      formatSiteTitle({ label: UUID }, false),
      formatProjectTitle({ title_ar: UUID, title_en: UUID }, null, true),
      formatWorkspaceTitle('site', null, { site_name: UUID }, true),
    ];
    for (const out of outputs) {
      expect(out).not.toBe(UUID);
      expect(isUuidLike(out)).toBe(false);
    }
  });
});