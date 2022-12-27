def get_game_new_fields(rawg_game, hltb_game=None):
    if rawg_game.get('background_image_additional') is not None:
        backdrop_path = rawg_game.get('background_image_additional')
    elif rawg_game.get('background_image') is not None:
        backdrop_path = rawg_game.get('background_image')
    else:
        backdrop_path = ''

    if rawg_game.get('background_image') is not None:
        poster_path = rawg_game.get('background_image')
    else:
        poster_path = ''

    result = {
        'rawg_slug': rawg_game.get('slug'),
        'rawg_name': rawg_game.get('name'),
        'rawg_release_date': rawg_game.get('released'),
        'rawg_tba': rawg_game.get('tba'),
        'rawg_backdrop_path': backdrop_path,
        'rawg_poster_path': poster_path,
    }

    if hltb_game is not None:
        result.update({
            'hltb_name': hltb_game.get('game_name'),
            'hltb_id': hltb_game.get('game_id')
        })

    return result


# cache keys
def get_rawg_game_key(slug):
    return f'game_{slug}'


def get_hltb_game_key(game_name):
    return f'hltb_search_{game_name.replace(" ", "_")}'
