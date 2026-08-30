from django.db import transaction

from people.models import Person, PersonLog, UserPerson


class PersonNotFoundError(Exception):
    pass


class InvalidTrackingValueError(Exception):
    pass


@transaction.atomic
def set_person_tracking(user, person_id, is_tracked):
    person = Person.objects.filter(id=person_id).first()
    if person is None:
        raise PersonNotFoundError
    if not isinstance(is_tracked, bool):
        raise InvalidTrackingValueError

    if is_tracked:
        _, state_changed = UserPerson.objects.get_or_create(user=user, person=person)
    else:
        deleted_count, _ = UserPerson.objects.filter(user=user, person=person).delete()
        state_changed = deleted_count > 0

    if state_changed:
        PersonLog.objects.create(
            user=user,
            person=person,
            action_type=PersonLog.ACTION_TYPE_TRACK,
            action_result=is_tracked,
        )
    return is_tracked
