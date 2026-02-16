import { describe, it, expect } from 'vitest';
import { lightTheme, darkTheme } from './theme';

describe('theme', () => {
  describe('lightTheme', () => {
    it('has light mode', () => {
      expect(lightTheme.palette.mode).toBe('light');
    });

    it('has primary color', () => {
      expect(lightTheme.palette.primary.main).toBe('#4a3a9a');
      expect(lightTheme.palette.primary.light).toBe('#534bae');
      expect(lightTheme.palette.primary.dark).toBe('#3d2d8a');
    });

    it('has secondary color', () => {
      expect(lightTheme.palette.secondary.main).toBe('#ff8f00');
    });

    it('has typography', () => {
      expect(lightTheme.typography.fontFamily).toContain('Roboto');
      expect(lightTheme.typography.h1).toBeDefined();
      expect(lightTheme.typography.h6).toBeDefined();
    });

    it('has component overrides', () => {
      expect(lightTheme.components?.MuiButton).toBeDefined();
      expect(lightTheme.components?.MuiCard).toBeDefined();
    });
  });

  describe('darkTheme', () => {
    it('has dark mode', () => {
      expect(darkTheme.palette.mode).toBe('dark');
    });

    it('has primary color', () => {
      expect(darkTheme.palette.primary.main).toBe('#7c6bc5');
    });

    it('has dark background', () => {
      expect(darkTheme.palette.background.default).toBe('#121212');
      expect(darkTheme.palette.background.paper).toBe('#1e1e1e');
    });
  });
});
