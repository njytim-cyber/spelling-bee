import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Firebase modules to prevent initialization during tests
vi.mock('../utils/firebase', () => ({
    app: {},
    auth: {},
    db: {},
}));
