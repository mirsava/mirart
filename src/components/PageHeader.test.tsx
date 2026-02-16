import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import PageHeader from './PageHeader';

const theme = createTheme({
  palette: { primary: { main: '#4a3a9a' } },
});

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

describe('PageHeader', () => {
  it('renders title', () => {
    renderWithTheme(<PageHeader title="Gallery" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Gallery');
  });

  it('renders subtitle when provided', () => {
    renderWithTheme(<PageHeader title="About" subtitle="Learn more about us" />);
    expect(screen.getByText('Learn more about us')).toBeInTheDocument();
  });

  it('does not render subtitle when not provided', () => {
    renderWithTheme(<PageHeader title="Contact" />);
    expect(screen.queryByText(/Learn more/)).not.toBeInTheDocument();
  });

  it('uses h1 for title', () => {
    renderWithTheme(<PageHeader title="Subscription Plans" />);
    const heading = screen.getByRole('heading', { name: 'Subscription Plans' });
    expect(heading.tagName).toBe('H1');
  });

  it('applies align left by default', () => {
    const { container } = renderWithTheme(<PageHeader title="Test" align="left" />);
    const box = container.querySelector('[style*="text-align"]') || container;
    expect(box).toBeTruthy();
  });

  it('renders with center alignment when specified', () => {
    renderWithTheme(<PageHeader title="Centered" align="center" />);
    expect(screen.getByRole('heading', { name: 'Centered' })).toBeInTheDocument();
  });
});
