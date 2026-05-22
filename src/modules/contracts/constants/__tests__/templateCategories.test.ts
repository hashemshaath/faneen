import { templateCategoryConfig } from '../templateCategories';

describe('templateCategories', () => {
  it('has expected keys', () => {
    const keys = Object.keys(templateCategoryConfig);
    expect(keys).toContain('aluminum_doors_windows');
    expect(keys).toContain('iron_doors_windows');
    expect(keys).toContain('fire_doors');
    expect(keys).toContain('gates_structures');
    expect(keys).toContain('wood_doors');
    expect(keys).toContain('kitchens');
    expect(keys).toContain('facades');
    expect(keys).toContain('wardrobes_closets');
    expect(keys).toContain('upvc');
    expect(keys).toContain('glass_securit');
  });

  it('each entry has ar, en, icon, color', () => {
    Object.entries(templateCategoryConfig).forEach(([key, config]) => {
      expect(config.ar).toBeTruthy();
      expect(config.en).toBeTruthy();
      expect(typeof config.ar).toBe('string');
      expect(typeof config.en).toBe('string');
      expect(config.icon).toBeDefined();
      expect(typeof config.color).toBe('string');
      expect(config.color.length).toBeGreaterThan(2);
    });
  });

  it('aluminum_doors_windows key exists with correct labels', () => {
    const config = templateCategoryConfig.aluminum_doors_windows;
    expect(config.ar).toBe('ألمنيوم أبواب وشبابيك');
    expect(config.en).toBe('Aluminum Doors & Windows');
  });

  it('no empty labels', () => {
    Object.values(templateCategoryConfig).forEach((config) => {
      expect(config.ar.trim().length).toBeGreaterThan(0);
      expect(config.en.trim().length).toBeGreaterThan(0);
    });
  });
});
