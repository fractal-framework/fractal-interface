import { DAOCreate } from './DAOCreate';
import { NavPage } from './NavPage';

export class HomePage extends NavPage {
  async visit() {
    await this.visitPath('');
    return this;
  }

  async clickConnectWallet() {
    await this.clickTestId('home-linkConnect');
  }

  async clickCreateAFractal() {
    await this.clickTestId('home-linkCreate');
    return new DAOCreate(this.pageContext());
  }

  async clickFAQNewTab() {
    return this.newTab(this.clickTestId('home-linkFAQ'));
  }

  async clickDiscordNewTab() {
    return this.newTab(this.clickTestId('home-linkDiscord'));
  }

  async clickDocsNewTab() {
    return this.newTab(this.clickTestId('home-linkDocs'));
  }
}
