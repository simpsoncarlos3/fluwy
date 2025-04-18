import { describe, expect, it } from 'vitest';
import { str, Str } from './index.js';

describe('str function', () => {
    it('returns an instance of Str class', () => {
        expect(str('')).toBeInstanceOf(Str);
    });

    it('converts a string to snake case', () => {
        expect(str('Hello World').snakeCase()).toBe('hello_world');
        expect(str('Hello World').snakeCase()).toBe('hello_world');
        expect(str(' Hello World ').snakeCase()).toBe('hello_world');
    });

    it('converts to kebab case', () => {
        expect(str('hello world').kebabCase()).toBe('hello-world');
        expect(str('HelloWorld').kebabCase()).toBe('hello-world');
        expect(str('hello-worldJapa').kebabCase()).toBe('hello-world-japa');
    });

    it('converts to title case', () => {
        expect(str('hello world').titleCase()).toBe('Hello World');
        expect(str('HelloWorld').titleCase()).toBe('Hello World');
    });

    it('converts to slug case removing special characters', () => {
        expect(str('Hello World').slugCase()).toBe('hello-world');
        expect(str(`What's fluwy?`).slugCase()).toBe('whats-fluwy');
    });

    describe('.initials()', () => {
        it('returns initials', () => {
            expect(str('John Doe').initials()).toBe('JD');
            expect(str('John').initials()).toBe('J');
            expect(str('Marco Aurelio Pereira').initials()).toBe('MAP');
        });

        it('can specify if uses only the first and last name', () => {
            expect(str('Marco Aurelio Pereira').initials({ onlyFirstAndLast: true })).toBe('MP');
            expect(str('John Doe Mac Lucene').initials({ onlyFirstAndLast: true })).toBe('JL');
        });
    });

    describe('.words()', () => {
        it('supports pascal case', () => {
            expect(str('HelloWorld').words()).toEqual(['Hello', 'World']);
            expect(str('Hello world').words()).toEqual(['Hello', 'world']);
            expect(str('hello-worldJapa').words()).toEqual(['hello-world', 'Japa']);
        });
    });
});
