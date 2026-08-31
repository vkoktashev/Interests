from django.core.exceptions import FieldDoesNotExist


def capture_tracking_state(instance, log_model):
    if instance is None:
        return None

    return {
        action_type: getattr(instance, action_type)
        for action_type, _ in log_model.ACTION_TYPE_CHOICES
        if _is_model_field(instance, action_type)
    }


def create_tracking_logs(instance, previous_state, log_model, target_field):
    for action_type, _ in log_model.ACTION_TYPE_CHOICES:
        try:
            field = instance._meta.get_field(action_type)
        except FieldDoesNotExist:
            continue

        current_value = getattr(instance, action_type)
        if current_value is None:
            continue
        if previous_state is None:
            if current_value == field.get_default():
                continue
        elif current_value == previous_state.get(action_type):
            continue

        action_result = current_value
        if field.choices:
            action_result = getattr(instance, f'get_{action_type}_display')()

        log_model.objects.create(
            user=instance.user,
            action_type=action_type,
            action_result=action_result,
            **{target_field: getattr(instance, target_field)},
        )


def _is_model_field(instance, field_name):
    try:
        instance._meta.get_field(field_name)
    except FieldDoesNotExist:
        return False
    return True
