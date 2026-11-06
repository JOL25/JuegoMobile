// Keeps upgrade callbacks out of React state until a menu is actually shown.
export class MenuBridge {
  constructor(onChange = () => {}) {
    this.onChange = onChange;
    this.current = { screen: "menu" };
  }
  show(screen, data = {}) {
    this.current = { screen, ...data };
    this.onChange(this.current);
  }
  showMenu() {
    this.show("menu");
  }
  hideAll() {
    this.show("playing");
  }
  showPause() {
    this.show("paused");
  }
  showLevelUp(options) {
    this.show("level_up", { options });
  }
  showGameOver(stats) {
    this.show("game_over", { stats });
  }
}
