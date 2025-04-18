import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createFiles, createTestingDir, deleteDirectory, readFile } from '../test/utils.js';
import nock from 'nock';
import { Application } from './index.js';
import type { Any, Plugin } from '../contracts.js';
import type { Component } from 'svelte';
import { createApp } from '@/lib/index.js';

describe('App', () => {
    let app: Application;
    let testingDir: string;
    let consoleLog: ReturnType<typeof vi.spyOn>;
    const testingAppFiles = {
        'layouts/base.yaml': readFile(__dirname, 'layouts/base.yaml'),
        'pages/contacts.yaml': readFile(__dirname, 'pages/contacts.yaml'),
        'pages/contacts/[id]/index.yaml': readFile(__dirname, 'pages/contacts/[id]/index.yaml'),
    };

    beforeEach(() => {
        app = createApp();
        testingDir = createTestingDir();

        createFiles(testingDir, testingAppFiles);

        app.config({
            pages: testingDir + '/pages',
            layouts: testingDir + '/layouts',
            themes: testingDir + '/themes',
            error: (status: number, body: Any) => {
                throw new Error(`${status}: ${body}`);
            },
            redirect: (status: number, location: string | URL) => {
                throw new Error(`${status}: ${location}`);
            },
        });
        consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        deleteDirectory(testingDir);
    });

    describe('createApp helper', () => {
        it('creates an instance of App', async () => {
            expect(app).toBeDefined();
            expect(app).toBeInstanceOf(Application);
        });

        it('has default configs', () => {
            expect(app.getConfig()).toBeDefined();
            expect(app.getConfig().pages).toBe(testingDir + '/pages');
            expect(app.getConfig().layouts).toBe(testingDir + '/layouts');
        });
    });

    describe('render', () => {
        it('returns a yaml document', async () => {
            vi.spyOn(console, 'log').mockImplementation(() => {});
            const document = await app.render('/contacts');
            expect(document).toEqual({
                content: {
                    header: 'Base Layout',
                    slot: {
                        header: 'Contacts Page',
                    },
                },
                theme: {},
                context: {
                    params: {},
                },
            });
        });

        it('doesnt parse "template" components with context', async () => {
            // Add the loop.yaml file to the testing files
            createFiles(testingDir, {
                'pages/loop.yaml': readFile(__dirname, 'pages/loop.yaml'),
            });

            const document = await app.render('/loop');
            expect(document).toEqual({
                content: {
                    'for user of users with index': {
                        text: '${user.name}',
                        'if user.name is "Marco"': {
                            'doc.check_fail': 'Context overridden failed for `user.name`. Value: ${user.name}',
                        },
                        else: {
                            'doc.check_pass': {
                                div: {
                                    class: 'mb-3',
                                    content: '${index}. ${user.name} is ${user.age} years old',
                                },
                            },
                        },
                    },
                },
                theme: {},
                context: {
                    params: {},
                    user: {
                        name: 'Marco',
                        age: 35,
                    },
                    users: [
                        { name: 'Alice', age: 25 },
                        { name: 'Bob', age: 30 },
                    ],
                },
            });
        });
    });

    describe('server operations on page meta', () => {
        const globalFetch = global.fetch;
        const contact = {
            id: 1,
            name: 'John Doe',
            email: 'john.doe@mail.com',
            transaction: {
                id: 2,
                amount: 100,
                currency: {
                    symbol: '£',
                    value: 'USD',
                },
            },
        };
        const address = {
            id: 1,
            street: '123 Main St',
            city: 'London',
            country: 'UK',
        };
        const httpCalls: { [key: string]: nock.Scope | undefined } = {
            contacts: undefined,
            address: undefined,
        };

        beforeEach(() => {
            httpCalls.contacts = nock('http://127.0.0.1:8000').persist().get('/contacts/1').reply(200, contact);
            httpCalls.address = nock('http://127.0.0.1:8000').persist().get('/address/1').reply(200, { data: address });
        });

        afterEach(() => {
            global.fetch = globalFetch;
            nock.cleanAll();
        });

        it('makes an http call to load data to the page context', async () => {
            // When
            const result = await app.render('/contacts/1');

            // Expect
            expect(result).toEqual({
                theme: expect.any(Object),
                content: {
                    header: 'Base Layout',
                    slot: [
                        { header: 'Contact Page John Doe - john.doe@mail.com' },
                        { div: 'Amount: £100' },
                        {
                            div: 'Unresolved variables should keep placeholders: ${record.id}',
                        },
                        {
                            div: `Address: ${address.street}`,
                        },
                    ],
                },
                context: {
                    params: {
                        id: 1,
                    },
                    contact,
                    address,
                    amount: '£100',
                    currency: '£',
                    trx: {
                        id: 2,
                        amount: 100,
                        currency: {
                            symbol: '£',
                            value: 'USD',
                        },
                    },
                },
            });

            httpCalls.contacts?.done();
            httpCalls.address?.done();
        });

        it('merges with layout server operations', async () => {
            // When
            await app.render('/contacts/1');

            // Then
            expect(consoleLog).toHaveBeenCalledWith('layout base log');
            expect(consoleLog).toHaveBeenCalledWith('page log');
        });
    });

    describe('replaceSlot', () => {
        it('should replace slot with body content in a simple layout', () => {
            const layout = {
                h1: 'Hello World',
                slot: null,
            };
            const body = [{ type: 'p', text: 'Hello' }];

            const result = app['replaceSlot'](layout, body);

            expect(result).toEqual({
                h1: 'Hello World',
                slot: [{ type: 'p', text: 'Hello' }],
            });
        });

        it('should replace slot in nested objects', () => {
            const layout = {
                type: 'div',
                content: {
                    type: 'section',
                    children: {
                        type: 'article',
                        slot: null,
                    },
                },
            };
            const body = [{ type: 'p', text: 'Hello' }];

            const result = app['replaceSlot'](layout, body);

            expect(result).toEqual({
                type: 'div',
                content: {
                    type: 'section',
                    children: {
                        type: 'article',
                        slot: [{ type: 'p', text: 'Hello' }],
                    },
                },
            });
        });

        it('should handle multiple slots in different nested levels', () => {
            const layout = {
                type: 'div',
                slot: null,
                content: {
                    type: 'section',
                    children: {
                        type: 'article',
                        slot: null,
                    },
                },
            };
            const body = [{ type: 'p', text: 'Hello' }];

            const result = app['replaceSlot'](layout, body);

            expect(result).toEqual({
                type: 'div',
                slot: [{ type: 'p', text: 'Hello' }],
                content: {
                    type: 'section',
                    children: {
                        type: 'article',
                        slot: [{ type: 'p', text: 'Hello' }],
                    },
                },
            });
        });

        it('should return body when layout is undefined', () => {
            const body = [{ type: 'p', text: 'Hello' }];

            const result = app['replaceSlot'](undefined, body);

            expect(result).toEqual(body);
        });

        it('should ignore non-object values in layout', () => {
            const layout = {
                type: 'div',
                slot: null,
                content: 'string value',
                number: 42,
                bool: true,
            };
            const body = [{ type: 'p', text: 'Hello' }];

            const result = app['replaceSlot'](layout, body);

            expect(result).toEqual({
                type: 'div',
                slot: [{ type: 'p', text: 'Hello' }],
                content: 'string value',
                number: 42,
                bool: true,
            });
        });

        it('should keep null values in layout', () => {
            const layout = { type: 'div', slot: null, content: null, number: null, bool: null };
            const body = [{ type: 'p', text: 'Hello' }];

            const result = app['replaceSlot'](layout, body);

            expect(result).toEqual({
                type: 'div',
                slot: [{ type: 'p', text: 'Hello' }],
                content: null,
                number: null,
                bool: null,
            });
        });
    });

    describe('plug', () => {
        beforeEach(() => {
            app = createApp();
            app.config({
                pages: testingDir + '/pages',
                layouts: testingDir + '/layouts',
                themes: testingDir + '/themes',
                error: (status: number, body: Any) => {
                    throw new Error(`${status}: ${body}`);
                },
                redirect: (status: number, location: string | URL) => {
                    throw new Error(`${status}: ${location}`);
                },
            });
        });

        it('registers a plugin with operations and components', () => {
            const testPlugin = {
                name: 'test_plugin',
                operations: {
                    testOperation: () => 'test result',
                    anotherOperation: () => 'another result',
                },
                components: {
                    TestComponent: () => ({ type: 'test' }) as unknown as Component,
                    AnotherComponent: () => ({ type: 'another' }) as unknown as Component,
                },
            };

            app.plug(testPlugin as Plugin);

            // Check if plugin is registered
            expect(app['registeredPlugins']).toContain('test_plugin');

            // Check if operations are registered
            expect(app['operations']).toBeDefined();
            expect(typeof app['operations']['test_plugin.test_operation']).toBe('function');
            expect(typeof app['operations']['test_plugin.another_operation']).toBe('function');

            // Check if components are registered
            expect(app['components']).toBeDefined();
            expect(typeof app['components']['test_plugin.test_component']).toBe('function');
            expect(typeof app['components']['test_plugin.another_component']).toBe('function');
        });

        it('handles plugins with nested plugin dependencies', () => {
            const nestedPlugin = {
                name: 'nested-plugin',
                operations: {
                    nestedOp: () => 'nested',
                },
            };

            const parentPlugin = {
                name: 'parent-plugin',
                plugins: [nestedPlugin],
                operations: {
                    parentOp: () => 'parent',
                },
            };

            app.plug(parentPlugin);

            expect(app['registeredPlugins']).toContain('parent-plugin');
            expect(app['registeredPlugins']).toContain('nested-plugin');
            expect(typeof app['operations']['parent-plugin.parent_op']).toBe('function');
            expect(typeof app['operations']['nested-plugin.nested_op']).toBe('function');
        });

        it('prevents duplicate plugin registration', () => {
            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            const duplicatePlugin = {
                name: 'duplicate-plugin',
                operations: {
                    someOp: () => 'test',
                },
            };

            app.plug(duplicatePlugin);
            app.plug(duplicatePlugin);

            expect(consoleSpy).toHaveBeenCalledWith('Plugin [duplicate-plugin] already registered');
            expect(app['registeredPlugins'].filter((name) => name === 'duplicate-plugin')).toHaveLength(1);

            consoleSpy.mockRestore();
        });

        it('handles plugins with no operations or components', () => {
            const emptyPlugin = {
                name: 'empty-plugin',
            };

            app.plug(emptyPlugin);

            expect(app['registeredPlugins']).toContain('empty-plugin');
            expect(Object.keys(app['operations'] || {})).not.toContain('empty-plugin');
            expect(Object.keys(app['components'] || {})).not.toContain('empty-plugin');
        });
    });

    describe('error handling', () => {
        it('should throw a 404 error with default message', () => {
            expect(() => app.notFound()).toThrow('404: Not found');
        });

        it('should throw a 404 error with custom message', () => {
            expect(() => app.notFound('Custom not found message')).toThrow('404: Custom not found message');
        });

        it('should throw an error with custom status and message', () => {
            expect(() => app.error(400, 'Bad request')).toThrow('400: Bad request');
        });

        it('should throw an error with custom status and undefined message', () => {
            expect(() => app.error(500)).toThrow('500: undefined');
        });
    });
});
