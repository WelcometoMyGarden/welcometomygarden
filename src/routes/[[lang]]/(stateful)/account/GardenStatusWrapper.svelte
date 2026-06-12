<script lang="ts">
  import { _ } from 'svelte-i18n';
  import * as Sentry from '@sentry/sveltekit';
  import notify from '$lib/stores/notification';
  import logger from '$lib/util/logger';
  import { user } from '$lib/stores/auth';
  import { unlistGardenUntil, unlistGardenIndefinitely, relistGardenNow } from '$lib/api/garden';
  import GardenStatusCard from './GardenStatusCard.svelte';
  import UnlistGardenModal, {
    type UnlistResult,
    type UnlistMode
  } from './UnlistGardenModal.svelte';

  // Convenience shortcuts
  const listed = $derived($user?.garden?.listed ?? false);
  const returnDate = $derived($user?.relistGardenAt ? $user.relistGardenAt.toDate() : null);

  let updating = $state(false);
  let showModal = $state(false);
  let modalForceMode = $state<UnlistMode | null>(null);
  let modalInitialReturnDate = $state<Date | null>(null);

  const openModal = (forceMode: UnlistMode | null) => {
    modalForceMode = forceMode;
    modalInitialReturnDate = returnDate;
    showModal = true;
  };

  const onToggleVisibilitySwitch = async () => {
    if (updating) return;
    if (listed) {
      // Turning off → ask until when via the modal (no mode preselected).
      openModal(null);
    } else {
      // Turning on → relist immediately.
      await onRelistNow();
    }
  };

  const onRelistNow = async () => {
    updating = true;
    try {
      await relistGardenNow();
      notify.success($_('account.notify.garden-show'), 7000);
    } catch (ex) {
      logger.error(ex);
      Sentry.captureException(ex, { extra: { context: 'Error while relisting the garden' } });
    }
    updating = false;
  };

  const onConfirmUnlist = async (result: UnlistResult) => {
    updating = true;
    try {
      if (result.mode === 'until-date' && result.returnDate) {
        await unlistGardenUntil(result.returnDate);
      } else {
        await unlistGardenIndefinitely();
      }
      notify.success($_('account.notify.garden-no-show'), 7000);
    } catch (ex) {
      logger.error(ex);
      Sentry.captureException(ex, {
        extra: { context: 'Error while unlisting the garden' }
      });
    }
    updating = false;
  };
</script>

<GardenStatusCard
  {listed}
  {returnDate}
  disabled={updating}
  onToggle={onToggleVisibilitySwitch}
  onEditReturnDate={() => openModal('until-date')}
  {onRelistNow}
/>

<UnlistGardenModal
  bind:show={showModal}
  forceMode={modalForceMode}
  initialReturnDate={modalInitialReturnDate}
  onConfirm={onConfirmUnlist}
/>
