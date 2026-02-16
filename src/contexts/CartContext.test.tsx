import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CartProvider, useCart } from './CartContext';

const TestConsumer: React.FC = () => {
  const { cartItems, addToCart, removeFromCart, updateQuantity, clearCart, getTotalPrice, getTotalItems } = useCart();
  const mockArtwork = {
    id: 1,
    title: 'Test Art',
    artist: 'Artist',
    price: 100,
    image: '',
    description: '',
    category: 'Painting',
    subcategory: 'Oil',
    dimensions: '10x10',
    medium: 'Oil',
    year: 2020,
    inStock: true,
  };
  return (
    <div>
      <span data-testid="count">{cartItems.length}</span>
      <span data-testid="total">{getTotalPrice()}</span>
      <span data-testid="items">{getTotalItems()}</span>
      <button onClick={() => addToCart(mockArtwork)}>Add</button>
      <button onClick={() => addToCart({ ...mockArtwork, id: 2 }, 'activation', 2)}>Add Activation</button>
      <button onClick={() => removeFromCart(1)}>Remove</button>
      <button onClick={() => updateQuantity(1, 3)}>Update Qty</button>
      <button onClick={() => clearCart()}>Clear</button>
    </div>
  );
};

describe('CartContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('provides cart context to children', () => {
    render(
      <CartProvider>
        <TestConsumer />
      </CartProvider>
    );
    expect(screen.getByTestId('count')).toHaveTextContent('0');
    expect(screen.getByTestId('total')).toHaveTextContent('0');
  });

  it('addToCart adds item', async () => {
    const user = userEvent.setup();
    render(
      <CartProvider>
        <TestConsumer />
      </CartProvider>
    );
    await user.click(screen.getByText('Add'));
    expect(screen.getByTestId('count')).toHaveTextContent('1');
    expect(screen.getByTestId('total')).toHaveTextContent('100');
    expect(screen.getByTestId('items')).toHaveTextContent('1');
  });

  it('addToCart increments quantity for existing item', async () => {
    const user = userEvent.setup();
    render(
      <CartProvider>
        <TestConsumer />
      </CartProvider>
    );
    await user.click(screen.getByText('Add'));
    await user.click(screen.getByText('Add'));
    expect(screen.getByTestId('count')).toHaveTextContent('1');
    expect(screen.getByTestId('items')).toHaveTextContent('2');
    expect(screen.getByTestId('total')).toHaveTextContent('200');
  });

  it('removeFromCart removes item', async () => {
    const user = userEvent.setup();
    render(
      <CartProvider>
        <TestConsumer />
      </CartProvider>
    );
    await user.click(screen.getByText('Add'));
    await user.click(screen.getByText('Remove'));
    expect(screen.getByTestId('count')).toHaveTextContent('0');
    expect(screen.getByTestId('total')).toHaveTextContent('0');
  });

  it('updateQuantity updates item quantity', async () => {
    const user = userEvent.setup();
    render(
      <CartProvider>
        <TestConsumer />
      </CartProvider>
    );
    await user.click(screen.getByText('Add'));
    await user.click(screen.getByText('Update Qty'));
    expect(screen.getByTestId('items')).toHaveTextContent('3');
    expect(screen.getByTestId('total')).toHaveTextContent('300');
  });

  it('clearCart removes all items', async () => {
    const user = userEvent.setup();
    render(
      <CartProvider>
        <TestConsumer />
      </CartProvider>
    );
    await user.click(screen.getByText('Add'));
    await user.click(screen.getByText('Add Activation'));
    await user.click(screen.getByText('Clear'));
    expect(screen.getByTestId('count')).toHaveTextContent('0');
    expect(screen.getByTestId('total')).toHaveTextContent('0');
  });

  it('persists cart to localStorage', async () => {
    const user = userEvent.setup();
    render(
      <CartProvider>
        <TestConsumer />
      </CartProvider>
    );
    await user.click(screen.getByText('Add'));
    const saved = localStorage.getItem('cart');
    expect(saved).toBeTruthy();
    const parsed = JSON.parse(saved!);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].title).toBe('Test Art');
  });

  it('throws when useCart used outside provider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow('useCart must be used within a CartProvider');
    consoleSpy.mockRestore();
  });
});
