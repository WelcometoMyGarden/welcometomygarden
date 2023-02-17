## Front-end

The main "entry point" for the front-end is `src/routes/+layout.svelte`. **As the root SvelteKit layout, all other layouts & pages inherit from it** ([see docs](https://kit.svelte.dev/docs/routing#layout-layout-svelte)).

This layout mainly initializes app locales and Firebase. As Firebase is initialized, the `onIdTokenChanged` listener located in `src/lib/api/auth.ts` triggers. This large function takes over initialization, and sets off several asynchronous tasks to:

- check the user's login status
- check the user's email verification status
- load the user's data (`users`, and `users-private` documents)

When the user is loaded, all user data is combined into the `$user` Svelte store, which contains either `null` or a valid User (`src/lib/models/User.ts`).

**Note**: `$user == null` does not necessarily mean that the user is logged out. It could be that the user data is still loading! Check or subscribe to the `$isUserLoading` store to know, or use the convenience method `await resolveOnUserLoaded()`. Example: after logging in into Firebase with `signInWithEmailAndPassword()` or `createUserWithEmailAndPassword()`, the User data will most likely not be loaded yet. This might be unintuitive.

The root layout waits until the user is loaded before it renders. `$isUserLoading` can also be `false` while `$user` is `null`. In that case, we can be certain that the user is logged out.
