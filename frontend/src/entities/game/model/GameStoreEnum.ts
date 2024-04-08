import Steam from '@/../public/icons/steam.svg';
import Playstation from '@/../public/icons/playstation.svg';
import EpicGames from '@/../public/icons/epic-games.svg';
import NintendoSwitch from '@/../public/icons/nintendo-switch.svg';
import Xbox from '@/../public/icons/xbox.svg';
import GOG from '@/../public/icons/gog.svg';
import XboxLine from '@/../public/icons/xbox-line.svg';
import AppStore from '@/../public/icons/appstore.svg';
import GooglePlay from '@/../public/icons/google-play.svg';
import ItchIO from '@/../public/icons/itch-io.svg';

export class GameStoresEnum {
    static STEAM = 'steam';

    static PS_STORE = 'playstation.svg-store';

    static EGS = 'epic-games';

    static ESHOP = 'nintendo';

    static XBOX = 'xbox-store';

    static XBOX360 = 'xbox360';

    static GOG = 'gog';

    static APPSTORE = 'apple-appstore';

    static GOOGLE_PLAY = 'google-play';

    static ITCH_IO = 'itch';

    static getIcon(id: string) {
        switch (id) {
            case this.STEAM:
                return Steam;
            case this.PS_STORE:
                return Playstation;
            case this.EGS:
                return EpicGames;
            case this.ESHOP:
                return NintendoSwitch;
            case this.XBOX:
                return Xbox;
            case this.GOG:
                return GOG;
            case this.XBOX360:
                return XboxLine;
            case this.APPSTORE:
                return AppStore;
            case this.GOOGLE_PLAY:
                return GooglePlay;
            case this.ITCH_IO:
                return ItchIO;
            default:
                return null;
        }
    }
}
