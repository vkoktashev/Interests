from django.db.models import ExpressionWrapper, F, FloatField, Value


IMDB_MIN_VOTES = 2


def get_imdb_weighted_score_annotation(global_average_score, min_votes=IMDB_MIN_VOTES):
    # IMDb-style weighted rating: low-vote titles are pulled toward the category average.
    baseline_score = float(global_average_score or 0)

    return ExpressionWrapper(
        (
            (F('ratings_count') * F('average_user_score')) +
            Value(min_votes * baseline_score)
        ) / (F('ratings_count') + Value(min_votes)),
        output_field=FloatField(),
    )
