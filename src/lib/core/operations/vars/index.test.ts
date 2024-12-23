import { describe, it, expect, beforeEach } from 'vitest';
import { vars } from './index.js';
import { createContext, type Context } from '@/lib/core/context/index.js';

describe('vars operation', () => {
    let context: Context;

    beforeEach(() => {
        context = createContext();
    });

    it('should set variables in context', async () => {
        const params = {
            name: 'John',
            age: '30',
        };

        await vars(params, { context });

        expect(context.get('name')).toBe('John');
        expect(context.get('age')).toBe('30');
    });

    it('should compile values with context data', async () => {
        context.set('title', 'Mr');
        
        const params = {
            greeting: 'Hello ${title}',
        };

        await vars(params, { context });

        expect(context.get('greeting')).toBe('Hello Mr');
    });

    it('should handle complex template expressions', async () => {
        context.set('user', { firstName: 'John', lastName: 'Doe' });
        context.set('count', 3);
        
        const params = {
            message: 'Hello ${user.firstName} ${user.lastName}, you have ${count} messages',
        };

        await vars(params, { context });

        expect(context.get('message')).toBe('Hello John Doe, you have 3 messages');
    });
});