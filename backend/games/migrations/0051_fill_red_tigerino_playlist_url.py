from django.db import migrations


PLAYLISTS_BY_RAWG_SLUG = {
    'a-story-about-my-uncle': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuAqtELGd8GWNm_rT8K2-0BO',
    'acid-nerve-deaths-door': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuDiAPWSHJkjdjHWMvq18YOw',
    'age-of-mythology': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuDvALqbFH0Pv4k86SgpizpN',
    'apex-legends': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuCX_xAzlZUGpYdIcMN8oPH4',
    'aragami-2': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuDolIdBTGeE-6ow71GPpxvU',
    'armored-core-vi': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuD6ue6Sc3bRS8Sl4i2U1X_S',
    'assassins-creed-brotherhood-2': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuAFDIlfxs4f1b5wYcXLJVbv',
    'assassins-creed-ii': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuDzbpp6TmrOi3f0rXqnxUVB',
    'assassins-creed-revelations': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuBcE24yQwQnpCBTrZ2OJupz',
    'black-mesa': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuCA-iofqAkqodp7L3QKhsEe',
    'blasphemous': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuA7ZvFHyrPq6TqmTS_TZz6t',
    'call-of-cthulhu-the-official-video-game': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuDI42kVuhMA9nm9bOKb0cNY',
    'call-of-duty-modern-warfare': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuAwQeho-XPDj6z3qH5N0fFE',
    'call-of-juarez-gunslinger': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuBRJu8bhNPg_YnLk0W80P_P',
    'celeste': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuBzhtgHg7I-aQDAgHJ5flMn',
    'chicken-assassin-master-of-humiliation': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuBwCWdt7ZaN2jB_cxv-ZyXR',
    'condemned-criminal-origins': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuAVbLkue_K9DVgKPDEOBDEX',
    'counter-strike-global-offensive': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuCI-JrQFa1iw6z8VVBkQZJ4',
    'cyberpunk-2077': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuBEa5Mbq-v39dXWPu6KnBbc',
    'dark-souls-ii-scholar-of-the-first-sin': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuC8ibcG4JrJ_Rq27oNpQVut',
    'dark-souls-iii': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuBVSz9CFbfRNm-v8R-siBG6',
    'dark-souls8482-remastered': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuCxmjk8eBxcmAjOAw8EZL4z',
    'dead-by-daylight': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuDWdJsW3HKyQcpHJI766-sE',
    'dead-cells': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuDg5pDBShKHyCrqtQNAqAhv',
    'deadbolt': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuAvj26T3PgDXg8PdrqViEks',
    'death-stranding': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuCp8nrJlwWpANAMryCVPNop',
    'detroit-become-human': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuCVTbGVV2F2lmwPMMBBriZv',
    'dont-starve-together': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuDyq0VXH-eTdcEMdsYTmf65',
    'dota-2': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuDG9TPHcRudhP3zvup1YIxe',
    'dragon-age-origins': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuDj5Eon7Z3g0rU8X0X4t-Fo',
    'elden-ring': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuAh5tzdrDrzkaqsNhRAUONI',
    'enter-the-gungeon': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuARTSpQizrij_XAq77jaexk',
    'frostpunk': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuALE-KxFqkw3qPVKeUBQVE0',
    'genshin-impact': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuDcNW4OQsd_BE6orqP8QnsB',
    'ghost-of-tsushima': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuAi3wRP9TPaDroWRCUgcQFC',
    'ghostrunner': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuA0iydqcoaIlePL1c_O-34U',
    'god-of-war-2': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuAxacPXc1jnHX6xRnLQEcUA',
    'god-of-war-ragnarok-2': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuDRZxmAm8y4_-7s8rKf1_sJ',
    'heavy-rain': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuBl0Wvt-8CZye4HCpLJu1HH',
    'horizon-zero-dawn': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuCsoQyBUHTiIdntjJO_WViz',
    'insurgency': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuCy286DaxOIz7fb2VrfsteF',
    'jedi-the-fallen-order': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuBqJyUzyDEO5I97VywlTOqG',
    'kena-bridge-of-spirits': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuDMEuyLF-rvxoxHxYgODL8j',
    'kenshi': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuDCtrVpxNHlpuljTjTeD6N4',
    'kingdom-come-deliverance': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuCJB6FbYPcUdlp7bdhMZqI0',
    'life-is-strange-episode-1-2': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuBvYNzHjJsf6SxanMJ_YuRO',
    'magicka-2': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuDOcr_iiXoDCWUaA53SdOOR',
    'marvels-spider-man-remastered': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuDmnueCkozSCxJwIannqTdQ',
    'mass-effect-2': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuB3JxhFbVZKkAW8MlOv5yRJ',
    'mortal-shell': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuDU6WgdF3nxHwnCihLbvzyf',
    'one-hand-clapping': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuCTZzCZGqFLivcf8tjqpIYb',
    'operation-tango': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuAqwo0l_MoIUSom7o3RgiKb',
    'ori-and-the-will-of-the-wisps': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuBsWiAuBi-DuBZpNknPPiAi',
    'overwatch': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuDtS7E7TqQFXB37rHtx4ELx',
    'overwatch-2': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuAm1u_o-pkHQ-IvHHlLEoaC',
    'path-of-exile': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuAdQFuuRqbKunrl5DLU6fV1',
    'pathologic': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuCc-wFzgiCiIYQ2tkfl8MQQ',
    'playerunknowns-battlegrounds': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuCVVQj-DRUV5IbU0dDCIBWI',
    'red-dead-redemption-2': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuAm1eiWxHIvNmlikYaM7Z3d',
    'return-of-the-obra-dinn': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuCsVk0G1pSVNAEGjhRtlpes',
    'rogue-legacy': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuCMxbs133b-Y0mW4Ea5v4R3',
    'samorost': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuDbnNKQp8NKAm_vhozoD8mj',
    'scp-secret-laboratory': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuDQXpFrMiKbu6p0ploZrcwk',
    'serious-sam-3-bfe': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuDdhlPp_-8ChpecDLsUR9GK',
    'shrek-2': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuC190LDhTX-9DkoX4YHcCaw',
    'sifu': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuDJVBak6veAvRjuD1EVr0Vd',
    'spookys-jump-scare-mansion': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuA5fPc5oOtUNuMobkAVaNLF',
    'star-wars-knights-of-the-old-republic-2': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuCRbmiutRLj2xP2kKXPoGjf',
    'starbound': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuCq1xtzxnoAW996ON-Z8vAX',
    'subnautica': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuAtd8iV8wPJUzAs93zl8WJr',
    'terraria': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuANSl0nrHTBgH6jcUFnhCxE',
    'the-beast-inside': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuAPDwKgRip_tcoDn2_J2jRb',
    'the-binding-of-isaac-rebirth': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuAkUkA9Nrbr5pBypnFGahk0',
    'the-elder-scrolls-iv-oblivion-remastered': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuBB_lu_tGSwfQd98ybGKI7w',
    'the-elder-scrolls-v-skyrim': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuBais-cluR-eR5yyxH0JTZn',
    'the-last-of-us': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuBjiw7qLa5vhw_bPn9XPlrs',
    'the-last-of-us-part-2': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuC4NHwTr7cXKREP8SEVSZ4k',
    'the-quarry-3': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuC-xLClaCs-chPgnWBKszJp',
    'the-witcher-2-assassins-of-kings-enhanced-edition': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuCacmeNZ8_gehecXzzhaqw1',
    'trine-4-the-nightmare-prince': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuB6a25mPkO56NCgvZSZvlbS',
    'uncharted-4-a-thiefs-end': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuCwozpaL15DdPqM21DIEPPn',
    'undertale': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuBrTvc85mfvboEVcHzoBTdd',
    'until-dawn': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuDnsgT0PYZ68FvzvyrTPzT2',
    'vampire-survivors': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuAT5yhYocrQ20ontBY6UtRL',
    'we-were-here': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuDgMuKa4ZQdC2NkgefdCZ_o',
    'we-were-here-expeditions-the-friendship': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuAbdKpeRAS95W-6QesuPIS2',
    'we-were-here-forever': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuBK8sQCX4N25i7tO9e-wp1F',
    'we-were-here-together': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuBQbje8GvosrTshd3BPBNWS',
    'world-war-z': 'https://www.youtube.com/playlist?list=PLjLUSPv9SLuCKrco4v2FaKlmn6TR0Fw9W',
}


def fill_red_tigerino_playlist_url(apps, schema_editor):
    Game = apps.get_model('games', 'Game')
    for slug, url in PLAYLISTS_BY_RAWG_SLUG.items():
        Game.objects.filter(rawg_slug=slug).update(red_tigerino_playlist_url=url)


def clear_red_tigerino_playlist_url(apps, schema_editor):
    Game = apps.get_model('games', 'Game')
    Game.objects.filter(rawg_slug__in=PLAYLISTS_BY_RAWG_SLUG.keys()).update(red_tigerino_playlist_url="")


class Migration(migrations.Migration):

    dependencies = [
        ('games', '0050_game_red_tigerino_playlist_url'),
    ]

    operations = [
        migrations.RunPython(fill_red_tigerino_playlist_url, clear_red_tigerino_playlist_url),
    ]
