<script>
  import { calendarIcon, clockIcon } from '@/images/icons';
  import { Icon } from './UI';

  import LogoWithText from '../images/logo_with_text.svg';
  import { lineIcon } from '../images/icons';

  export let section = '';
  export let title = '';
  export let languageAbbreviation = 'EN';
  export let date = '';
  export let time = '';
  export let sponsor1 = null;
  export let sponsor2 = null;
</script>

<div class="getInspired">
  <div class="left">
    <div class="section">
      <div class="icon">
        <Icon icon={lineIcon} />
      </div>
      <div class="text">
        <p>{section}</p>
      </div>
    </div>
    <div class="title">
      <h2>
        {@html title}
        <span class="badge">{languageAbbreviation}</span>
      </h2>
    </div>
    <div class="when">
      <div class="date">
        <div class="icon">
          <Icon icon={calendarIcon} />
        </div>
        <p class="dateText">
          {date}
        </p>
      </div>
      <div class="time">
        <div class="icon">
          <Icon icon={clockIcon} />
        </div>
        <p class="dateText">
          {time}
        </p>
      </div>
    </div>
    <div class="spacer" />
    <div class="getInspiredLogo spacingRight">
      {@html LogoWithText}
    </div>
    <div class="getInspiredPartners spacingRight">
      <div class="getInspiredPartnersItem">
        {@html sponsor1}
      </div>
      <div class="getInspiredPartnersItem">
        {@html sponsor2}
      </div>
    </div>
  </div>
  <figure class="right getInspiredImg">
    <img src="/images/mapwithperson.png" alt="person with map" />
  </figure>
</div>

<style>
  .getInspired {
    background-color: var(--color-yellow);
    padding-left: 8rem;
    display: flex;
  }

  .left {
    display: flex;
    flex-direction: column;
    margin-top: 8rem;
  }

  .section {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    padding-bottom: 1rem;
  }

  .section .icon {
    width: 2rem;
    height: 1.5rem;
  }

  .section P {
    padding-left: 1rem;
    font-weight: bold;
    text-transform: uppercase;
    font-size: 2rem;
  }

  .getInspired h2 {
    color: #fff;
    line-height: 5rem;
    font-size: 3.5rem;
    font-weight: bold;
    margin-bottom: 30px;
    text-transform: uppercase;
    position: relative;
  }

  .getInspired .badge {
    display: inline;
    background-color: var(--color-green);
    color: var(--color-white);
    border-radius: 4rem;
    font-family: var(--fonts-titles);
    text-transform: uppercase;
    padding: 0 2rem;
    margin-left: 1rem;

    font-size: 0.5em;
    vertical-align: top;
  }

  .getInspired img {
    height: 100%;
  }

  .getInspiredImg {
    clip-path: polygon(30% 0, 100% 0, 100% 100%, 0% 100%);
  }

  .spacingRight {
    padding-right: 8rem;
  }

  .getInspiredLogo {
    margin: 3rem auto 3rem auto;
    text-align: center;
    width: 60%;
    min-width: 25rem;
  }

  .getInspiredPartners {
    margin-top: 3rem;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }

  .getInspiredPartnersItem {
    width: 40%;
    min-width: 10rem;
    padding-bottom: 3rem;
  }

  .when .icon {
    width: 4rem;
    height: 3rem;
  }

  .when {
    display: flex;
    flex-direction: row;
    justify-content: flex-start;
    padding-right: 0.5rem;
  }
  .date,
  .time {
    margin-top: 0.5rem;
    display: flex;
    align-items: center;
  }

  .time {
    padding-left: 5rem;
  }

  .dateText {
    font-weight: bold;
    font-size: 2rem;
  }

  .spacer {
    flex: 1 1 auto;
  }
</style>
