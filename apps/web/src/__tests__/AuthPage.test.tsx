import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuthPage } from '../App';
import { AuthProvider } from '../contexts/AuthContext';

// Stub Canvas getContext for jsdom environment
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  createLinearGradient: vi.fn().mockReturnValue({ addColorStop: vi.fn() }),
  drawImage: vi.fn(),
  clearRect: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  fillRect: vi.fn(),
  fillText: vi.fn(),
});

describe('AuthPage Component', () => {
  it('renders the traveler passport onboarding screen', () => {
    render(
      <AuthProvider>
        <AuthPage />
      </AuthProvider>
    );

    expect(screen.getByText('EcoAware')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter name to sign...')).toBeInTheDocument();
    expect(screen.getByText('Explore anonymously first')).toBeInTheDocument();
  });

  it('validates traveler signature and enables stamp button after signing', async () => {
    const { container } = render(
      <AuthProvider>
        <AuthPage />
      </AuthProvider>
    );

    const input = screen.getByPlaceholderText('Enter name to sign...');
    fireEvent.change(input, { target: { value: 'Alex Mercer' } });

    // The signature canvas is the second canvas in the component
    const canvases = container.querySelectorAll('canvas');
    const signatureCanvas = canvases[1];
    expect(signatureCanvas).toBeInTheDocument();

    // Trigger canvas draw events to simulate signing
    fireEvent.mouseDown(signatureCanvas, { clientX: 100, clientY: 100 });
    // Fire enough mouseMove events to exceed the 40 points signature threshold
    for (let i = 0; i < 45; i++) {
      fireEvent.mouseMove(signatureCanvas, { clientX: 100 + i, clientY: 100 + i });
    }
    fireEvent.mouseUp(signatureCanvas);

    // After signing, stamp button should be enabled/interactable
    const stampBtn = screen.getByRole('button', { name: /Stamp/i });
    expect(stampBtn).not.toBeDisabled();

    fireEvent.click(stampBtn);
  });

  it('allows keyboard-only autograph signature and enables stamp button', () => {
    render(
      <AuthProvider>
        <AuthPage />
      </AuthProvider>
    );

    const input = screen.getByPlaceholderText('Enter name to sign...');
    fireEvent.change(input, { target: { value: 'Jane Doe' } });

    // The "Use Autograph" button should be visible now since name is typed and not signed
    const autographBtn = screen.getByRole('button', { name: /Use Autograph/i });
    expect(autographBtn).toBeInTheDocument();

    // Trigger autograph signature simulation
    fireEvent.click(autographBtn);

    // After autographing, stamp button should be enabled
    const stampBtn = screen.getByRole('button', { name: /Stamp/i });
    expect(stampBtn).not.toBeDisabled();
  });

  it('allows exploring anonymously', () => {
    render(
      <AuthProvider>
        <AuthPage />
      </AuthProvider>
    );

    const anonLink = screen.getByText('Explore anonymously first');
    fireEvent.click(anonLink);
  });
});
