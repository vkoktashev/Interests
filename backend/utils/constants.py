import rawgpy
import tmdbsimple as tmdb
from drf_yasg import openapi
from rest_framework import status

rawg = rawgpy.RAWG("Interests. Contact us via your_interests@mail.ru")
tmdb.API_KEY = 'ebf9e8e8a2be6bba6aacfa5c4c76f698'
LANGUAGE = 'ru'

DEFAULT_PAGE_NUMBER = 1
DEFAULT_PAGE_SIZE = 5

# errors
ERROR = 'error'
RAWG_UNAVAILABLE = 'Rawg unavailable'
WRONG_SLUG = 'Wrong slug'
HLTB_UNAVAILABLE = 'Hltb unavailable'
MOVIE_NOT_FOUND = "Movie not found"
TMDB_UNAVAILABLE = "Tmdb unavailable"
USER_EMAIL_EXISTS = 'A user with that email already exists'
USER_USERNAME_EXISTS = 'A user with that username already exists.'

# response examples
SEARCH_GAMES_RESPONSE_EXAMPLE = [
    {
        "id": 0,
        "slug": "string",
        "name": "string",
        "released": "2020-12-09",
        "tba": True,
        "background_image": "http://example.com",
        "rating": 0,
        "rating_top": 0,
        "ratings": {},
        "ratings_count": 0,
        "reviews_text_count": "string",
        "added": 0,
        "added_by_status": {},
        "metacritic": 0,
        "playtime": 0,
        "suggestions_count": 0,
        "updated": "2020-12-09T18:56:09Z",
        "esrb_rating": {
            "id": 0,
            "slug": "everyone",
            "name": "Everyone"
        },
        "platforms": [
            {
                "platform": {
                    "id": 0,
                    "slug": "string",
                    "name": "string"
                },
                "released_at": "string",
                "requirements": {
                    "minimum": "string",
                    "recommended": "string"
                }
            }
        ]
    }
]
FRIENDS_INFO_RESPONSE_EXAMPLE = {
    status.HTTP_200_OK: openapi.Response(
        description=status.HTTP_200_OK,
        examples={
            "application/json": {
                "friends_info": [
                    {
                        "status": "string",
                        "user": {
                            "id": 0,
                            "username": "string"
                        },
                        "score": 0,
                        "review": "string",
                        "spent_time": "0.0"
                    }
                ],
                "has_next_page": True
            }
        }
    )
}
SEARCH_MOVIES_RESPONSE_EXAMPLE = {
    "page": 1,
    "results": [
        {
            "poster_path": "/cezWGskPY5x7GaglTTRN4Fugfb8.jpg",
            "adult": False,
            "overview": "When an unexpected enemy emerges and threatens global safety and security, Nick Fury, director of the international peacekeeping agency known as S.H.I.E.L.D., finds himself in need of a team to pull the world back from the brink of disaster. Spanning the globe, a daring recruitment effort begins!",
            "release_date": "2012-04-25",
            "genre_ids": [
                878,
                28,
                12
            ],
            "id": 24428,
            "original_title": "The Avengers",
            "original_language": "en",
            "title": "The Avengers",
            "backdrop_path": "/hbn46fQaRmlpBuUrEiFqv0GDL6Y.jpg",
            "popularity": 7.353212,
            "vote_count": 8503,
            "video": False,
            "vote_average": 7.33
        }
    ],
    "total_results": 1,
    "total_pages": 1
}
RETRIEVE_GAME_RESPONSE_EXAMPLE = {
    "rawg": {
        "id": 0,
        "slug": "string",
        "name": "string",
        "name_original": "string",
        "description": "string",
        "metacritic": 0,
        "metacritic_platforms": [
            {
                "metascore": 0,
                "url": "string"
            }
        ],
        "released": "2020-12-10",
        "tba": True,
        "updated": "2020-12-10T11:00:42Z",
        "background_image": "http://example.com",
        "background_image_additional": "string",
        "website": "http://example.com",
        "rating": 0,
        "rating_top": 0,
        "ratings": {},
        "reactions": {},
        "added": 0,
        "added_by_status": {},
        "playtime": 0,
        "screenshots_count": 0,
        "movies_count": 0,
        "creators_count": 0,
        "achievements_count": 0,
        "parent_achievements_count": "string",
        "reddit_url": "string",
        "reddit_name": "string",
        "reddit_description": "string",
        "reddit_logo": "http://example.com",
        "reddit_count": 0,
        "twitch_count": "string",
        "youtube_count": "string",
        "reviews_text_count": "string",
        "ratings_count": 0,
        "suggestions_count": 0,
        "alternative_names": [
            "string"
        ],
        "metacritic_url": "string",
        "parents_count": 0,
        "additions_count": 0,
        "game_series_count": 0,
        "esrb_rating": {
            "id": 0,
            "slug": "everyone",
            "name": "Everyone"
        },
        "platforms": [
            {
                "platform": {
                    "id": 0,
                    "slug": "string",
                    "name": "string"
                },
                "released_at": "string",
                "requirements": {
                    "minimum": "string",
                    "recommended": "string"
                }
            }
        ]
    },
    "hltb": {
        "game_id": "string",
        "game_name": "string",
        "game_image_url": "http://example.com",
        "game_web_link": "http://example.com",
        "gameplay_main": "string",
        "gameplay_main_unit": "string",
        "gameplay_main_label": "string",
        "gameplay_main_extra": "string",
        "gameplay_main_extra_unit": "string",
        "gameplay_main_extra_label": "string",
        "gameplay_completionist": "string",
        "gameplay_completionist_unit": "string",
        "gameplay_completionist_label": "string",
        "similarity": 0.0
    },
    "user_info": {
        "status": "string",
        "score": 0,
        "review": "string",
        "spent_time": "0.0"
    }
}
RETRIEVE_MOVIE_RESPONSE_EXAMPLE = {
    "tmdb": {
        "adult": False,
        "backdrop_path": "/fCayJrkfRaCRCTh8GqN30f8oyQF.jpg",
        "belongs_to_collection": None,
        "budget": 63000000,
        "genres": [
            {
                "id": 18,
                "name": "Drama"
            }
        ],
        "homepage": "",
        "id": 550,
        "imdb_id": "tt0137523",
        "original_language": "en",
        "original_title": "Fight Club",
        "overview": "A ticking-time-bomb insomniac and a slippery soap salesman channel primal male aggression into a shocking new form of therapy. Their concept catches on, with underground \"fight clubs\" forming in every town, until an eccentric gets in the way and ignites an out-of-control spiral toward oblivion.",
        "popularity": 0.5,
        "poster_path": None,
        "production_companies": [
            {
                "id": 508,
                "logo_path": "/7PzJdsLGlR7oW4J0J5Xcd0pHGRg.png",
                "name": "Regency Enterprises",
                "origin_country": "US"
            },
            {
                "id": 711,
                "logo_path": None,
                "name": "Fox 2000 Pictures",
                "origin_country": ""
            },
            {
                "id": 20555,
                "logo_path": None,
                "name": "Taurus Film",
                "origin_country": ""
            },
            {
                "id": 54050,
                "logo_path": None,
                "name": "Linson Films",
                "origin_country": ""
            },
            {
                "id": 54051,
                "logo_path": None,
                "name": "Atman Entertainment",
                "origin_country": ""
            },
            {
                "id": 54052,
                "logo_path": None,
                "name": "Knickerbocker Films",
                "origin_country": ""
            },
            {
                "id": 25,
                "logo_path": "/qZCc1lty5FzX30aOCVRBLzaVmcp.png",
                "name": "20th Century Fox",
                "origin_country": "US"
            }
        ],
        "production_countries": [
            {
                "iso_3166_1": "US",
                "name": "United States of America"
            }
        ],
        "release_date": "1999-10-12",
        "revenue": 100853753,
        "runtime": 139,
        "spoken_languages": [
            {
                "iso_639_1": "en",
                "name": "English"
            }
        ],
        "status": "Released",
        "tagline": "How much can you know about yourself if you've never been in a fight?",
        "title": "Fight Club",
        "video": False,
        "vote_average": 7.8,
        "vote_count": 3439,
        "cast": [
            {
                "adult": False,
                "gender": 2,
                "id": 6193,
                "known_for_department": "Acting",
                "name": "Leonardo DiCaprio",
                "original_name": "Leonardo DiCaprio",
                "popularity": 15.687,
                "profile_path": "/wo2hJpn04vbtmh0B9utCFdsQhxM.jpg",
                "cast_id": 1,
                "character": "Dom Cobb",
                "credit_id": "52fe4534c3a368484e04de03",
                "order": 0
            }
        ],
        "crew": [
            {
                "adult": False,
                "gender": 2,
                "id": 947,
                "known_for_department": "Sound",
                "name": "Hans Zimmer",
                "original_name": "Hans Zimmer",
                "popularity": 1.459,
                "profile_path": "/tpQnDeHY15szIXvpnhlprufz4d.jpg",
                "credit_id": "56e8462cc3a368408400354c",
                "department": "Sound",
                "job": "Original Music Composer"
            }
        ]
    },
    "user_info": {
        "status": "string",
        "score": 0,
        "review": "string",
    }
}
