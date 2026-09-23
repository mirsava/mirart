import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField } from '@mui/material';

export interface ConfirmOptions {
  title: string;
  message?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  // Red confirm button for destructive actions.
  destructive?: boolean;
}

export interface PromptOptions extends ConfirmOptions {
  label: string;
  defaultValue?: string;
  inputType?: 'text' | 'number';
  inputProps?: Record<string, unknown>;
}

interface ConfirmContextValue {
  // Resolves true when confirmed, false when cancelled.
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  // Resolves the entered value, or null when cancelled.
  prompt: (options: PromptOptions) => Promise<string | null>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

type Pending =
  | { kind: 'confirm'; options: ConfirmOptions }
  | { kind: 'prompt'; options: PromptOptions };

// App-styled replacement for window.confirm / window.prompt. Use via useConfirm().
export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pending, setPending] = useState<Pending | null>(null);
  const [value, setValue] = useState('');
  const resolver = useRef<((result: boolean | string | null) => void) | null>(null);

  const open = (next: Pending) =>
    new Promise<boolean | string | null>((resolve) => {
      resolver.current?.(next.kind === 'prompt' ? null : false); // settle any dialog it replaces
      resolver.current = resolve;
      setValue(next.kind === 'prompt' ? next.options.defaultValue ?? '' : '');
      setPending(next);
    });

  const confirm = useCallback((options: ConfirmOptions) => open({ kind: 'confirm', options }) as Promise<boolean>, []);
  const prompt = useCallback((options: PromptOptions) => open({ kind: 'prompt', options }) as Promise<string | null>, []);

  const close = (result: boolean | string | null) => {
    resolver.current?.(result);
    resolver.current = null;
    setPending(null);
  };
  const cancel = () => close(pending?.kind === 'prompt' ? null : false);
  const accept = () => close(pending?.kind === 'prompt' ? value : true);

  const options = pending?.options;
  return (
    <ConfirmContext.Provider value={{ confirm, prompt }}>
      {children}
      <Dialog open={Boolean(pending)} onClose={cancel} maxWidth="xs" fullWidth>
        {options && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              accept();
            }}
          >
            <DialogTitle>{options.title}</DialogTitle>
            <DialogContent>
              {options.message && <DialogContentText sx={{ mb: pending?.kind === 'prompt' ? 2 : 0 }}>{options.message}</DialogContentText>}
              {pending?.kind === 'prompt' && (
                <TextField
                  autoFocus
                  fullWidth
                  size="small"
                  label={pending.options.label}
                  type={pending.options.inputType ?? 'text'}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  inputProps={pending.options.inputProps}
                  sx={{ mt: options.message ? 0 : 1 }}
                />
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={cancel}>{options.cancelText ?? 'Cancel'}</Button>
              <Button type="submit" variant="contained" color={options.destructive ? 'error' : 'primary'} autoFocus={pending?.kind === 'confirm'}>
                {options.confirmText ?? 'Confirm'}
              </Button>
            </DialogActions>
          </form>
        )}
      </Dialog>
    </ConfirmContext.Provider>
  );
};

export function useConfirm(): ConfirmContextValue {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error('useConfirm must be used inside ConfirmProvider');
  return context;
}
