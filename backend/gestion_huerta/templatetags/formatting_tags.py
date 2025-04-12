from django import template
import inflect

register = template.Library()
p = inflect.engine()

@register.filter
def intword(value):
    try:
        value = float(value)
        return p.number_to_words(int(value))
    except (ValueError, TypeError):
        return value

import inflect
from django import template

register = template.Library()
p = inflect.engine()

@register.filter
def number_to_words(value):
    return p.number_to_words(value)