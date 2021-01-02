from utils.constants import USER_USERNAME_EXISTS, USER_EMAIL_EXISTS

# response examples
GAMES_SEARCH_200_EXAMPLE = [
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
MOVIES_SEARCH_200_EXAMPLE = {
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
GAME_RETRIEVE_200_EXAMPLE = {
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
MOVIE_RETRIEVE_200_EXAMPLE = {
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
USER_SIGNUP_201_EXAMPLE = {
    "id": 0,
    "username": "string"
}
USER_SIGNUP_400_EXAMPLE = {
    "username": [
        USER_USERNAME_EXISTS
    ],
    "email": [
        USER_EMAIL_EXISTS
    ]
}
USER_LOG_200_EXAMPLE = {
    "log": [
        {
            "id": 0,
            "user": "string",
            "user_id": 0,
            "type": "string",
            "target": "string",
            "target_id": "string",
            "created": "2020-12-14T17:31:40.370669Z",
            "action_result": "0",
            "action_type": "string"
        }
    ],
    "has_next_page": True
}
USER_RETRIEVE_200_EXAMPLE = {
    "id": 0,
    "username": "string",
    "is_followed": False,
    "followed_users": [
        {
            "id": 0,
            "username": "string"
        }
    ],
    "games": [
        {
            "status": "string",
            "score": 0,
            "review": "string",
            "spent_time": "0.0",
            "game": {
                "id": 0,
                "rawg_name": "string",
                "rawg_slug": "string",
                "rawg_id": 0,
                "hltb_name": "string",
                "hltb_id": 0
            }
        },
    ],
    "movies": [
        {
            "status": "string",
            "score": 0,
            "review": "string",
            "movie": {
                "id": 0,
                "imdb_id": "string",
                "tmdb_id": 0,
                "tmdb_original_name": "string",
                "tmdb_name": "string",
                "tmdb_runtime": 0
            }
        },
    ],
    "stats": {
        "games_count": 0,
        "games_total_spent_time": 0.0,
        "movies_count": 0,
        "movies_total_spent_time": 0.0
    }
}
USER_SEARCH_200_EXAMPLE = [
    {
        "id": 0,
        "username": "string"
    }
]
SHOW_RETRIEVE_200_EXAMPLE = {
    "tmdb": {
        "backdrop_path": "/suopoADq0k8YZr4dQXcU6pToj6s.jpg",
        "created_by": [
            {
                "id": 9813,
                "credit_id": "5256c8c219c2956ff604858a",
                "name": "David Benioff",
                "gender": 2,
                "profile_path": "/xvNN5huL0X8yJ7h3IZfGG4O2zBD.jpg"
            },
            {
                "id": 228068,
                "credit_id": "552e611e9251413fea000901",
                "name": "D. B. Weiss",
                "gender": 2,
                "profile_path": "/2RMejaT793U9KRk2IEbFfteQntE.jpg"
            }
        ],
        "episode_run_time": [
            60
        ],
        "first_air_date": "2011-04-17",
        "genres": [
            {
                "id": 10765,
                "name": "Sci-Fi & Fantasy"
            },
            {
                "id": 18,
                "name": "Drama"
            },
            {
                "id": 10759,
                "name": "Action & Adventure"
            },
            {
                "id": 9648,
                "name": "Mystery"
            }
        ],
        "homepage": "http://www.hbo.com/game-of-thrones",
        "id": 1399,
        "in_production": False,
        "languages": [
            "en"
        ],
        "last_air_date": "2019-05-19",
        "last_episode_to_air": {
            "air_date": "2019-05-19",
            "episode_number": 6,
            "id": 1551830,
            "name": "The Iron Throne",
            "overview": "In the aftermath of the devastating attack on King's Landing, Daenerys must face the survivors.",
            "production_code": "806",
            "season_number": 8,
            "still_path": "/3x8tJon5jXFa1ziAM93hPKNyW7i.jpg",
            "vote_average": 4.8,
            "vote_count": 106
        },
        "name": "Game of Thrones",
        "next_episode_to_air": None,
        "networks": [
            {
                "name": "HBO",
                "id": 49,
                "logo_path": "/tuomPhY2UtuPTqqFnKMVHvSb724.png",
                "origin_country": "US"
            }
        ],
        "number_of_episodes": 73,
        "number_of_seasons": 8,
        "origin_country": [
            "US"
        ],
        "original_language": "en",
        "original_name": "Game of Thrones",
        "overview": "Seven noble families fight for control of the mythical land of Westeros. Friction between the houses leads to full-scale war. All while a very ancient evil awakens in the farthest north. Amidst the war, a neglected military order of misfits, the Night's Watch, is all that stands between the realms of men and icy horrors beyond.",
        "popularity": 369.594,
        "poster_path": "/u3bZgnGQ9T01sWNhyveQz0wH0Hl.jpg",
        "production_companies": [
            {
                "id": 76043,
                "logo_path": "/9RO2vbQ67otPrBLXCaC8UMp3Qat.png",
                "name": "Revolution Sun Studios",
                "origin_country": "US"
            },
            {
                "id": 12525,
                "logo_path": None,
                "name": "Television 360",
                "origin_country": ""
            },
            {
                "id": 5820,
                "logo_path": None,
                "name": "Generator Entertainment",
                "origin_country": ""
            },
            {
                "id": 12526,
                "logo_path": None,
                "name": "Bighead Littlehead",
                "origin_country": ""
            }
        ],
        "production_countries": [
            {
                "iso_3166_1": "GB",
                "name": "United Kingdom"
            },
            {
                "iso_3166_1": "US",
                "name": "United States of America"
            }
        ],
        "seasons": [
            {
                "air_date": "2010-12-05",
                "episode_count": 64,
                "id": 3627,
                "name": "Specials",
                "overview": "",
                "poster_path": "/kMTcwNRfFKCZ0O2OaBZS0nZ2AIe.jpg",
                "season_number": 0
            },
            {
                "air_date": "2011-04-17",
                "episode_count": 10,
                "id": 3624,
                "name": "Season 1",
                "overview": "Trouble is brewing in the Seven Kingdoms of Westeros. For the driven inhabitants of this visionary world, control of Westeros' Iron Throne holds the lure of great power. But in a land where the seasons can last a lifetime, winter is coming...and beyond the Great Wall that protects them, an ancient evil has returned. In Season One, the story centers on three primary areas: the Stark and the Lannister families, whose designs on controlling the throne threaten a tenuous peace; the dragon princess Daenerys, heir to the former dynasty, who waits just over the Narrow Sea with her malevolent brother Viserys; and the Great Wall--a massive barrier of ice where a forgotten danger is stirring.",
                "poster_path": "/zwaj4egrhnXOBIit1tyb4Sbt3KP.jpg",
                "season_number": 1
            }
        ],
        "spoken_languages": [
            {
                "english_name": "English",
                "iso_639_1": "en",
                "name": "English"
            }
        ],
        "status": "Ended",
        "tagline": "Winter Is Coming",
        "type": "Scripted",
        "vote_average": 8.3,
        "vote_count": 11504
    },
    "user_info": {
        "status": "string",
        "score": 0,
        "review": "string",
    }
}
SHOWS_SEARCH_200_EXAMPLE = {
    "page": 1,
    "results": [
        {
            "poster_path": "/jIhL6mlT7AblhbHJgEoiBIOUVl1.jpg",
            "popularity": 29.780826,
            "id": 1399,
            "backdrop_path": "/mUkuc2wyV9dHLG0D0Loaw5pO2s8.jpg",
            "vote_average": 7.91,
            "overview": "Seven noble families fight for control of the mythical land of Westeros. Friction between the houses leads to full-scale war. All while a very ancient evil awakens in the farthest north. Amidst the war, a neglected military order of misfits, the Night's Watch, is all that stands between the realms of men and icy horrors beyond.",
            "first_air_date": "2011-04-17",
            "origin_country": [
                "US"
            ],
            "genre_ids": [
                10765,
                10759,
                18
            ],
            "original_language": "en",
            "vote_count": 1172,
            "name": "Game of Thrones",
            "original_name": "Game of Thrones"
        }
    ],
    "total_results": 1,
    "total_pages": 1
}
SEASON_RETRIEVE_200_EXAMPLE = {
    "tmdb": {
        "_id": "5256c89f19c2956ff6046d47",
        "air_date": "2011-04-17",
        "episodes": [
            {
                "air_date": "2011-04-17",
                "episode_number": 1,
                "crew": [
                    {
                        "job": "Writer",
                        "department": "Writing",
                        "credit_id": "5256c8a219c2956ff6046e4b",
                        "adult": False,
                        "gender": 2,
                        "id": 228068,
                        "known_for_department": "Creator",
                        "name": "D. B. Weiss",
                        "original_name": "D. B. Weiss",
                        "popularity": 2.089,
                        "profile_path": None
                    }
                ],
                "guest_stars": [
                    {
                        "credit_id": "5256c8a219c2956ff6046f40",
                        "order": 0,
                        "character": "Khal Drogo",
                        "adult": False,
                        "gender": 2,
                        "id": 117642,
                        "known_for_department": "Acting",
                        "name": "Jason Momoa",
                        "original_name": "Jason Momoa",
                        "popularity": 9.159,
                        "profile_path": "/6dEFBpZH8C8OijsynkSajQT99Pb.jpg"
                    }
                ],
                "id": 63056,
                "name": "Winter Is Coming",
                "overview": "Jon Arryn, the Hand of the King, is dead. King Robert Baratheon plans to ask his oldest friend, Eddard Stark, to take Jon's place. Across the sea, Viserys Targaryen plans to wed his sister to a nomadic warlord in exchange for an army.",
                "production_code": "101",
                "season_number": 1,
                "still_path": "/xIfvIM7YgkADTrqp23rm3CLaOVQ.jpg",
                "vote_average": 7.7,
                "vote_count": 179
            }
        ],
        "name": "Season 1",
        "overview": "Trouble is brewing in the Seven Kingdoms of Westeros. For the driven inhabitants of this visionary world, control of Westeros' Iron Throne holds the lure of great power. But in a land where the seasons can last a lifetime, winter is coming...and beyond the Great Wall that protects them, an ancient evil has returned. In Season One, the story centers on three primary areas: the Stark and the Lannister families, whose designs on controlling the throne threaten a tenuous peace; the dragon princess Daenerys, heir to the former dynasty, who waits just over the Narrow Sea with her malevolent brother Viserys; and the Great Wall--a massive barrier of ice where a forgotten danger is stirring.",
        "id": 3624,
        "poster_path": "/zwaj4egrhnXOBIit1tyb4Sbt3KP.jpg",
        "season_number": 1
    },
    "user_info": {
        "score": 0,
        "review": "string",
    },
    "user_watched_show": True
}
EPISODE_RETRIEVE_200_EXAMPLE = {
    "tmdb": {
        "air_date": "2011-04-17",
        "crew": [
            {
                "id": 44797,
                "credit_id": "5256c8a219c2956ff6046e77",
                "name": "Tim Van Patten",
                "department": "Directing",
                "job": "Director",
                "profile_path": "/6b7l9YbkDHDOzOKUFNqBVaPjcgm.jpg"
            },
            {
                "id": 1318704,
                "credit_id": "54eef2429251417974005cb6",
                "name": "Alik Sakharov",
                "department": "Camera",
                "job": "Director of Photography",
                "profile_path": "/50ZlHkh66aOPxQMjQ21LJDAkYlR.jpg"
            },
            {
                "id": 18077,
                "credit_id": "54eef2ab925141795f005d4f",
                "name": "Oral Norrie Ottey",
                "department": "Editing",
                "job": "Editor",
                "profile_path": None
            },
            {
                "id": 9813,
                "credit_id": "5256c8a019c2956ff6046e2b",
                "name": "David Benioff",
                "department": "Writing",
                "job": "Writer",
                "profile_path": "/8CuuNIKMzMUL1NKOPv9AqEwM7og.jpg"
            },
            {
                "id": 228068,
                "credit_id": "5256c8a219c2956ff6046e4b",
                "name": "D. B. Weiss",
                "department": "Writing",
                "job": "Writer",
                "profile_path": "/caUAtilEe06OwOjoQY3B7BgpARi.jpg"
            }
        ],
        "episode_number": 1,
        "guest_stars": [
            {
                "id": 117642,
                "name": "Jason Momoa",
                "credit_id": "5256c8a219c2956ff6046f40",
                "character": "Khal Drogo",
                "order": 0,
                "profile_path": "/PSK6GmsVwdhqz9cd1lwzC6a7EA.jpg"
            },
            {
                "id": 946696,
                "name": "Ian Whyte",
                "credit_id": "5750cd459251412b0f000224",
                "character": "White Walker",
                "order": 46,
                "profile_path": "/6mRY7hTtHfDTGuTLmZmODOu9buF.jpg"
            },
            {
                "id": 438859,
                "name": "Susan Brown",
                "credit_id": "57520bc19251414c470000de",
                "character": "Septa Mordane",
                "order": 52,
                "profile_path": "/5bYvoJDOw4okAzSxJ1avXweUyA9.jpg"
            },
            {
                "id": 1833,
                "name": "Jamie Sives",
                "credit_id": "5752136f9251414c510001a0",
                "character": "Jory Cassel",
                "order": 55,
                "profile_path": "/92BcXrr2W7gZri6xVlLhpLLaPsf.jpg"
            },
            {
                "id": 234907,
                "name": "Dar Salim",
                "credit_id": "5752158b9251414c470001c0",
                "character": "Qotho",
                "order": 56,
                "profile_path": "/3CrPTwZJ0hsWzX7oi7sKFfzDo82.jpg"
            },
            {
                "id": 11279,
                "name": "Roger Allam",
                "credit_id": "575216bdc3a36851fe0001d8",
                "character": "Illyrio Mopatis",
                "order": 57,
                "profile_path": "/gr59GfVZz9QV6jZyHKOsKCBxXPr.jpg"
            },
            {
                "id": 1600544,
                "name": "Aimee Richardson",
                "credit_id": "57521d4cc3a3685215000344",
                "character": "Myrcella Baratheon",
                "order": 60,
                "profile_path": "/r53KnAfLiR8NaK3Kp2Nu4q0KSoP.jpg"
            },
            {
                "id": 1600543,
                "name": "Callum Wharry",
                "credit_id": "57521fafc3a368521500041d",
                "character": "Tommen Baratheon",
                "order": 61,
                "profile_path": "/rVaMQfGwylZWWM2eRJ3qAEkS0tK.jpg"
            }
        ],
        "name": "Winter Is Coming",
        "overview": "Jon Arryn, the Hand of the King, is dead. King Robert Baratheon plans to ask his oldest friend, Eddard Stark, to take Jon's place. Across the sea, Viserys Targaryen plans to wed his sister to a nomadic warlord in exchange for an army.",
        "id": 63056,
        "production_code": "101",
        "season_number": 1,
        "still_path": "/wrGWeW4WKxnaeA8sxJb2T9O6ryo.jpg",
        "vote_average": 7.11904761904762,
        "vote_count": 21
    },
    "user_info": {
        "score": 0,
        "review": "string",
    },
    "user_watched_show": True
}
