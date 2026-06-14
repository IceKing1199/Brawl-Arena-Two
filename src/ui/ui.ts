export class UI {
  private menu = document.querySelector<HTMLDivElement>('#menu')!;
  private hud = document.querySelector<HTMLDivElement>('#hud')!;
  private mobile = document.querySelector<HTMLDivElement>('#mobile-controls')!;
  private banner = document.querySelector<HTMLDivElement>('#banner')!;
  private roundStatus = document.querySelector<HTMLSpanElement>('#round-status')!;
  private teamScore = document.querySelector<HTMLSpanElement>('#team-score')!;
  private enemyScore = document.querySelector<HTMLSpanElement>('#enemy-score')!;
  readonly playBtn = document.querySelector<HTMLButtonElement>('#play-btn')!;
  readonly exitBtn = document.querySelector<HTMLButtonElement>('#exit-btn')!;

  showMenu() {
    this.menu.classList.remove('hidden');
    this.hud.classList.add('hidden');
    this.mobile.classList.add('hidden');
  }

  showGame() {
    this.menu.classList.add('hidden');
    this.hud.classList.remove('hidden');
    if (this.isTouchDevice()) this.mobile.classList.remove('hidden');
    this.flashBanner();
  }

  flashBanner() {
    this.banner.classList.remove('hidden');
    this.banner.style.animation = 'none';
    void this.banner.offsetHeight;
    this.banner.style.animation = '';
    window.setTimeout(() => this.banner.classList.add('hidden'), 1700);
  }

  setStatus(text: string) {
    this.roundStatus.textContent = text;
  }

  setScore(team: number, enemy: number) {
    this.teamScore.textContent = String(team);
    this.enemyScore.textContent = String(enemy);
  }

  private isTouchDevice() {
    return matchMedia('(hover: none)').matches;
  }
}
