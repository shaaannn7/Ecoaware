import { describe, it, expect } from 'vitest';
import {
  encryptName,
  decryptName,
  encryptDeterministic,
  decryptDeterministic,
  decryptUserField,
} from '../services/crypto.js';

describe('PII Encryption & Decryption Services', () => {
  describe('Name Encryption (Randomized IV)', () => {
    it('encrypts the name and decrypts it back to the original value', () => {
      const name = 'Alice Vance';
      const encrypted = encryptName(name);
      
      expect(encrypted).not.toBe(name);
      expect(encrypted.includes(':')).toBe(true);
      
      const decrypted = decryptName(encrypted);
      expect(decrypted).toBe(name);
    });

    it('produces different ciphertexts for the same input name due to random IVs', () => {
      const name = 'Alice Vance';
      const encrypted1 = encryptName(name);
      const encrypted2 = encryptName(name);
      
      expect(encrypted1).not.toBe(encrypted2);
      expect(decryptName(encrypted1)).toBe(name);
      expect(decryptName(encrypted2)).toBe(name);
    });
  });

  describe('Email Encryption (Deterministic IV)', () => {
    it('encrypts email and decrypts it back to original value', () => {
      const email = 'alice@example.com';
      const encrypted = encryptDeterministic(email);
      
      expect(encrypted).not.toBe(email);
      expect(encrypted.startsWith('det:')).toBe(true);
      
      const decrypted = decryptDeterministic(encrypted);
      expect(decrypted).toBe(email);
    });

    it('produces the exact same ciphertext for the same input email to support DB indexing', () => {
      const email = 'alice@example.com';
      const encrypted1 = encryptDeterministic(email);
      const encrypted2 = encryptDeterministic(email);
      
      expect(encrypted1).toBe(encrypted2);
    });
  });

  describe('Legacy & Fallback Scenarios', () => {
    it('returns the input string as-is if it is not encrypted (legacy data)', () => {
      const plainText = 'normal_unencrypted_text';
      expect(decryptName(plainText)).toBe(plainText);
      expect(decryptDeterministic(plainText)).toBe(plainText);
      expect(decryptUserField(plainText)).toBe(plainText);
    });

    it('handles empty, null, or undefined values gracefully', () => {
      expect(decryptUserField(null)).toBe('');
      expect(decryptUserField(undefined)).toBe('');
      expect(encryptName('')).toBe('');
      expect(encryptDeterministic('')).toBe('');
    });

    it('transparently decrypts both deterministic and randomized formats using decryptUserField', () => {
      const name = 'Bob Marley';
      const email = 'bob@marley.com';
      
      const encName = encryptName(name);
      const encEmail = encryptDeterministic(email);
      
      expect(decryptUserField(encName)).toBe(name);
      expect(decryptUserField(encEmail)).toBe(email);
    });
  });
});
