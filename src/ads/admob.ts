// Ad service. On web (dev) it's a no-op stub. On native (Capacitor) it uses
// @capacitor-community/admob with the official test ad unit IDs so we can
// verify the integration before plugging in real production IDs.

import { Capacitor } from '@capacitor/core';

// Google's official always-fill test unit IDs. Safe to commit; replace
// before publishing. See https://developers.google.com/admob/android/test-ads
export const TEST_AD_UNITS = {
  banner:       'ca-app-pub-3940256099942544/6300978111',
  interstitial: 'ca-app-pub-3940256099942544/1033173712',
  rewarded:     'ca-app-pub-3940256099942544/5224354917',
};

class AdService {
  private nativeReady = false;
  private interstitialPrepared = false;

  async init() {
    if (!Capacitor.isNativePlatform()) return;
    try {
      const { AdMob } = await import('@capacitor-community/admob');
      await AdMob.initialize({
        testingDevices: [],
        initializeForTesting: true,
      });
      this.nativeReady = true;
      // Pre-load an interstitial so the first show is instant.
      this.prepareInterstitial().catch(() => { /* ignore */ });
    } catch (e) {
      console.warn('AdMob init failed', e);
    }
  }

  private async prepareInterstitial() {
    if (!this.nativeReady) return;
    const { AdMob } = await import('@capacitor-community/admob');
    await AdMob.prepareInterstitial({ adId: TEST_AD_UNITS.interstitial });
    this.interstitialPrepared = true;
  }

  async showInterstitial(): Promise<void> {
    if (!this.nativeReady) {
      // dev: log + small artificial delay so the call site can show a
      // "loading" beat if it wants to.
      console.info('[ads] would show interstitial (web stub)');
      await new Promise((r) => setTimeout(r, 250));
      return;
    }
    const { AdMob } = await import('@capacitor-community/admob');
    if (!this.interstitialPrepared) await this.prepareInterstitial();
    await AdMob.showInterstitial();
    this.interstitialPrepared = false;
    this.prepareInterstitial().catch(() => { /* ignore */ });
  }

  async showBanner(): Promise<void> {
    if (!this.nativeReady) return;
    const { AdMob, BannerAdPosition, BannerAdSize } = await import('@capacitor-community/admob');
    await AdMob.showBanner({
      adId: TEST_AD_UNITS.banner,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      margin: 0,
    });
  }

  async hideBanner(): Promise<void> {
    if (!this.nativeReady) return;
    const { AdMob } = await import('@capacitor-community/admob');
    await AdMob.hideBanner();
  }
}

export const adService = new AdService();
