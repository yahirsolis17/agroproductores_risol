from django import template
import locale
from num2words import num2words

register = template.Library()

try:
    locale.setlocale(locale.LC_ALL, 'es_MX.UTF-8')
except locale.Error:
    pass

@register.filter
def custom_floatformat(value):
    try:
        float_value = float(value)
        if float_value.is_integer():
            return str(int(float_value))  # Sin decimales si es entero
        else:
            return str(float_value)  # Con decimales si no es entero
    except (ValueError, TypeError):
        return value

@register.filter
def custom_intcomma(value):
    try:
        return locale.format_string("%d", value, grouping=True)  # Sin decimales
    except (ValueError, TypeError):
        return value

@register.filter
def num2words_es(value):
    from num2words import num2words
    try:
        return f"{num2words(value, lang='es')} pesos"
    except (ValueError, TypeError):
        return value

@register.filter
def num2words_es_sin_pesos(value):
    try:
        value = int(value)
    except (ValueError, TypeError):
        return value
    return num2words(value, lang='es').replace(' pesos', '')