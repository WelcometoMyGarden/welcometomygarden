<script>
  import { goto } from '@sveltech/routify';
  import notify from '@/stores/notification';
  import { getPrivateUserProfile, updateMailPreferences } from '@/api/user';
  import { user } from '@/stores/auth';
  import { gettingPrivateUserProfile, updatingMailPreferences } from '@/stores/user';
  import { Progress } from '@/components/UI';
  import routes from '@/routes';

  const onMailPreferenceChanged = async event => {
    try {
      const { name, checked } = event.target;
      await updateMailPreferences(name, checked);
      $user.emailPreferences[name] = checked;
      notify.success('Your email preferences have been updated!', 3500);
    } catch (ex) {
      console.log(ex);
    }
  };

  getPrivateUserProfile().catch(() => {
    notify.danger(
      "We couldn't get your profile information. Please contact support@welcometomygarden.be",
      15000
    );
    $goto(routes.HOME);
  });
</script>

<Progress active={$gettingPrivateUserProfile} />

{#if !$gettingPrivateUserProfile}
  <div>
    Send me emails when:
    <ul class="preference-list">
      <li>
        <input
          disabled={$updatingMailPreferences}
          type="checkbox"
          id="new-chat"
          name="newChat"
          checked={$user.emailPreferences.newChat}
          on:change={onMailPreferenceChanged} />
        <label for="new-chat">I receive a new chat message</label>
      </li>
      <li>
        <input
          disabled={$updatingMailPreferences}
          type="checkbox"
          id="news"
          name="news"
          checked={$user.emailPreferences.news}
          on:change={onMailPreferenceChanged} />
        <label for="news">Welcome To My Garden has news to share</label>
      </li>
    </ul>
  </div>
{/if}

<style>
  .preference-list {
    padding-left: 4rem;
    margin: 1rem 0;
  }

  .preference-list li {
    display: flex;
    align-items: center;
    margin-bottom: 0.4rem;
  }

  .preference-list label {
    margin-left: 1rem;
  }
</style>
