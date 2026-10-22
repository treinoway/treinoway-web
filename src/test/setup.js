import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';

// The full suite runs ~280 jsdom files in parallel; the 1000ms default for findBy*/waitFor
// is too tight for the heavy editor pages when the CPU is saturated.
configure({ asyncUtilTimeout: 4000 });
