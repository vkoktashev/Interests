import { FaSteam, FaPlaystation, FaXbox, FaAppStoreIos, FaGooglePlay, FaItchIo } from "react-icons/fa";
import { SiEpicgames, SiNintendoswitch, SiGogdotcom } from "react-icons/si";
import { RiXboxLine } from "react-icons/ri";

export class GameStoresEnum {
    static STEAM = 'steam';

    static PS_STORE = 'playstation-store';

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
                return FaSteam;
            case this.PS_STORE:
                return FaPlaystation;
            case this.EGS:
                return SiEpicgames;
            case this.ESHOP:
                return SiNintendoswitch;
            case this.XBOX:
                return FaXbox;
            case this.GOG:
                return SiGogdotcom;
            case this.XBOX360:
                return RiXboxLine;
            case this.APPSTORE:
                return FaAppStoreIos;
            case this.GOOGLE_PLAY:
                return FaGooglePlay;
            case this.ITCH_IO:
                return FaItchIo;
            default:
                return null;
        }
    }
}
