/**
 * Unit tests for input sanitization utilities.
 *
 * Covers HTML stripping, null byte removal, whitespace trimming,
 * object-level sanitization, and SQL injection pattern detection.
 */

import { describe, it, expect } from 'vitest';
import { sanitizeString, sanitizeObject, isSafeString } from '../services/sanitize.js';

describe('sanitizeString', () => {
  it('removes HTML tags from input, keeping text content', () => {
    // The regex removes tags but keeps inner text
    expect(sanitizeString('<script>alert("xss")</script>Hello')).toBe('alert("xss")Hello');
  });

  it('removes common HTML wrapper elements', () => {
    expect(sanitizeString('<b>bold</b>')).toBe('bold');
  });

  it('removes self-closing HTML tags entirely', () => {
    expect(sanitizeString('<img src="x" onerror="alert(1)">')).toBe('');
  });

  it('removes null bytes (replaces with empty string)', () => {
    // Null bytes are removed, not replaced with space
    expect(sanitizeString('hello\0world')).toBe('helloworld');
  });

  it('trims leading and trailing whitespace', () => {
    expect(sanitizeString('  hello  ')).toBe('hello');
  });

  it('returns plain string unchanged', () => {
    expect(sanitizeString('Clean description')).toBe('Clean description');
  });

  it('handles empty string', () => {
    expect(sanitizeString('')).toBe('');
  });

  it('handles string with only HTML tags (returns empty)', () => {
    expect(sanitizeString('<div><span></span></div>')).toBe('');
  });
});

describe('sanitizeObject', () => {
  it('sanitizes string values in an object', () => {
    const input = { name: '<b>Alice</b>', age: 30 };
    const result = sanitizeObject(input as Record<string, unknown>);
    expect(result.name).toBe('Alice');
    expect(result.age).toBe(30);
  });

  it('leaves non-string values unchanged', () => {
    const input = { count: 42, active: true, value: 3.14 };
    const result = sanitizeObject(input as Record<string, unknown>);
    expect(result.count).toBe(42);
    expect(result.active).toBe(true);
    expect(result.value).toBe(3.14);
  });

  it('does not mutate the original object', () => {
    const input = { name: '<script>xss</script>' };
    const result = sanitizeObject(input as Record<string, unknown>);
    expect(input.name).toBe('<script>xss</script>');
    expect(result.name).toBe('xss');
  });
});

describe('isSafeString', () => {
  it('returns true for a clean string', () => {
    expect(isSafeString('Morning commute to work')).toBe(true);
  });

  it('returns true for a string with numbers', () => {
    expect(isSafeString('100 km drive')).toBe(true);
  });

  it('detects single-quote injection attempt', () => {
    expect(isSafeString("'; DROP TABLE users; --")).toBe(false);
  });

  it('detects UNION-based SQL injection', () => {
    expect(isSafeString('1 UNION SELECT * FROM users')).toBe(false);
  });

  it('detects SQL comment injection (--)', () => {
    expect(isSafeString('admin--')).toBe(false);
  });

  it('detects DROP TABLE attack', () => {
    expect(isSafeString('DROP TABLE activities')).toBe(false);
  });
});
