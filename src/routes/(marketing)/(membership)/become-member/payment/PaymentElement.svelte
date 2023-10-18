<!--
Modified from the source, in order to support the paymentMethodOrder option:
https://stripe.com/docs/js/elements_object/create_payment_element#payment_element_create-options-paymentMethodOrder

This could break when we update the svelte-stripe dependency.

This file is a combination of the following files, which are subject to the license below.

- payment element https://github.com/joshnuss/svelte-stripe/blob/a367e09563223e7f34ae266fb14e7dc3fed41c50/src/lib/PaymentElement.svelte
- mount function https://github.com/joshnuss/svelte-stripe/blob/e1797a7a4b8ff688d3ced37f8386a349a3406f50/src/lib/util.js
- ElementsContext https://github.com/joshnuss/svelte-stripe/blob/e1797a7a4b8ff688d3ced37f8386a349a3406f50/src/lib/types.d.ts

Copyright (c) 2021 Joshua Nussbaum

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
-->
<script lang="ts">
  interface ElementsContext {
    elements: StripeElements;
    stripe: Stripe;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type DispatchType = <EventKey extends string>(type: EventKey, detail?: any) => void;

  import type {
    Stripe,
    StripeElementBase,
    StripeElements,
    StripePaymentElementOptions
  } from '@stripe/stripe-js';
  import { onMount, getContext, createEventDispatcher } from 'svelte';

  function mount(
    node: HTMLElement,
    // Gives type complaints
    // type: StripeElementType,
    type: 'payment',
    elements: StripeElements,
    dispatch: DispatchType,
    // Gives type complaints
    // options: StripeElementsOptions = {}
    options: StripePaymentElementOptions = {}
  ): StripeElementBase {
    const element = elements.create(type, options);

    element.mount(node);
    element.on('change', (e) => dispatch('change', e));
    element.on('ready', (e) => dispatch('ready', e));
    element.on('focus', (e) => dispatch('focus', e));
    element.on('blur', (e) => dispatch('blur', e));
    element.on('escape', (e) => dispatch('escape', e));
    // Handler doesn't exist anymore according to TS
    // element.on('click', (e) => dispatch('click', e));

    return element;
  }

  let element: StripeElementBase;
  let wrapper: HTMLElement;
  export let options: StripePaymentElementOptions = {};
  const dispatch = createEventDispatcher();
  const { elements }: ElementsContext = getContext('stripe');
  onMount(() => {
    // element = mount(wrapper, 'payment', elements, dispatch);
    // We want to be able to use these options
    element = mount(wrapper, 'payment', elements, dispatch, options);
    return () => element.destroy();
  });
  export function blur() {
    element.blur();
  }
  export function clear() {
    element.clear();
  }
  export function destroy() {
    element.destroy();
  }
  export function focus() {
    element.focus();
  }
</script>

<div bind:this={wrapper} />
