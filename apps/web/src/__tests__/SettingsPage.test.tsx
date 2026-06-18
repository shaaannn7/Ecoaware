import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SettingsPage from '../pages/SettingsPage';
import { AuthProvider } from '../contexts/AuthContext';
import { auth } from '../services/api';

// Mock the api endpoints
vi.mock('../services/api', () => ({
  auth: {
    updateProfile: vi.fn().mockResolvedValue({
      user: {
        id: 1,
        email: 'alex.updated@ecoaware.com',
        name: 'Alex Updated',
        avatarInitials: 'AU',
        monthlyLimitKg: 800,
      },
    }),
  },
  setTokens: vi.fn(),
  clearTokens: vi.fn(),
}));

describe('SettingsPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders current profile settings and inputs', () => {
    const { container } = render(
      <AuthProvider>
        <SettingsPage />
      </AuthProvider>
    );

    expect(screen.getByText('Profile Settings')).toBeInTheDocument();
    
    const inputs = container.querySelectorAll('input');
    expect(inputs.length).toBe(6);
    expect(inputs[0].value).toBe('Guest User'); // Full Name
    expect(inputs[1].value).toBe('guest@ecoaware.com'); // Email Address
    expect(inputs[2].value).toBe('1000'); // Monthly Carbon Limit
  });

  it('submits profile edits and displays success notification', async () => {
    const { container } = render(
      <AuthProvider>
        <SettingsPage />
      </AuthProvider>
    );

    const inputs = container.querySelectorAll('input');
    const nameInput = inputs[0];
    const limitInput = inputs[2];

    fireEvent.change(nameInput, { target: { value: 'Alex Updated' } });
    fireEvent.change(limitInput, { target: { value: '800' } });

    const submitBtn = screen.getByRole('button', { name: /Save Settings/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(auth.updateProfile).toHaveBeenCalledWith({
        name: 'Alex Updated',
        email: 'guest@ecoaware.com',
        monthlyLimitKg: 800,
        currentPassword: undefined,
        newPassword: undefined,
      });
      expect(screen.getByText('Profile updated successfully!')).toBeInTheDocument();
    });
  });

  it('validates matching passwords during security rotations', async () => {
    const { container } = render(
      <AuthProvider>
        <SettingsPage />
      </AuthProvider>
    );

    const inputs = container.querySelectorAll('input');
    const currentPwdInput = inputs[3];
    const newPwdInput = inputs[4];
    const confirmPwdInput = inputs[5];

    fireEvent.change(currentPwdInput, { target: { value: 'oldpassword' } });
    fireEvent.change(newPwdInput, { target: { value: 'newpassword1' } });
    fireEvent.change(confirmPwdInput, { target: { value: 'newpassword2' } });

    const submitBtn = screen.getByRole('button', { name: /Save Settings/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('New passwords do not match')).toBeInTheDocument();
      expect(auth.updateProfile).not.toHaveBeenCalled();
    });
  });

  it('displays API fallback errors when update request fails', async () => {
    vi.mocked(auth.updateProfile).mockRejectedValueOnce(new Error('Password verification failed'));

    const { container } = render(
      <AuthProvider>
        <SettingsPage />
      </AuthProvider>
    );

    const inputs = container.querySelectorAll('input');
    const nameInput = inputs[0];
    fireEvent.change(nameInput, { target: { value: 'Alex Error' } });

    const submitBtn = screen.getByRole('button', { name: /Save Settings/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Password verification failed')).toBeInTheDocument();
    });
  });
});
