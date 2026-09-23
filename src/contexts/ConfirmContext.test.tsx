import React, { useState } from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmProvider, useConfirm } from './ConfirmContext';

const Harness: React.FC = () => {
  const { confirm, prompt } = useConfirm();
  const [result, setResult] = useState('none');
  return (
    <>
      <button onClick={async () => setResult(String(await confirm({ title: 'Delete it?', confirmText: 'Delete' })))}>ask</button>
      <button onClick={async () => setResult(String(await prompt({ title: 'How many?', label: 'Days', defaultValue: '7' })))}>prompt</button>
      <span data-testid="result">{result}</span>
    </>
  );
};

const renderHarness = () => render(<ConfirmProvider><Harness /></ConfirmProvider>);

describe('ConfirmProvider', () => {
  it('resolves true when confirmed and false when cancelled', async () => {
    const user = userEvent.setup();
    renderHarness();

    await user.click(screen.getByText('ask'));
    expect(screen.getByText('Delete it?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('true'));

    await user.click(screen.getByText('ask'));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('false'));
  });

  it('resolves the entered value for a prompt, or null when cancelled', async () => {
    const user = userEvent.setup();
    renderHarness();

    await user.click(screen.getByText('prompt'));
    const input = screen.getByLabelText('Days');
    await user.clear(input);
    await user.type(input, '14');
    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('14'));

    await user.click(screen.getByText('prompt'));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('null'));
  });
});
