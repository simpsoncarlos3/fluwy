<script lang="ts">
    import { DropdownMenu } from 'bits-ui';
    import { app, type ElementProps, Render, useContext } from '$lib/index.js';
    import { cn, flyAndScale } from '$lib/core/utils/index.js';
    import Icon from '$lib/components/common/icon/icon.svelte';
    import type { IconProps } from '../icon/types.js';
    import { Dropdown } from './styles.js';
    import type { Any, Operations } from '@/lib/core/contracts.js';
    import { useCommon } from '../styles.js';
    import { useTheme } from '@/lib/core/utils/index.js';

    const props: DropdownItemProps = $props();

    interface DropdownItemProps extends ElementProps {
        icon?: string;
        sub_content?: unknown;
        text?: string;
        on_click?: Operations;
    }

    const itemClasses = cn(
        useCommon('border_color'),
        useCommon('border_radius.sm'),
        Dropdown.Item,
        useTheme('common.dropdown.item'),
        props?.class
    );
    const context = useContext();
    const dropdownContent = cn(
        useCommon('border_color'),
        useCommon('foreground_color'),
        useCommon('border_radius.lg'),
        Dropdown.Content,
        useTheme('common.dropdown.content')
    );
    const arrowIcon = $state(useTheme('common.dropdown.arrow_trailing_icon', Dropdown.ArrowIconRight));

    async function onclick() {
        if (!props.on_click) return;

        await app.handleOperations(props.on_click, context);
    }

    function getIcon(propValue: Any): IconProps {
        if (typeof propValue === 'string') return { name: propValue };

        return propValue;
    }
</script>

{#if props.sub_content}
    <DropdownMenu.Sub>
        <DropdownMenu.SubTrigger class={itemClasses}>
            {#if props.icon}
                <Icon size={16} {...getIcon(props.icon)} />
            {/if}

            <div class="w-full">
                <Render props={props.text ?? props.content} />
            </div>
            <Icon size={16} name={arrowIcon} />
        </DropdownMenu.SubTrigger>

        <DropdownMenu.SubContent class={dropdownContent}>
            {#snippet child({ props, open })}
                {#if open}
                    <div transition:flyAndScale>
                        <Render props={props.sub_content} />
                    </div>
                {/if}
            {/snippet}
        </DropdownMenu.SubContent>
    </DropdownMenu.Sub>
{:else}
    <DropdownMenu.Item class={itemClasses} {onclick}>
        {#if props.icon}
            <Icon size={16} {...getIcon(props.icon)} />
        {/if}

        {#if props.text}
            <div class="w-full">{props.text}</div>
        {:else}
            <div>
                <Render {props} />
            </div>
        {/if}
    </DropdownMenu.Item>
{/if}
