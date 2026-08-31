from django.db.models.signals import post_delete
from django.dispatch import receiver

from games.models import Game
from movies.models import Movie
from shows.models import Show
from utils.constants import TYPE_GAME, TYPE_MOVIE, TYPE_SHOW

from content_collections.models import CollectionItemOrder


def _delete_item_orders(instance, media_type):
    CollectionItemOrder.objects.filter(
        media_type=media_type,
        object_id=instance.pk,
    ).delete()


@receiver(post_delete, sender=Game)
def delete_game_item_orders(sender, instance, **kwargs):
    _delete_item_orders(instance, TYPE_GAME)


@receiver(post_delete, sender=Movie)
def delete_movie_item_orders(sender, instance, **kwargs):
    _delete_item_orders(instance, TYPE_MOVIE)


@receiver(post_delete, sender=Show)
def delete_show_item_orders(sender, instance, **kwargs):
    _delete_item_orders(instance, TYPE_SHOW)
