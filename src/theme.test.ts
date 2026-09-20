import { describe, it, expect } from 'vitest';
import { lightTheme, darkTheme } from './theme';

describe('theme', () => {
  describe('lightTheme', () => {
    it('has light mode', () => {
      expect(lightTheme.palette.mode).toBe('light');
    });

    it('has primary color', () => {
      expect(lightTheme.palette.primary.main).toBe('#b5573a');
      expect(lightTheme.palette.primary.light).toBe('#c97a5f');
      expect(lightTheme.palette.primary.dark).toBe('#94432b');
    });

    it('has secondary color', () => {
      expect(lightTheme.palette.secondary.main).toBe('#3a3632');
    });

    it('has typography', () => {
      expect(lightTheme.typography.fontFamily).toContain('Inter');
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
      expect(darkTheme.palette.primary.main).toBe('#d9825f');
    });

    it('has dark background', () => {
      expect(darkTheme.palette.background.default).toBe('#171513');
      expect(darkTheme.palette.background.paper).toBe('#211e1b');
    });
  });
});
